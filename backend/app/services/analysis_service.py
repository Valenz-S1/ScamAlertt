"""
Motor de análisis de estafas de ScamAlert (capa de reglas).

Diseñado para funcionar con texto de mensajes (WhatsApp/SMS), correos y texto
extraído por OCR de capturas de pantalla (que suele venir con errores).

Contrato compatible con la versión anterior:
    analyze_message(text, db) -> dict con
    risk_level, risk_score, is_scam, scam_type, explanation, detected_rules,
    similar_reports_count, scam_types, recommendation

Campos nuevos (alineados con el prompt de análisis):
    classification  LEGITIMATE | SPAM | SUSPICIOUS | PHISHING | SCAM
    risk_score_100  entero 0-100
    confidence      entero 0-100
    reasons         razones observables
    signals         señales detectadas (vocabulario fijo, ver _SIGNAL_NAMES)
    link_analysis   {"present", "suspicious", "reason"}

Para obtener exactamente el JSON del prompt usa `to_prompt_json(result)`.

Principios que sigue el motor:
  * Un enlace NO es fraude por sí solo. Se evalúa dominio, contexto y solicitud.
  * HTTPS no prueba legitimidad; su ausencia solo pesa muy poco.
  * La urgencia y las amenazas pesan poco solas y mucho combinadas con
    enlaces dudosos, suplantación o solicitudes de dinero/datos.
  * Los errores de redacción son señal secundaria: nunca deciden solos.
  * Si el contexto se desconoce (¿el usuario pidió el enlace?), es "desconocido".
  * Ante la duda, SUSPICIOUS.
"""
from __future__ import annotations

import json
import logging
import re
import unicodedata
from difflib import SequenceMatcher
from functools import lru_cache
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models.report import Report

logger = logging.getLogger(__name__)

MAX_TEXT_LEN = 20_000          # límite de texto a analizar
MAX_REPORTS_TO_COMPARE = 2_000  # reportes recientes contra los que se compara

# Umbrales de clasificación (score 0-1)
T_SUSPICIOUS = 0.25   # por debajo: LEGITIMATE (o SPAM si es solo publicidad)
T_HIGH = 0.60         # desde aquí: PHISHING / SCAM (si el objetivo es claro)


# ════════════════════════════════════════════════════════════════════
#  1. NORMALIZACIÓN (clave para OCR y para evasión básica)
# ════════════════════════════════════════════════════════════════════

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff\u00ad"), None)

# Letras cirílicas/griegas que se ven como latinas (ataques homoglifos)
_HOMOGLYPHS = str.maketrans({
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
    "і": "i", "ѕ": "s", "ԁ": "d", "ɡ": "g", "ı": "i",
    "ο": "o", "α": "a", "ν": "v", "ρ": "p", "ι": "i", "ε": "e",
})

_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
                       "7": "t", "@": "a", "$": "s"})

_OCR_DOT_TLDS = "com|mx|net|org|ly|xyz|top|click"


def _strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s)
                   if unicodedata.category(c) != "Mn")


def _prepare(text: str) -> str:
    """Limpieza ligera que conserva mayúsculas y estructura (para URLs)."""
    t = text.translate(_ZERO_WIDTH)
    t = unicodedata.normalize("NFKC", t)
    # URLs "defanged": hxxp, [.], (.)
    t = re.sub(r"hxxp", "http", t, flags=re.I)
    t = re.sub(r"\[\s*\.\s*\]|\(\s*\.\s*\)|\{\s*\.\s*\}", ".", t)
    # Errores típicos de OCR en URLs: "https: //", "bit. ly", "banco .com"
    t = re.sub(r"(https?)\s*:\s*/\s*/\s*", r"\1://", t, flags=re.I)
    t = re.sub(r"(?<=[A-Za-z0-9])\s?\.\s?(?=(?:" + _OCR_DOT_TLDS + r")\b)", ".", t, flags=re.I)
    return t


def _join_spaced_letters(t: str) -> str:
    """'g a n a s t e' / 'g.a.n.a.s.t.e' -> 'ganaste'."""
    return re.sub(
        r"\b(?:[a-z][ .\-_*]){3,}[a-z]\b",
        lambda m: re.sub(r"[ .\-_*]", "", m.group(0)),
        t,
    )


def _deleet(t: str) -> str:
    """
    'g4n45t3' -> 'ganaste'.
    Solo se corrige si hay un dígito/símbolo ENTRE letras (g4n...), así 'promo50'
    o '24hrs' no se distorsionan.
    """
    def fix(m: re.Match) -> str:
        w = m.group(0)
        letters = sum(c.isalpha() for c in w)
        if len(w) >= 4 and letters >= 2 and re.search(r"[a-z][0-9@$][a-z]", w):
            return w.translate(_LEET)
        return w
    return re.sub(r"[a-z0-9@$]+", fix, t)


def _clean(prepared: str) -> str:
    """Versión para buscar palabras clave: minúsculas, sin acentos, sin ruido."""
    t = prepared.lower().translate(_HOMOGLYPHS)
    t = _strip_accents(t)
    t = re.sub(r"-\s*\n\s*", "", t)          # palabras cortadas por salto de línea
    t = _join_spaced_letters(t)
    t = _deleet(t)
    return re.sub(r"\s+", " ", t).strip()


# ════════════════════════════════════════════════════════════════════
#  2. UTILIDADES DE COINCIDENCIA (con límites de palabra)
#     Antes "pin" coincidía con "pintura" y "t.co" con "contact.com".
# ════════════════════════════════════════════════════════════════════

def _pat(phrase: str) -> str:
    """Frase -> regex. Un '*' final permite sufijos: 'premio*' = premio, premios..."""
    wild = phrase.endswith("*")
    words = phrase.rstrip("*").split()
    body = r"\s+".join(re.escape(w) for w in words)
    return body + (r"\w*" if wild else "")


def _compile(phrases: list[str]) -> list[tuple[str, re.Pattern]]:
    return [(p, re.compile(r"(?<![a-z0-9])" + _pat(p) + r"(?![a-z0-9])")) for p in phrases]


def _alt_re(phrases: list[str]) -> re.Pattern:
    alt = "|".join(_pat(p) for p in phrases)
    return re.compile(r"(?<![a-z0-9])(?:" + alt + r")(?![a-z0-9])")


def _hits(patterns: list[tuple[str, re.Pattern]], clean: str, compact: str | None = None) -> list[str]:
    """Frases encontradas. Con `compact` también tolera OCR que pierde espacios."""
    found = []
    for phrase, rx in patterns:
        if rx.search(clean):
            found.append(phrase.rstrip("*"))
        elif compact and " " in phrase:
            flat = "".join(phrase.rstrip("*").split())
            if len(flat) >= 10 and flat in compact:
                found.append(phrase.rstrip("*"))
    return found


def _noisy_or(weights: list[float]) -> float:
    """Combina señales independientes: 1 - Π(1 - w). Nunca pasa de 1 y no se satura."""
    p = 1.0
    for w in weights:
        p *= (1.0 - w)
    return 1.0 - p


# ════════════════════════════════════════════════════════════════════
#  3. MARCAS / INSTITUCIONES Y DOMINIOS OFICIALES
# ════════════════════════════════════════════════════════════════════

# clave (token del dominio) -> (nombres en texto, dominios oficiales)
BRANDS: dict[str, tuple[list[str], list[str]]] = {
    "bbva": (["bbva"], ["bbva.mx", "bbva.com"]),
    "banamex": (["banamex", "citibanamex"], ["banamex.com", "citibanamex.com"]),
    "citibanamex": (["citibanamex"], ["banamex.com", "citibanamex.com"]),
    "santander": (["santander"], ["santander.com.mx", "santander.com"]),
    "banorte": (["banorte"], ["banorte.com"]),
    "hsbc": (["hsbc"], ["hsbc.com.mx", "hsbc.com"]),
    "scotiabank": (["scotiabank"], ["scotiabank.com.mx"]),
    "inbursa": (["inbursa"], ["inbursa.com"]),
    "bancoppel": (["bancoppel"], ["bancoppel.com"]),
    "bancoazteca": (["banco azteca", "bancoazteca"], ["bancoazteca.com.mx"]),
    "nubank": (["nubank", "nu mexico"], ["nu.com.mx", "nubank.com.mx"]),
    "mastercard": (["mastercard"], ["mastercard.com", "mastercard.com.mx"]),
    "mercadolibre": (["mercado libre", "mercadolibre"], ["mercadolibre.com.mx", "mercadolibre.com"]),
    "mercadopago": (["mercado pago", "mercadopago"], ["mercadopago.com.mx", "mercadopago.com"]),
    "paypal": (["paypal"], ["paypal.com"]),
    "amazon": (["amazon"], ["amazon.com.mx", "amazon.com"]),
    "netflix": (["netflix"], ["netflix.com"]),
    "spotify": (["spotify"], ["spotify.com"]),
    "microsoft": (["microsoft"], ["microsoft.com", "live.com", "office.com", "outlook.com"]),
    "apple": (["apple", "icloud"], ["apple.com", "icloud.com"]),
    "google": (["google"], ["google.com", "gmail.com", "goo.gl"]),
    "facebook": (["facebook"], ["facebook.com", "fb.com", "meta.com"]),
    "instagram": (["instagram"], ["instagram.com"]),
    "tiktok": (["tiktok"], ["tiktok.com"]),
    "whatsapp": (["whatsapp"], ["whatsapp.com", "wa.me"]),
    "playstation": (["playstation"], ["playstation.com"]),
    "telcel": (["telcel"], ["telcel.com"]),
    "movistar": (["movistar"], ["movistar.com.mx"]),
    "totalplay": (["totalplay"], ["totalplay.com.mx"]),
    "liverpool": (["liverpool"], ["liverpool.com.mx"]),
    "walmart": (["walmart"], ["walmart.com.mx", "walmart.com"]),
    "dhl": (["dhl"], ["dhl.com"]),
    "fedex": (["fedex"], ["fedex.com"]),
    "estafeta": (["estafeta"], ["estafeta.com"]),
    "paquetexpress": (["paquetexpress"], ["paquetexpress.com.mx"]),
    "correosdemexico": (["correos de mexico"], ["correosdemexico.gob.mx"]),
    "sat": (["sat"], ["sat.gob.mx"]),
    "imss": (["imss"], ["imss.gob.mx"]),
    "infonavit": (["infonavit"], ["infonavit.org.mx"]),
    "cfe": (["cfe"], ["cfe.mx"]),
    "profeco": (["profeco"], ["profeco.gob.mx"]),
    "condusef": (["condusef"], ["condusef.gob.mx"]),
    "banxico": (["banxico"], ["banxico.org.mx"]),
}

# Instituciones financieras y de gobierno (suelen escribir desde números cortos
# o dominios oficiales, no desde un celular personal ni correo gratuito)
_INSTITUTION_BRANDS = {
    "bbva", "banamex", "citibanamex", "santander", "banorte", "hsbc", "scotiabank",
    "inbursa", "bancoppel", "bancoazteca", "nubank", "mastercard", "sat", "imss",
    "infonavit", "cfe", "profeco", "condusef", "banxico",
}

_OFFICIAL_DOMAINS = {d for _, doms in BRANDS.values() for d in doms}
_BRAND_NAME_RES = {b: _alt_re(names) for b, (names, _) in BRANDS.items()}
# Palabras de marca de una sola palabra (para detectar nombres mal escritos en el texto)
_BRAND_WORDS = sorted({n for names, _ in BRANDS.values() for n in names
                       if " " not in n and len(n) >= 5})

_FREEMAIL = {"gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.mx",
             "live.com", "icloud.com", "proton.me", "protonmail.com", "aol.com"}

_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "rebrand.ly", "shorte.st", "adf.ly", "cutt.ly", "shorturl.at", "tiny.cc",
    "rb.gy", "t.ly", "v.gd", "lnkd.in", "bl.ink", "s.id", "clck.ru", "qrco.de",
    "han.gl", "x.co", "1url.com", "acortar.link", "tr.ee", "gg.gg", "urlz.fr",
}

_MESSAGING = {"wa.me", "wa.link", "chat.whatsapp.com", "api.whatsapp.com",
              "t.me", "telegram.me", "telegram.dog"}

_SUSPICIOUS_TLDS = {
    "xyz", "top", "click", "icu", "live", "site", "online", "shop", "vip", "cc",
    "cyou", "buzz", "rest", "fit", "gq", "tk", "ml", "ga", "cf", "work",
    "support", "zip", "mov", "monster", "cam", "loan", "win", "bid", "link",
    "fun", "store", "sbs", "cfd", "ru", "cn",
}

_HOST_KEYWORDS = ["secure", "seguro", "verifica", "login", "signin", "soporte",
                  "support", "cliente", "servicio", "promo", "premio", "update",
                  "actualiza", "cuenta", "account", "valida", "desbloque",
                  "banca", "pagos"]

_SECOND_LEVEL = {"com.mx", "org.mx", "gob.mx", "net.mx", "edu.mx", "com.ar",
                 "com.br", "com.co", "co.uk", "com.pe", "com.ve", "com.ec",
                 "com.cl", "co.cr"}

_TLDS = ["com", "net", "org", "mx", "info", "biz", "xyz", "top", "click", "icu",
         "live", "site", "online", "shop", "vip", "cc", "co", "me", "ly", "gl",
         "to", "is", "gd", "tk", "ml", "ga", "cf", "gq", "link", "fun", "store",
         "cyou", "buzz", "work", "support", "app", "io", "us", "ru", "cn", "ee",
         "gg", "id", "at", "in", "sbs", "cfd"]
_TLD_ALT = "|".join(sorted(_TLDS, key=len, reverse=True))

# TLDs que coinciden con palabras/typos de texto normal ("hola.me", "esto.is").
# Un "dominio" sin esquema con estos TLDs solo cuenta si trae ruta (/...) o es acortador.
_AMBIGUOUS_TLDS = {"me", "is", "in", "at", "to", "id", "co", "ee", "gg", "us", "cc", "ly", "gl"}

_URL_RE = re.compile(r"(?:https?://|www\.)[^\s<>\"'{}|\\^`\[\]()]+", re.I)
_EMAIL_RE = re.compile(r"[a-z0-9._%+\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)+", re.I)
_BARE_DOMAIN_RE = re.compile(
    r"(?<![@\w.\-/])(?:[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?\.)+(?:" + _TLD_ALT +
    r")(?![a-z0-9\-])(?:[/?#][^\s<>\"'{}|\\^`\[\]()]*)?", re.I)
_IP_RE = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$|^0x[0-9a-f]+$|^\d{8,10}$", re.I)
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?52[\s.-]?1?[\s.-]?)?(?:\d[\s.-]?){9}\d(?!\d)")


def _registered_domain(host: str) -> str:
    parts = host.split(".")
    if len(parts) <= 2:
        return host
    if ".".join(parts[-2:]) in _SECOND_LEVEL:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def _host_in(host: str, domains) -> bool:
    return any(host == d or host.endswith("." + d) for d in domains)


def _is_trusted(host: str) -> bool:
    return host == "gob.mx" or host.endswith(".gob.mx") or _host_in(host, _OFFICIAL_DOMAINS)


# ── Análisis de enlaces ──
# Nota: HTTPS no se usa NUNCA como señal de legitimidad. Solo la ausencia de
# HTTPS suma un peso mínimo (un sitio fraudulento también puede usar HTTPS).

_LINK_FLAG_WEIGHTS = {
    "shortened_link": 0.25, "ip_address": 0.40, "punycode": 0.40, "at_symbol": 0.35,
    "brand_impersonation": 0.55, "typosquatting": 0.50, "suspicious_tld": 0.20,
    "many_subdomains": 0.15, "long_hyphenated": 0.15, "insecure_http": 0.05,
    "suspicious_keywords": 0.18, "messaging_link": 0.10, "malformed_url": 0.10,
    "freemail_impersonation": 0.35, "brand_unverified_domain": 0.12,
}

_LINK_FLAG_TEXT = {
    "shortened_link": "Usa enlaces acortados que ocultan el destino real ({hosts}).",
    "ip_address": "Un enlace apunta a una dirección IP en lugar de un sitio con nombre ({hosts}).",
    "punycode": "Un enlace usa caracteres disfrazados para imitar otro sitio ({hosts}).",
    "at_symbol": "Un enlace contiene '@', truco común para ocultar el sitio real ({hosts}).",
    "brand_impersonation": "El enlace imita el nombre de una institución conocida pero no es su sitio oficial ({hosts}).",
    "typosquatting": "El enlace parece un sitio conocido con letras cambiadas ({hosts}).",
    "suspicious_tld": "El enlace usa una terminación de dominio muy usada en fraudes ({hosts}).",
    "many_subdomains": "El enlace tiene demasiados subdominios, típico de sitios falsos ({hosts}).",
    "long_hyphenated": "El enlace tiene un nombre largo con muchos guiones ({hosts}).",
    "insecure_http": "El enlace no usa conexión cifrada (http) ({hosts}).",
    "suspicious_keywords": "El enlace incluye palabras como 'seguro', 'verifica' o 'cuenta' para parecer legítimo ({hosts}).",
    "messaging_link": "Te invita a continuar la conversación por WhatsApp/Telegram ({hosts}).",
    "malformed_url": "Contiene un enlace mal formado o extraño.",
    "freemail_impersonation": "Dice ser una institución pero escribe desde un correo gratuito ({hosts}).",
    "brand_unverified_domain": "El dominio lleva el nombre de una marca pero no está entre sus dominios oficiales conocidos ({hosts}).",
}

# Flags que por sí solos NO hacen sospechoso un enlace (contexto, no engaño)
_MILD_LINK_FLAGS = {"insecure_http", "messaging_link"}
# Flags que indican suplantación del dominio
_IMPERSONATION_LINK_FLAGS = {"brand_impersonation", "typosquatting", "freemail_impersonation"}


def _brand_flags(host: str, reg: str) -> list[str]:
    tokens = [t for t in re.split(r"[.\-_]", host) if t]
    main = reg.split(".")[0]
    tld = host.rsplit(".", 1)[-1]

    # Mismo nombre que la marca en otro dominio (p. ej. amazon.es): no está en la
    # lista oficial, pero tampoco hay evidencia de suplantación -> señal débil.
    if main in BRANDS and tld not in _SUSPICIOUS_TLDS:
        return ["brand_unverified_domain"]

    for brand in BRANDS:
        if brand in tokens or (len(brand) >= 4 and any(t.startswith(brand) and t != brand for t in tokens)):
            return ["brand_impersonation"]
    for part in [main] + main.split("-"):
        p = part.translate(_LEET)
        for brand in BRANDS:
            if (len(brand) >= 4 and p != brand and abs(len(p) - len(brand)) <= 2
                    and SequenceMatcher(None, p, brand).ratio() >= 0.83):
                return ["typosquatting"]
    return []


def _analyze_link(raw: str) -> dict:
    raw = raw.strip().rstrip(".,;:!?)»\"'")
    candidate = raw if raw.lower().startswith(("http://", "https://")) else "http://" + raw
    try:
        parsed = urlparse(candidate)
        host = (parsed.hostname or "").lower().rstrip(".")
    except ValueError:
        return {"url": raw, "host": "", "flags": ["malformed_url"]}
    if not host:
        return {"url": raw, "host": "", "flags": ["malformed_url"]}

    flags: list[str] = []
    reg = _registered_domain(host)
    trusted = _is_trusted(host)

    if host in _SHORTENERS or reg in _SHORTENERS:
        flags.append("shortened_link")
    if host in _MESSAGING or reg in _MESSAGING:
        flags.append("messaging_link")
    if _IP_RE.match(host):
        flags.append("ip_address")
    if "xn--" in host:
        flags.append("punycode")
    if "@" in parsed.netloc:
        flags.append("at_symbol")

    if not trusted:
        if host.rsplit(".", 1)[-1] in _SUSPICIOUS_TLDS:
            flags.append("suspicious_tld")
        if host.count(".") >= 4:
            flags.append("many_subdomains")
        if len(host) > 35 and host.count("-") >= 2:
            flags.append("long_hyphenated")
        if raw.lower().startswith("http://"):
            flags.append("insecure_http")
        if any(k in host for k in _HOST_KEYWORDS):
            flags.append("suspicious_keywords")
        if "shortened_link" not in flags and not _IP_RE.match(host):
            flags += _brand_flags(host, reg)

    return {"url": raw, "host": host, "flags": flags}


def _analyze_links(prepared: str) -> list[dict]:
    text = prepared.lower()
    raws: list[str] = [m.group(0) for m in _URL_RE.finditer(text)]
    remaining = _URL_RE.sub(" ", text)
    emails = _EMAIL_RE.findall(remaining)
    remaining = _EMAIL_RE.sub(" ", remaining)
    for m in _BARE_DOMAIN_RE.finditer(remaining):
        raw = m.group(0)
        host_part = re.split(r"[/?#]", raw, 1)[0]
        tld = host_part.rsplit(".", 1)[-1]
        # "hola.me", "esto.is": typos de puntuación, no enlaces (salvo que tengan ruta o sean acortadores)
        if tld in _AMBIGUOUS_TLDS and raw == host_part and _registered_domain(host_part) not in _SHORTENERS:
            continue
        raws.append(raw)

    links, seen = [], set()
    for raw in raws:
        info = _analyze_link(raw)
        key = info["url"]
        if key not in seen:
            seen.add(key)
            links.append(info)

    for email in emails:
        local, _, domain = email.partition("@")
        if domain in _FREEMAIL:
            toks = [t for t in re.split(r"[._\-]", local) if t]
            if any(b in toks or (len(b) >= 4 and local.startswith(b)) for b in BRANDS):
                links.append({"url": email, "host": domain, "flags": ["freemail_impersonation"]})
        else:
            info = _analyze_link(domain)
            if info["url"] not in seen:
                seen.add(info["url"])
                links.append(info)
    return links


# ════════════════════════════════════════════════════════════════════
#  4. PATRONES DE TEXTO (todo normalizado: minúsculas y sin acentos)
# ════════════════════════════════════════════════════════════════════

URGENT_WORDS = [
    "urgente", "inmediatamente", "inmediato", "ahora mismo", "ya mismo", "cuanto antes",
    "rapido", "no esperes", "actua ya", "actua ahora", "sin demora", "limite de tiempo",
    "tiempo limitado", "expira hoy", "expira*", "ultima oportunidad", "ultimo aviso",
    "solo hoy", "atencion inmediata", "accion requerida", "evita recargos",
    "evita la suspension", "ultimas horas", "proximas 24 horas", "24 horas", "48 horas",
    "hoy mismo", "de lo contrario", "antes de que", "antes de las", "last chance",
    "act now", "urgent", "immediately",
]

THREAT_WORDS = [
    "sera bloqueada", "sera suspendida", "sera cancelada", "sera desactivada", "suspension",
    "bloqueo", "cancelaremos", "acciones legales", "demanda", "orden de aprehension",
    "embargo", "arresto", "carcel", "denuncia", "multa", "perderas", "pierdes acceso",
    "cierre de tu cuenta", "dar de baja", "sera devuelto", "sera eliminado",
    "account will be", "suspended", "legal action",
]

PERSONAL_INFO_WORDS = [
    "contrasena", "password", "clave de acceso", "nip", "pin", "curp", "rfc", "ine",
    "credencial", "numero de seguro", "nss", "tarjeta de credito", "tarjeta de debito",
    "numero de tarjeta", "cvv", "cvc", "fecha de vencimiento", "clabe", "datos bancarios",
    "cuenta bancaria", "informacion personal", "verifica tu identidad", "confirma tus datos",
    "numero de cuenta", "foto de tu ine", "selfie con tu identificacion",
    "respuesta secreta", "ssn", "social security",
]

VERIFICATION_CODE_RE = re.compile(
    r"(?<![a-z0-9])(?:codigo|otp|token|clave)\s+(?:de\s+)?(?:verificacion|seguridad|sms|acceso|"
    r"\d+\s+digitos|que\s+(?:te|le)\s+(?:llego|enviaron|mandaron)|de\s+un\s+solo\s+uso)"
    r"|(?:verification|security)\s+code|reenvia(?:me)?\s+el\s+codigo|pasame\s+el\s+codigo|dime\s+el\s+codigo"
)

# "no compartas / no lo des": advertencia legítima, no una solicitud
_NO_SHARE_RE = re.compile(
    r"\bno\s+(?:lo\s+|la\s+|los\s+)?(?:compartas|compartir|des|entregues|reveles|digas|proporciones|envies)\b"
    r"|\bnunca\s+(?:te\s+)?(?:pediremos|solicitaremos|compartas|pedimos)\b")
_NEGATION_TAIL_RE = re.compile(r"\b(?:no|nunca|jamas)\s+(?:\w+\s+){0,2}$")

REQUEST_VERBS = _alt_re([
    "envia", "enviame", "manda", "mandame", "proporciona", "proporcione", "comparte",
    "compartenos", "ingresa", "confirma", "confirmar", "verifica", "verificar",
    "actualiza", "actualizar", "dime", "pasame", "necesito", "requerimos", "requiero",
    "escribe", "captura", "responde", "facilita", "introduce", "teclea", "digita",
    "send", "provide", "confirm", "enter", "reply", "reenvia*", "pasas", "mandas",
    "envias", "compartes", "dame", "me lo das", "me lo pasas", "me lo mandas",
    "me lo envias", "me lo compartes", "me puedes pasar", "podrias pasar",
])

PAYMENT_WORDS = [
    "deposito", "depositar", "depositame", "transferencia", "transfiere", "transferir",
    "transfierme", "efectivo", "paypal", "mercado pago", "cuenta clabe", "numero de cuenta",
    "pagar un cargo", "cuota de", "comision", "paga inmediatamente", "realiza tu pago",
    "liquida tu adeudo",
]
PAYMENT_HIGH_RISK = [
    "oxxo", "spin by oxxo", "tarjeta de regalo", "tarjetas de regalo", "gift card",
    "itunes", "google play", "steam", "bitcoin", "criptomoneda*", "usdt", "western union",
    "moneygram", "anticipo", "pago adelantado", "cripto",
]

SECRECY_WORDS = [
    "no le digas a nadie", "no le cuentes", "no avises", "no cuelgues", "no le digas a",
    "mantenlo en secreto", "confidencial", "no llames a", "no contactes", "no hables con",
    "es un secreto", "don't tell", "keep this secret", "no comentes",
]

REMOTE_ACCESS_WORDS = [
    "anydesk", "teamviewer", "quicksupport", "rustdesk", "acceso remoto",
    "instala la app", "instala la aplicacion", "descarga la aplicacion", "descargar el apk",
    "archivo apk", "apk", "comparte tu pantalla",
]

TOO_GOOD_WORDS = [
    "ganancias garantizadas", "sin riesgo", "100% seguro", "duplica*", "triplica*",
    "dinero facil", "ingresos pasivos", "sin experiencia", "gratis", "cero costo",
    "oferta exclusiva", "70% de descuento", "90% de descuento", "regalo",
]

ATTACHMENT_WORDS = [
    "habilita macros", "habilitar contenido", "factura adjunta", "archivo adjunto",
    "documento adjunto", "descarga el archivo", "descarga el documento", "abre el adjunto",
    "comprobante adjunto", "pdf adjunto",
]

IMPERSONAL_GREETING = [
    "estimado cliente", "estimado usuario", "apreciable cliente", "apreciable usuario",
    "querido cliente", "estimado(a)", "dear customer", "dear user", "dear client",
]

CONTACT_BAIT = [
    "escribeme al", "escribenos al", "contactanos por whatsapp", "contacta a", "comunicate al",
    "llama al", "manda mensaje al", "agrega este numero", "unete al grupo",
    "grupo de telegram", "grupo de whatsapp",
]

# Publicidad / promociones (SPAM). No implican intento de robo por sí solas.
SPAM_WORDS = [
    "promocion*", "oferta*", "descuento*", "rebaja*", "cupon*", "suscribete",
    "responde stop", "envio gratis", "aprovecha", "compra ahora", "2x1", "3x2",
    "black friday", "hot sale", "cyber monday", "liquidacion", "ultimos dias",
    "no te lo pierdas", "visita nuestra tienda", "envia baja", "cancelar suscripcion",
    "precios especiales", "meses sin intereses",
]

# Beneficio económico inesperado (premios, acreditaciones, puntos, bonos, vacantes con pago)
BENEFIT_RE = re.compile(
    r"(?<![a-z0-9])(?:"
    r"se\s+acredit\w+|retira\s+tu\s+premio|reclama\s+tu\s+(?:premio|bono|recompensa)"
    r"|tus\s+puntos\s+(?:estan\s+por\s+(?:vencer|expirar)|equivalen|vencen|expiran)"
    r"|puntos\s+por\s+vencer|gana\s+\$?\s?\d[\d,.]*\s*(?:pesos\s+)?(?:diarios|al\s+dia|por\s+dia|semanales)"
    r"|ganancias\s+diarias|bono\s+disponible|deposito\s+pendiente|recompensa\w*|premio\w*"
    r"|ganaste|has\s+ganado|vacante\s+de\s+medio\s+tiempo"
    r")(?![a-z0-9])")

# Multas, adeudos y amenazas de autoridad
FINE_WORDS = ["multa*", "adeudo*", "infraccion*", "recargo*", "fotomulta*", "placas", "tenencia"]
_C_FINE = _compile(FINE_WORDS)

# Afirmaciones bancarias / de pago (un banco legítimo también las envía: pesan
# poco salvo que vengan con enlace no oficial o pidan datos)
_BANK_CLAIM_RE = _alt_re([
    "tarjeta bloqueada", "tarjeta fue bloqueada", "bloqueamos tu tarjeta", "cuenta suspendida",
    "cuenta sera suspendida", "cuenta bloqueada", "cuenta sera bloqueada", "pago pendiente",
    "actualiza tus datos bancarios", "actualizar datos bancarios", "cargo no reconocido",
    "metodo de pago", "actualiza tu pago", "pago rechazado", "movimiento sospechoso",
    "acceso no autorizado",
])

# Mensajes informativos / advertencias legítimas (bajan el riesgo si no hay otras alarmas)
SAFE_CONTEXT = [
    "nunca te pediremos", "nunca solicitaremos", "no solicitamos", "no compartas este codigo",
    "no compartas tu", "no lo compartas", "evita fraudes", "ten cuidado con",
    "cuidado con estafas", "mensaje informativo", "recomendaciones de seguridad",
    "no respondas a mensajes", "nunca compartas",
]

# Tipos de estafa: nombre -> (palabras fuertes [2 pts], palabras débiles [1 pt]).
# Un tipo se detecta con >= 3 puntos.
SCAM_TYPES: dict[str, tuple[list[str], list[str]]] = {
    "paquetería": (
        ["entrega fallida", "no pudimos entregar", "intento de entrega", "guia de rastreo",
         "numero de rastreo", "numero de guia", "reprogramar*", "direccion incompleta",
         "paquete retenido", "paquete detenido", "paquete en aduana", "dhl", "fedex",
         "estafeta", "paquetexpress", "redpack", "correos de mexico", "sepomex", "aduana",
         "cargo por envio", "costo de envio", "tu paquete", "tu envio", "tu pedido"],
        ["paquete*", "envio", "entrega", "rastreo", "ups", "mercado libre", "amazon",
         "direccion", "devuelto", "almacen"],
    ),
    "bancaria": (
        ["cuenta bloqueada", "cuenta suspendida", "cuenta limitada", "cuenta comprometida",
         "movimiento sospechoso", "cargo no reconocido", "actividad inusual",
         "actividad sospechosa", "acceso no autorizado", "verifica tu cuenta",
         "tarjeta bloqueada", "banca en linea", "banca movil", "bbva", "banamex",
         "citibanamex", "santander", "banorte", "hsbc", "scotiabank", "inbursa",
         "bancoppel", "banco azteca", "nubank", "mercado pago", "spei", "clabe"],
        ["banco", "transferencia", "saldo", "tarjeta", "cuenta", "cargo", "seguridad",
         "token", "nip"],
    ),
    "premio": (
        ["ganaste", "has ganado", "felicidades", "felicitaciones", "sorteo", "loteria",
         "premio*", "reclama tu premio", "fuiste seleccionad*", "fuiste elegid*", "herencia",
         "dinero gratis", "tarjeta de regalo", "gift card"],
        ["millon", "millones", "gratis", "regalo", "cupon", "seleccionad*", "iphone",
         "reclamar", "ganador"],
    ),
    "phishing": (
        ["verifica tu identidad", "confirma tus datos", "actualiza tus datos",
         "actualizar datos", "inicia sesion", "iniciar sesion", "restablece tu contrasena",
         "clic aqui", "da clic", "haz clic", "click here", "ingresa aqui", "entra aqui",
         "verify your account", "sign in", "escanea el qr", "escanea el codigo qr",
         "codigo qr"],
        ["link", "enlace", "verifica", "confirmar", "actualizar", "acceso", "validar", "login"],
    ),
    "familiar": (
        ["numero nuevo", "nuevo numero", "cambie de numero", "cambie de celular",
         "tuve un accidente", "estoy detenido", "secuestr*", "tenemos a tu",
         "me robaron el celular", "hola mama", "hola papa", "hola abuela", "hola abuelo",
         "hola tia", "hola tio", "guarda mi nuevo numero"],
        ["hijo", "hija", "mama", "papa", "abuelo", "abuela", "familiar", "accidente",
         "hospital", "urgencia", "necesito dinero", "prestame", "depositame", "hermano",
         "hermana", "nieto", "nieta"],
    ),
    "extorsión": (
        ["extorsion", "sabemos donde vives", "sabemos donde vive", "tenemos tu informacion",
         "tenemos tus fotos", "tenemos tu video", "cjng", "cartel", "pago de piso",
         "cobro de piso", "vamos por ti", "hackeamos", "te grabamos", "video intimo",
         "secuestro virtual", "te vamos a matar", "cuota"],
        ["amenaza*", "deposito", "policia", "no llames", "tu familia", "tus hijos",
         "bitcoin", "dinero", "plazo", "o si no", "de lo contrario"],
    ),
    "empleo falso": (
        ["oferta de trabajo", "oferta de empleo", "vacante*", "trabaja desde casa",
         "trabajo desde casa", "ganancias diarias", "ingresos extra", "sin experiencia",
         "gana dinero facil", "dinero facil", "dar like", "dar likes", "tareas simples",
         "pago por tarea", "contratacion inmediata", "unete a nuestro equipo", "reclutamiento"],
        ["sueldo", "pago semanal", "pago diario", "whatsapp", "entrevista", "telegram",
         "depositamos", "comision", "empleo", "trabajo", "part time", "medio tiempo"],
    ),
    "inversión": (
        ["inversion", "invierte", "rendimientos", "ganancias garantizadas", "duplica tu dinero",
         "triplica*", "criptomoneda*", "bitcoin", "usdt", "trading", "forex", "binance",
         "sin riesgo", "retorno garantizado", "broker", "piramidal", "multiplica tu dinero",
         "ingresos pasivos", "staking"],
        ["ganancias", "cripto", "plataforma", "capital", "retiro", "asesor", "mercado",
         "bolsa", "fondo"],
    ),
    "soporte técnico": (
        ["anydesk", "teamviewer", "soporte tecnico", "tu computadora esta infectada",
         "virus en tu", "acceso remoto", "microsoft", "apple support",
         "instala la aplicacion", "descarga la aplicacion", "apk", "llame ahora", "llama ahora"],
        ["virus", "infectado", "alerta de seguridad", "malware", "computadora",
         "dispositivo", "hackeado"],
    ),
    "gobierno": (
        ["sat", "hacienda", "devolucion de impuestos", "declaracion anual", "imss",
         "infonavit", "afore", "pension", "apoyo del gobierno", "programa social",
         "bienestar", "cfe", "corte de luz", "profeco", "condusef", "guardia nacional",
         "fiscalia", "tenencia", "infraccion", "juzgado", "orden de aprehension", "amparo",
         "gobierno", "multa", "cfdi"],
        ["curp", "rfc", "ine", "adeudo", "pago pendiente", "embargo", "notificacion",
         "citatorio", "tramite", "folio", "credencial"],
    ),
    "suscripción": (
        ["netflix", "spotify", "disney", "hbo", "amazon prime", "prime video", "suscripcion",
         "renovacion", "metodo de pago", "pago rechazado", "tu membresia", "icloud", "apple id"],
        ["cuenta", "actualiza", "facturacion", "vence", "cobro", "renovar",
         "almacenamiento lleno"],
    ),
    "compraventa": (
        ["anticipo", "apartar", "apartado", "enviame el codigo", "te deposito",
         "pago adelantado", "pague de mas", "reembolso", "link de pago",
         "comprobante de pago", "comprobante", "facebook marketplace", "marketplace",
         "olx", "sigue disponible"],
        ["vendo", "compro", "disponible", "precio", "deposito", "transferencia", "envio",
         "tu anuncio", "publicacion"],
    ),
    "inmuebles": (
        ["casa en renta", "depto en renta", "departamento en renta", "deposito en garantia",
         "apartar con", "no puedo mostrarlo", "estoy fuera del pais", "llaves por paqueteria",
         "preventa", "renta*", "depa"],
        ["mensualidad", "contrato", "garantia", "mudanza", "inmueble", "terreno",
         "escrituras", "enganche"],
    ),
    "romance": (
        ["eres muy especial", "soy militar", "soy viudo", "soy viuda", "estoy en misiones",
         "petrolero", "quiero conocerte", "dime carino", "mi amor", "te amo",
         "plataforma petrolera"],
        ["regalo", "viajar", "confianza", "inversion", "enviarte dinero", "aduana",
         "paquete", "boleto", "visa", "carino", "amor"],
    ),
    "código de verificación": (
        ["codigo de verificacion", "codigo de 6 digitos", "codigo que te llego",
         "codigo que te enviaron", "me equivoque de numero", "enviaron un codigo",
         "mande un codigo por error", "reenvia el codigo", "pasame el codigo",
         "dime el codigo", "verification code", "otp", "vota por", "votar por"],
        ["codigo", "sms", "whatsapp", "voto", "concurso", "sobrina", "sobrino"],
    ),
    "préstamos": (
        ["prestamo*", "credito aprobado", "credito preaprobado", "credito pre aprobado",
         "sin buro", "sin aval", "sin verificacion", "deposito inmediato",
         "comision por apertura", "linea de credito", "pre aprobado", "preaprobado"],
        ["buro", "tasa", "aprobado", "monto", "financiera", "desembolso", "credito",
         "liquidacion", "pago inicial"],
    ),
}

# ── Compilación (una sola vez al importar) ──
_C_URGENT = _compile(URGENT_WORDS)
_C_THREAT = _compile(THREAT_WORDS)
_C_PERSONAL = _compile(PERSONAL_INFO_WORDS)
_C_PAYMENT = _compile(PAYMENT_WORDS)
_C_PAYMENT_HR = _compile(PAYMENT_HIGH_RISK)
_C_SECRECY = _compile(SECRECY_WORDS)
_C_REMOTE = _compile(REMOTE_ACCESS_WORDS)
_C_TOO_GOOD = _compile(TOO_GOOD_WORDS)
_C_ATTACH = _compile(ATTACHMENT_WORDS)
_C_GREETING = _compile(IMPERSONAL_GREETING)
_C_CONTACT = _compile(CONTACT_BAIT)
_C_SPAM = _compile(SPAM_WORDS)
_SAFE_RE = _alt_re(SAFE_CONTEXT)
_C_TYPES = {name: (_compile(s), _compile(w)) for name, (s, w) in SCAM_TYPES.items()}


def _request_near(clean: str, info_patterns, window: int = 70) -> bool:
    """
    ¿Alguna palabra sensible aparece cerca de un verbo que la PIDE?
    Ignora verbos negados ("no envíes...") y advertencias tipo "no compartas".
    """
    for _, rx in info_patterns:
        for m in rx.finditer(clean):
            s, e = max(0, m.start() - window), min(len(clean), m.end() + window)
            region = clean[s:e]
            if _NO_SHARE_RE.search(region):
                continue
            for v in REQUEST_VERBS.finditer(region):
                if _NEGATION_TAIL_RE.search(region[max(0, v.start() - 25):v.start()]):
                    continue
                return True
    return False


def _code_requested(clean: str) -> bool:
    """¿Se PIDE un código de verificación? (no cuenta 'tu código es 123, no lo compartas')."""
    return _request_near(clean, [("", VERIFICATION_CODE_RE)])


# ════════════════════════════════════════════════════════════════════
#  5. FUNCIONES DE DETECCIÓN INDIVIDUALES (compatibles con tu código)
# ════════════════════════════════════════════════════════════════════

def detect_shortened_links(text: str) -> list[str]:
    links = _analyze_links(_prepare(text))
    return sorted({l["host"] for l in links if "shortened_link" in l["flags"]})


def detect_urgent_language(text: str) -> list[str]:
    clean = _clean(_prepare(text))
    return _hits(_C_URGENT, clean, re.sub(r"[^a-z0-9]", "", clean))


def detect_personal_info_request(text: str) -> bool:
    clean = _clean(_prepare(text))
    return _request_near(clean, _C_PERSONAL) or _code_requested(clean)


def detect_scam_types(text: str) -> list[str]:
    clean = _clean(_prepare(text))
    return list(_score_types(clean, re.sub(r"[^a-z0-9]", "", clean)))


def detect_all_urls(text: str) -> list[str]:
    return [l["url"] for l in _analyze_links(_prepare(text))]


def _score_types(clean: str, compact: str) -> dict[str, dict]:
    results = {}
    for name, (strong_c, weak_c) in _C_TYPES.items():
        strong = _hits(strong_c, clean, compact)
        weak = [w for w in _hits(weak_c, clean) if w not in strong]
        score = 2 * len(strong) + len(weak)
        if score >= 3:
            results[name] = {"score": score, "matches": (strong + weak)[:6]}
    return dict(sorted(results.items(), key=lambda kv: kv[1]["score"], reverse=True))


def _writing_issues(prepared: str) -> list[str]:
    """
    Señales SECUNDARIAS de redacción: mayúsculas extrañas y nombres de marca mal
    escritos. Nunca deben decidir un fraude por sí solas (se aplican solo si ya
    hay otras señales).
    """
    no_urls = _URL_RE.sub(" ", prepared)
    issues: list[str] = []

    weird_caps = [w for w in re.findall(r"\b[a-záéíóúñ]{2,}[A-ZÁÉÍÓÚÑ]+[a-záéíóúñ]*\b", no_urls)
                  if w.lower() not in {"whatsapp", "paypal", "iphone", "youtube", "facebook",
                                       "mercadolibre", "bancoppel", "citibanamex", "playstation",
                                       "tiktok", "totalplay", "paquetexpress"}]
    if len(weird_caps) >= 2:
        issues.append("mayúsculas irregulares")

    words = list(dict.fromkeys(re.findall(r"[a-z0-9]{5,}", _clean(no_urls))))[:300]
    for w in words:
        for b in _BRAND_WORDS:
            if w != b and abs(len(w) - len(b)) <= 1 and SequenceMatcher(None, w, b).ratio() >= 0.86:
                issues.append(f"nombre de marca mal escrito ('{w}')")
                break
        if len(issues) >= 3:
            break
    return issues


# ════════════════════════════════════════════════════════════════════
#  6. REPORTES SIMILARES
# ════════════════════════════════════════════════════════════════════

_STOPWORDS = {
    "para", "como", "este", "esta", "pero", "porque", "cuando", "tiene", "tienes", "desde",
    "hasta", "sobre", "entre", "estas", "estos", "hola", "gracias", "favor", "buenos",
    "buenas", "dias", "tardes", "noches", "usted", "ustedes", "nuestro", "nuestra",
}


@lru_cache(maxsize=4096)
def _fingerprint_cached(text: str) -> tuple[frozenset, frozenset, frozenset]:
    """Huella de un texto. Cacheada: antes se recalculaba para hasta 2 000 reportes en cada análisis."""
    prepared = _prepare(text)
    clean = _clean(prepared)
    tokens = frozenset(w for w in re.findall(r"[a-z0-9]{4,}", clean) if w not in _STOPWORDS)
    hosts = frozenset(l["host"] for l in _analyze_links(prepared) if l["host"] and not _is_trusted(l["host"]))
    phones = frozenset(re.sub(r"\D", "", p)[-10:] for p in _PHONE_RE.findall(prepared))
    return tokens, hosts, phones


def _fingerprint(text: str) -> dict:
    tokens, hosts, phones = _fingerprint_cached(text)
    return {"tokens": tokens, "hosts": hosts, "phones": phones}


def find_similar_reports(text: str, db: Session, limit: int = MAX_REPORTS_TO_COMPARE) -> dict:
    """Compara con los reportes más recientes: palabras, dominios y teléfonos compartidos."""
    empty = {"count": 0, "shared_hosts": [], "shared_phones": []}
    try:
        me = _fingerprint(text)
        if not (me["tokens"] or me["hosts"] or me["phones"]):
            return empty

        query = db.query(Report.message_text)
        order_col = getattr(Report, "created_at", None)
        if order_col is None:
            order_col = getattr(Report, "id", None)
        if order_col is not None:
            query = query.order_by(order_col.desc())
        rows = query.limit(limit).all()

        count, shared_hosts, shared_phones = 0, set(), set()
        for (msg,) in rows:
            if not msg:
                continue
            fp = _fingerprint(msg)
            common = me["tokens"] & fp["tokens"]
            host_match = me["hosts"] & fp["hosts"]
            phone_match = me["phones"] & fp["phones"]

            similar = False
            if me["tokens"] and fp["tokens"] and len(common) >= 4:
                union = len(me["tokens"] | fp["tokens"])
                overlap = len(common) / min(len(me["tokens"]), len(fp["tokens"]))
                similar = (len(common) / union >= 0.35) or overlap >= 0.6

            if similar or host_match or phone_match:
                count += 1
                shared_hosts |= host_match
                shared_phones |= phone_match
        return {"count": count, "shared_hosts": sorted(shared_hosts), "shared_phones": sorted(shared_phones)}
    except Exception:  # la BD nunca debe tumbar el análisis
        logger.exception("Error comparando con reportes similares")
        return empty


def count_similar_reports(text: str, db: Session) -> int:
    return find_similar_reports(text, db)["count"]


# ════════════════════════════════════════════════════════════════════
#  7. CLASIFICACIÓN, CONFIANZA Y SALIDA ESTRUCTURADA
# ════════════════════════════════════════════════════════════════════

# Vocabulario fijo de señales que se devuelve en `signals`
_SIGNAL_NAMES = {
    "urgent": "urgency",
    "threat": "threat",
    "personal_info_request": "sensitive_data_request",
    "verification_code_request": "verification_code_request",
    "payment": "financial_request",
    "payment_high_risk": "financial_request",
    "secrecy": "secrecy_request",
    "remote_access": "remote_access",
    "too_good": "too_good_offer",
    "unexpected_benefit": "unexpected_reward",
    "unexpected_benefit_link": "unexpected_reward",
    "fine_or_debt": "fine_or_debt",
    "fine_or_debt_link": "fine_or_debt",
    "bank_claim": "bank_claim",
    "bank_claim_link": "bank_claim",
    "attachment": "attachment",
    "impersonal_greeting": "generic_greeting",
    "contact_bait": "contact_bait",
    "aggressive_format": "aggressive_format",
    "brand_link_mismatch": "impersonation",
    "sender_brand_mismatch": "impersonation",
    "sender_personal_number": "sender_mismatch",
    "similar_reports": "reported_by_others",
    "unsolicited_link": "unexpected_link",
    "spam_promo": "promotional",
    "writing_errors": "writing_errors",
    "personal_info_mention": "sensitive_data_mention",
}

# Señales que no cuentan como evidencia independiente al calcular la confianza
_SECONDARY_SIGNALS = {"writing_errors", "generic_greeting", "aggressive_format",
                      "promotional", "sensitive_data_mention"}


def _signal_name(key: str) -> str | None:
    if key.startswith("link:"):
        flag = key[5:]
        if flag in _IMPERSONATION_LINK_FLAGS:
            return "impersonation"
        if flag == "messaging_link":
            return "external_chat_redirect"
        if flag == "insecure_http":
            return None
        if flag == "brand_unverified_domain":
            return "unverified_domain"
        return "suspicious_link"
    if key.startswith("type:"):
        return "known_scam_pattern"
    return _SIGNAL_NAMES.get(key)


# Señales que revelan a QUÉ apunta el mensaje
_PHISH_KEYS = {"personal_info_request", "verification_code_request", "bank_claim",
               "bank_claim_link", "type:phishing", "type:bancaria",
               "type:código de verificación", "type:suscripción", "type:paquetería"}
_SCAM_KEYS = {"payment", "payment_high_risk", "unexpected_benefit", "unexpected_benefit_link",
              "fine_or_debt", "fine_or_debt_link", "type:premio", "type:empleo falso",
              "type:inversión", "type:préstamos", "type:compraventa", "type:inmuebles",
              "type:romance", "type:familiar", "type:extorsión", "type:gobierno",
              "type:soporte técnico"}

# Si aparece alguna de estas, el mensaje ya no es "solo publicidad"
_NON_SPAM_KEYS = {"personal_info_request", "verification_code_request", "payment_high_risk",
                  "secrecy", "remote_access", "brand_link_mismatch", "sender_brand_mismatch",
                  "unexpected_benefit_link", "fine_or_debt_link", "bank_claim_link",
                  "link:brand_impersonation", "link:typosquatting", "link:freemail_impersonation",
                  "link:ip_address", "link:punycode", "link:at_symbol"}


def _classify(score: float, keys: set[str], weights: dict[str, float], spam_hits: int) -> str:
    """Una de: LEGITIMATE | SPAM | SUSPICIOUS | PHISHING | SCAM."""
    only_promo = spam_hits >= 2 and not (keys & _NON_SPAM_KEYS)

    if score < T_SUSPICIOUS:
        return "SPAM" if only_promo else "LEGITIMATE"
    if score < T_HIGH:
        return "SPAM" if only_promo else "SUSPICIOUS"

    phish = sum(weights[k] for k in _PHISH_KEYS if k in keys)
    scam = sum(weights[k] for k in _SCAM_KEYS if k in keys)

    if phish == 0 and scam == 0:
        # Riesgo alto pero sin objetivo claro: suplantación con enlace = intento de captar accesos;
        # en otro caso, ante la duda, SUSPICIOUS.
        if keys & {"link:brand_impersonation", "link:typosquatting", "link:freemail_impersonation",
                   "brand_link_mismatch", "sender_brand_mismatch"}:
            return "PHISHING"
        return "SUSPICIOUS"
    if phish > scam:
        return "PHISHING"
    if scam > phish:
        return "SCAM"
    # Empate: si piden credenciales/códigos manda PHISHING; si no, SCAM
    return "PHISHING" if keys & {"personal_info_request", "verification_code_request"} else "SCAM"


def _confidence(classification: str, score: float, names: set[str], spam_hits: int, text_len: int,
                floor_applied: bool) -> int:
    """
    Qué tan firme es la clasificación (no es lo mismo que el risk_score).
    Sube con señales independientes que coinciden; baja con textos muy cortos.
    """
    n = len(names - _SECONDARY_SIGNALS)
    if classification in ("PHISHING", "SCAM"):
        conf = 45 + 9 * n + (8 if floor_applied else 0)
    elif classification == "SUSPICIOUS":
        conf = 40 + 5 * n
    elif classification == "SPAM":
        conf = 55 + 6 * spam_hits
    else:  # LEGITIMATE
        conf = 92 - int(score * 160)
    if text_len < 25:
        conf -= 20
    elif text_len < 60:
        conf -= 8
    cap = {"SUSPICIOUS": 72, "SPAM": 88}.get(classification, 97)
    return max(5, min(cap, int(conf)))


def _link_analysis(links: list[dict], keys: set[str], by_flag: dict[str, list[str]]) -> dict:
    """Bloque `link_analysis`. No inventa legitimidad ni si el usuario pidió el enlace."""
    real = [l for l in links if l["host"] or l["flags"]]
    if not real:
        return {"present": False, "suspicious": False, "reason": "No se detectaron enlaces en el mensaje."}

    serious = {f: h for f, h in by_flag.items() if f not in _MILD_LINK_FLAGS}
    mismatch = "brand_link_mismatch" in keys
    if serious or mismatch:
        parts = []
        for flag, hosts in sorted(serious.items(), key=lambda kv: -_LINK_FLAG_WEIGHTS[kv[0]])[:2]:
            parts.append(_LINK_FLAG_TEXT[flag].format(hosts=", ".join(sorted(set(hosts))[:2])).rstrip("."))
        if mismatch:
            parts.append("Menciona una institución cuyo sitio oficial no coincide con el enlace")
        return {"present": True, "suspicious": True, "reason": "; ".join(parts) + "."}

    hosts = [l["host"] for l in real if l["host"]]
    if hosts and all(_is_trusted(h) for h in hosts):
        return {"present": True, "suspicious": False,
                "reason": ("El dominio pertenece a una organización conocida "
                           f"({', '.join(sorted(set(hosts))[:2])}). "
                           "Se desconoce si el usuario solicitó el enlace.")}
    return {"present": True, "suspicious": False,
            "reason": ("No se observaron señales de riesgo en el dominio, pero no hay información "
                       "suficiente para confirmar que sea legítimo ni si fue solicitado.")}


def to_prompt_json(result: dict) -> str:
    """Serializa el resultado con la estructura EXACTA del prompt (risk_score entero 0-100)."""
    payload = {
        "classification": result["classification"],
        "risk_score": result["risk_score_100"],
        "confidence": result["confidence"],
        "reasons": result["reasons"],
        "signals": result["signals"],
        "link_analysis": result["link_analysis"],
    }
    return json.dumps(payload, ensure_ascii=False)


# ════════════════════════════════════════════════════════════════════
#  8. ANÁLISIS PRINCIPAL
# ════════════════════════════════════════════════════════════════════

_RECOMMENDATIONS = {
    "red": ("No respondas, no abras enlaces, no descargues nada y no compartas datos, "
            "contraseñas ni códigos. Bloquea al remitente y repórtalo. Si dices ser "
            "cliente de una institución, contáctala por sus canales oficiales."),
    "yellow": ("Verifica antes de actuar: no hagas clic en enlaces ni des datos. Confirma "
               "por otro medio (llamando a la institución o a la persona por un número "
               "que ya conocías)."),
    "green": ("No se detectaron señales claras de estafa, pero ante cualquier duda no "
              "compartas datos ni códigos de verificación."),
}

_EMPTY_RESULT = {
    "risk_level": "green", "risk_score": 0.0, "is_scam": False, "scam_type": None,
    "explanation": "No se proporcionó texto para analizar.", "detected_rules": {},
    "similar_reports_count": 0, "scam_types": [], "recommendation": _RECOMMENDATIONS["green"],
    "classification": "LEGITIMATE", "risk_score_100": 0, "confidence": 0,
    "reasons": ["No se proporcionó texto para analizar."], "signals": [],
    "link_analysis": {"present": False, "suspicious": False,
                      "reason": "No se detectaron enlaces en el mensaje."},
}


def _analyze_sender(sender: str | None, clean: str) -> list[tuple[str, float, str]]:
    """Señales del remitente (solo si el llamador lo proporciona). Nunca se asume."""
    out: list[tuple[str, float, str]] = []
    if not sender or not sender.strip():
        return out
    s = sender.strip().lower()
    claimed = [b for b, rx in _BRAND_NAME_RES.items() if rx.search(clean)]
    if not claimed:
        return out

    if "@" in s:
        domain = re.sub(r"[<>\s]", "", s.rsplit("@", 1)[-1])
        if domain in _FREEMAIL:
            out.append(("sender_brand_mismatch", 0.35,
                        f"Dice ser {claimed[0]} pero el remitente usa un correo gratuito ({domain})."))
        elif not _is_trusted(domain) and not any(_host_in(domain, BRANDS[b][1]) for b in claimed):
            out.append(("sender_brand_mismatch", 0.30,
                        f"Menciona a {claimed[0]} pero el correo del remitente ({domain}) no es de esa organización."))
    elif re.fullmatch(r"\+?[\d\s().\-]{10,15}", s) and any(b in _INSTITUTION_BRANDS for b in claimed):
        out.append(("sender_personal_number", 0.15,
                    "Afirma ser una institución pero escribe desde un número de teléfono personal."))
    return out


def analyze_message(text: str, db: Session, sender: str | None = None,
                    user_initiated: bool | None = None) -> dict:
    """
    Analiza un mensaje, correo o texto extraído de una imagen (OCR).

    Args:
        text: contenido del mensaje.
        db: sesión de base de datos (para reportes similares).
        sender: remitente (número o correo) si se conoce. Opcional.
        user_initiated: True si el usuario pidió/esperaba el mensaje (código, compra,
            seguimiento...), False si es claramente inesperado, None si se DESCONOCE
            (valor por defecto: no se asume nada).

    Returns:
        Campos anteriores: risk_level, risk_score (0-1), is_scam, scam_type, explanation,
        detected_rules, similar_reports_count, scam_types, recommendation.
        Campos nuevos: classification, risk_score_100, confidence, reasons, signals,
        link_analysis.
    """
    if not text or not text.strip():
        return dict(_EMPTY_RESULT)

    text = text[:MAX_TEXT_LEN]
    prepared = _prepare(text)
    clean = _clean(prepared)
    compact = re.sub(r"[^a-z0-9]", "", clean)

    signals: list[tuple[str, float, str]] = []  # (clave, peso, explicación)

    def add(key: str, weight: float, label: str) -> None:
        signals.append((key, weight, label))

    # ── Enlaces ──
    links = _analyze_links(prepared)
    by_flag: dict[str, list[str]] = {}
    for l in links:
        for f in l["flags"]:
            by_flag.setdefault(f, []).append(l["host"] or l["url"])
    for flag, hosts in by_flag.items():
        hosts_txt = ", ".join(sorted(set(hosts))[:3])
        add(f"link:{flag}", _LINK_FLAG_WEIGHTS[flag], _LINK_FLAG_TEXT[flag].format(hosts=hosts_txt))

    link_hosts = [l["host"] for l in links if l["host"]]
    untrusted_link = any(not _is_trusted(h) for h in link_hosts)

    # Menciona una institución pero el enlace no es de ella
    if links and untrusted_link:
        mismatched = [
            b for b, rx in _BRAND_NAME_RES.items()
            if rx.search(clean) and not any(_host_in(l["host"], BRANDS[b][1]) for l in links)
        ]
        if mismatched:
            add("brand_link_mismatch", 0.25,
                f"Menciona a {', '.join(sorted(set(mismatched))[:2])} pero el enlace no es de su sitio oficial.")

    # ── Remitente (solo si se conoce) ──
    for key, w, label in _analyze_sender(sender, clean):
        add(key, w, label)

    # ── Enlace inesperado: SOLO si el llamador lo indica; si no, es "desconocido" ──
    if user_initiated is False and links:
        add("unsolicited_link", 0.10, "El mensaje trae un enlace que el usuario no esperaba.")

    # ── Datos sensibles: pedirlos pesa mucho más que mencionarlos ──
    personal_request = _request_near(clean, _C_PERSONAL)
    personal_mentions = _hits(_C_PERSONAL, clean, compact)
    if personal_request:
        add("personal_info_request", 0.35, "Solicita información personal, bancaria o de acceso.")
    elif personal_mentions:
        add("personal_info_mention", 0.10, "Menciona datos sensibles (sin pedirlos claramente).")

    code_request = _code_requested(clean)
    if code_request:
        add("verification_code_request", 0.40,
            "Pide un código de verificación: es la forma de robar cuentas de WhatsApp y bancos.")

    # ── Dinero ──
    payment_hr = _hits(_C_PAYMENT_HR, clean, compact)
    payment = _hits(_C_PAYMENT, clean, compact)
    if payment_hr:
        add("payment_high_risk", 0.35,
            f"Habla de pagos difíciles de rastrear o recuperar: {', '.join(payment_hr[:3])}.")
    elif payment:
        add("payment", 0.20, f"Habla de depósitos o pagos: {', '.join(payment[:3])}.")

    # ── Premios, recompensas y beneficios inesperados ──
    benefit = BENEFIT_RE.search(clean)
    if benefit:
        if untrusted_link:
            add("unexpected_benefit_link", 0.35,
                "Ofrece un premio o beneficio económico inesperado con un enlace que no es oficial.")
        else:
            add("unexpected_benefit", 0.20, "Ofrece un premio o beneficio económico inesperado.")

    # ── Multas, adeudos y autoridades ──
    fines = _hits(_C_FINE, clean, compact)
    if fines:
        if untrusted_link:
            add("fine_or_debt_link", 0.35,
                f"Habla de {', '.join(fines[:2])} e incluye un enlace que no corresponde a una autoridad oficial.")
        else:
            add("fine_or_debt", 0.10, f"Menciona multas o adeudos: {', '.join(fines[:2])}.")

    # ── Bancos y pagos (un banco legítimo también envía avisos: pesa poco sin enlace dudoso) ──
    bank_claim = _BANK_CLAIM_RE.search(clean)
    if bank_claim:
        if untrusted_link or personal_request:
            add("bank_claim_link", 0.30,
                f"Afirma un problema de cuenta/pago ('{bank_claim.group(0)}') y pide actuar por un medio no oficial.")
        else:
            add("bank_claim", 0.08, f"Menciona un problema de cuenta o pago ('{bank_claim.group(0)}').")

    secrecy = _hits(_C_SECRECY, clean, compact)
    if secrecy:
        add("secrecy", 0.30, "Te pide guardar el secreto o no avisar a nadie.")

    remote = _hits(_C_REMOTE, clean, compact)
    if remote:
        add("remote_access", 0.40, f"Pide instalar apps o dar acceso remoto: {', '.join(remote[:2])}.")

    too_good = _hits(_C_TOO_GOOD, clean, compact)
    if too_good:
        add("too_good", 0.20, f"Ofrece algo demasiado bueno para ser verdad: {', '.join(too_good[:2])}.")

    if _hits(_C_ATTACH, clean, compact):
        add("attachment", 0.15, "Te pide abrir o descargar un archivo adjunto.")

    if _hits(_C_GREETING, clean):
        add("impersonal_greeting", 0.10, "Saludo genérico (\"estimado cliente\"), típico de mensajes masivos.")

    phones = sorted({re.sub(r"\D", "", p)[-10:] for p in _PHONE_RE.findall(prepared)})
    if _hits(_C_CONTACT, clean) and (phones or by_flag.get("messaging_link")):
        add("contact_bait", 0.12, "Te invita a contactar a un número o grupo desconocido.")

    letters = [c for c in text if c.isalpha()]
    shouting = len(letters) >= 25 and sum(c.isupper() for c in letters) / len(letters) > 0.6
    if shouting or text.count("!") >= 3:
        add("aggressive_format", 0.05, "Usa mayúsculas o exclamaciones en exceso.")

    spam_hits = len(_hits(_C_SPAM, clean, compact))
    if spam_hits >= 2:
        add("spam_promo", 0.10, "Contiene lenguaje publicitario o promocional.")

    # ── Contexto: ¿hay ya una señal "dura"? Urgencia y amenazas solas pesan poco ──
    HARD_KEYS = {"personal_info_request", "verification_code_request", "payment", "payment_high_risk",
                 "secrecy", "remote_access", "unexpected_benefit", "unexpected_benefit_link",
                 "fine_or_debt_link", "bank_claim_link", "brand_link_mismatch",
                 "sender_brand_mismatch"}
    keys_now = {k for k, _, _ in signals}
    hard_present = bool(keys_now & HARD_KEYS) or any(
        k.startswith("link:") and k[5:] not in (_MILD_LINK_FLAGS | {"brand_unverified_domain"})
        for k in keys_now)

    urgent = _hits(_C_URGENT, clean, compact)
    if urgent:
        if hard_present:
            add("urgent", 0.28 if len(urgent) >= 2 else 0.20,
                f"Presiona con urgencia junto a otras señales de riesgo: {', '.join(urgent[:3])}.")
        else:
            add("urgent", 0.08, f"Usa lenguaje de urgencia: {', '.join(urgent[:3])}.")

    threats = _hits(_C_THREAT, clean, compact)
    if threats:
        if hard_present:
            add("threat", 0.25, f"Usa amenazas o consecuencias: {', '.join(threats[:3])}.")
        else:
            add("threat", 0.12, f"Menciona consecuencias o amenazas: {', '.join(threats[:3])}.")

    # ── Tipos de estafa: sin señales duras, las palabras sueltas pesan menos ──
    types = _score_types(clean, compact)
    type_ctx = 1.0 if (hard_present or urgent or threats) else 0.4
    for name, info in list(types.items())[:2]:
        add(f"type:{name}", round(min(0.12 + 0.06 * info["score"], 0.45) * type_ctx, 3),
            f"Patrones de estafa tipo {name}: {', '.join(info['matches'][:3])}.")

    # ── Reportes similares ──
    sim = find_similar_reports(text, db)
    similar_count = sim["count"]
    if similar_count:
        if sim["shared_hosts"] or sim["shared_phones"]:
            w = 0.35
        elif similar_count >= 5:
            w = 0.30
        elif similar_count >= 2:
            w = 0.15
        else:
            w = 0.08
        add("similar_reports", w, f"Se encontraron {similar_count} reporte(s) similar(es) en la base de datos.")

    # ── Errores de redacción: señal SECUNDARIA, solo si ya hay otras señales ──
    pre_score = _noisy_or([w for _, w, _ in signals])
    if pre_score >= 0.25:
        issues = _writing_issues(prepared)
        if issues:
            add("writing_errors", 0.04, f"Errores de redacción sospechosos: {', '.join(issues[:2])}.")

    # ── Puntuación ──
    score = _noisy_or([w for _, w, _ in signals])
    keys = {k for k, _, _ in signals}
    weights = {k: w for k, w, _ in signals}

    behavior_keys = {"personal_info_request", "payment_high_risk", "payment", "secrecy",
                     "remote_access", "verification_code_request", "threat",
                     "unexpected_benefit_link", "fine_or_debt_link", "bank_claim_link",
                     "brand_link_mismatch", "sender_brand_mismatch"}
    has_link_flags = any(k.startswith("link:") and k[5:] not in (_MILD_LINK_FLAGS | {"brand_unverified_domain"})
                         for k in keys)
    strong_keys = behavior_keys | {f"link:{f}" for f in _IMPERSONATION_LINK_FLAGS | {"ip_address", "punycode", "at_symbol"}}

    # Amortiguadores: reducen falsos positivos en avisos legítimos, enlaces oficiales
    # y mensajes que el usuario sí solicitó (solo si NO hay señales fuertes)
    if _SAFE_RE.search(clean) and not has_link_flags and not (
            keys & {"payment_high_risk", "secrecy", "verification_code_request"}):
        score *= 0.5
    real_links = [l for l in links if l["host"]]
    if real_links and all(_is_trusted(l["host"]) for l in real_links) and not (keys & behavior_keys):
        score *= 0.6
    if user_initiated is True and not (keys & strong_keys):
        score *= 0.6

    # Pisos: combinaciones que son estafa casi con seguridad
    floor = 0.0
    if "verification_code_request" in keys:
        floor = max(floor, 0.65)
    if keys & {"link:brand_impersonation", "link:typosquatting", "link:freemail_impersonation"}:
        floor = max(floor, 0.60)
    if keys & {"link:ip_address", "link:punycode", "link:at_symbol"} and keys & (
            {"urgent", "threat", "personal_info_request", "payment", "payment_high_risk"}):
        floor = max(floor, 0.60)
    if "payment_high_risk" in keys and "secrecy" in keys:
        floor = max(floor, 0.65)
    if "remote_access" in keys and keys & {"type:bancaria", "type:soporte técnico"}:
        floor = max(floor, 0.60)
    if "type:extorsión" in keys and keys & {"threat", "secrecy", "payment", "payment_high_risk"}:
        floor = max(floor, 0.65)
    if "personal_info_request" in keys and "link:shortened_link" in keys:
        floor = max(floor, 0.60)
    # Institución/organización que no coincide con el enlace + presión, pago o datos
    if keys & {"brand_link_mismatch", "sender_brand_mismatch"} and keys & {
            "urgent", "threat", "personal_info_request", "payment", "payment_high_risk",
            "bank_claim_link", "unexpected_benefit_link", "fine_or_debt_link"}:
        floor = max(floor, 0.60)
    # Oferta de ingresos inesperados con patrón de empleo falso
    if "unexpected_benefit" in keys and "type:empleo falso" in keys:
        floor = max(floor, 0.60)
    # Multa / banco / premio con enlace no oficial + presión o solicitud de dinero/datos
    if keys & {"fine_or_debt_link", "bank_claim_link", "unexpected_benefit_link"} and keys & {
            "urgent", "threat", "payment", "payment_high_risk", "personal_info_request"}:
        floor = max(floor, 0.60)

    floor_applied = floor > score
    risk_score = round(min(max(score, floor), 1.0), 2)
    risk_score_100 = int(round(risk_score * 100))

    # ── Clasificación ──
    classification = _classify(risk_score, keys, weights, spam_hits)
    is_scam = classification in ("PHISHING", "SCAM")

    # ── Semáforo (compatibilidad) ──
    if is_scam:
        risk_level = "red"
    elif classification in ("SUSPICIOUS", "SPAM"):
        risk_level = "yellow" if (classification == "SUSPICIOUS" or risk_score >= 0.15) else "green"
    else:
        risk_level = "green"

    scam_types = list(types)
    scam_type = scam_types[0] if scam_types else None

    # ── Señales, razones y confianza ──
    ordered = sorted(signals, key=lambda s: s[1], reverse=True)
    signal_names: list[str] = []
    for k, w, _ in ordered:
        if classification == "LEGITIMATE" and (w < 0.10 or k.startswith("type:")):
            continue  # señales débiles no se reportan como "detectadas" en mensajes sin riesgo
        n = _signal_name(k)
        if n and n not in signal_names:
            signal_names.append(n)

    if classification == "LEGITIMATE":
        reasons = ["No se observaron señales importantes de fraude en el contenido del mensaje."]
        if real_links and all(_is_trusted(l["host"]) for l in real_links):
            reasons.append("Los enlaces pertenecen a dominios oficiales conocidos.")
        if _SAFE_RE.search(clean):
            reasons.append("El mensaje incluye advertencias de seguridad propias de comunicaciones legítimas.")
        explanation = "No se encontraron suficientes características sospechosas en el mensaje."
    else:
        reasons = [label for _, _, label in ordered[:6]] or ["Análisis completado."]
        explanation = " ".join(label for _, _, label in ordered[:5]) or "Análisis completado."

    confidence = _confidence(classification, risk_score, set(signal_names), spam_hits,
                             len(text.strip()), floor_applied)
    link_analysis = _link_analysis(links, keys, by_flag)

    # ── detected_rules (claves anteriores + nuevas) ──
    detected_rules: dict = {}
    shortened = sorted({l["host"] for l in links if "shortened_link" in l["flags"]})
    if shortened:
        detected_rules["shortened_links"] = shortened
    if urgent:
        detected_rules["urgent_language"] = urgent
    if personal_request or code_request:
        detected_rules["personal_info_request"] = True
    if scam_types:
        detected_rules["scam_types_detected"] = scam_types
    if links:
        detected_rules["urls_found"] = [l["url"] for l in links]
    if by_flag:
        detected_rules["link_flags"] = {f: sorted(set(h)) for f, h in by_flag.items()}
    if threats:
        detected_rules["threat_language"] = threats
    if payment or payment_hr:
        detected_rules["payment_request"] = payment_hr + payment
    if secrecy:
        detected_rules["secrecy_request"] = True
    if remote:
        detected_rules["remote_access_request"] = remote
    if code_request:
        detected_rules["verification_code_request"] = True
    if benefit:
        detected_rules["unexpected_benefit"] = True
    if fines:
        detected_rules["fine_or_debt_terms"] = fines
    if bank_claim:
        detected_rules["bank_claim"] = bank_claim.group(0)
    if spam_hits >= 2:
        detected_rules["promotional_language"] = True
    if phones:
        detected_rules["phones_found"] = phones
    if sim["shared_hosts"]:
        detected_rules["hosts_in_previous_reports"] = sim["shared_hosts"]
    if sim["shared_phones"]:
        detected_rules["phones_in_previous_reports"] = sim["shared_phones"]

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "is_scam": is_scam,
        "scam_type": scam_type,
        "explanation": explanation,
        "detected_rules": detected_rules,
        "similar_reports_count": similar_count,
        "scam_types": scam_types,
        "recommendation": _RECOMMENDATIONS[risk_level],
        # ── Campos alineados con el prompt ──
        "classification": classification,
        "risk_score_100": risk_score_100,
        "confidence": confidence,
        "reasons": reasons,
        "signals": signal_names,
        "link_analysis": link_analysis,
    }