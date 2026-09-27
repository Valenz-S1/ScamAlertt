import re
from sqlalchemy.orm import Session

from app.models.report import Report


# ── Patrones de detección ──

URGENT_WORDS = [
    "urgente", "inmediatamente", "ahora mismo", "ya mismo", "rápido",
    "no esperes", "actúa ya", "sin demora", "limite de tiempo",
    "expira hoy", "última oportunidad", "solo hoy", "atención inmediata",
]

PERSONAL_INFO_WORDS = [
    "contraseña", "password", "curp", "rfc", "número de seguro",
    "tarjeta de crédito", "cvv", "pin", "clabe", "datos bancarios",
    "cuenta bancaria", "información personal", "verifica tu identidad",
]

SUSPICIOUS_LINKS = [
    "bit.ly", "tinyurl", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rebrand.ly", "shorte.st", "adf.ly",
]

SCAM_PATTERNS = {
    "paquetería": [
        "paquete", "entrega", "envío", "correo", "dhl", "fedex",
        "estafeta", "ups", "mercado libre", "paquetería",
    ],
    "bancaria": [
        "banco", "cuenta bloqueada", "transferencia", "saldo",
        "movimiento sospechoso", "verificar cuenta", "bancomer",
        "banamex", "bbva", "santander", "banorte", "hsbc",
    ],
    "premio": [
        "premio", "ganaste", "felicitaciones", "lotería", "sorteo",
        "millón", "dinero gratis", "herencia", "te tocaron",
    ],
    "phishing": [
        "verifica", "confirmar", "actualizar datos", "iniciar sesión",
        "link", "clic aquí", "da clic", "haz clic", "ingresa aquí",
    ],
    "familiar": [
        "hijo", "hija", "mamá", "papá", "familiar", "accidente",
        "hospital", "urgencia familiar", "necesito dinero",
    ],
}


def detect_shortened_links(text: str) -> list[str]:
    """Detecta enlaces acortados en el texto."""
    found = []
    text_lower = text.lower()
    for link in SUSPICIOUS_LINKS:
        if link in text_lower:
            found.append(link)
    return found


def detect_urgent_language(text: str) -> list[str]:
    """Detecta palabras que exigen urgencia."""
    found = []
    text_lower = text.lower()
    for word in URGENT_WORDS:
        if word in text_lower:
            found.append(word)
    return found


def detect_personal_info_request(text: str) -> bool:
    """Detecta si el mensaje pide información personal."""
    text_lower = text.lower()
    for word in PERSONAL_INFO_WORDS:
        if word in text_lower:
            return True
    return False


def detect_scam_types(text: str) -> list[str]:
    """Detecta tipos de estafa basados en palabras clave."""
    found_types = []
    text_lower = text.lower()
    for scam_type, keywords in SCAM_PATTERNS.items():
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches >= 2:  # Al menos 2 coincidencias para considerar el tipo
            found_types.append(scam_type)
    return found_types


def detect_all_urls(text: str) -> list[str]:
    """Extrae todas las URLs del texto."""
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+'
    return re.findall(url_pattern, text, re.IGNORECASE)


def count_similar_reports(text: str, db: Session) -> int:
    """
    Cuenta reportes anteriores que contienen palabras clave similares.
    Búsqueda simple por coincidencia de palabras clave.
    """
    # Extraer palabras significativas (más de 4 caracteres)
    words = set(
        w.lower()
        for w in re.findall(r"\b\w+\b", text)
        if len(w) > 4
    )

    if not words:
        return 0

    # Buscar reportes que contengan al menos algunas de estas palabras
    reports = db.query(Report).all()

    similar_count = 0
    for report in reports:
        report_words = set(
            w.lower()
            for w in re.findall(r"\b\w+\b", report.message_text)
            if len(w) > 4
        )
        # Si comparten al menos 3 palabras significativas
        common = words & report_words
        if len(common) >= 3:
            similar_count += 1

    return similar_count


def analyze_message(text: str, db: Session) -> dict:
    """
    Analiza un mensaje usando reglas y comparación con reportes.
    
    Returns:
        Diccionario con: risk_level, risk_score, is_scam, scam_type,
        explanation, detected_rules, similar_reports_count
    """
    if not text or not text.strip():
        return {
            "risk_level": "green",
            "risk_score": 0.0,
            "is_scam": False,
            "scam_type": None,
            "explanation": "No se proporcionó texto para analizar.",
            "detected_rules": {},
            "similar_reports_count": 0,
        }

    # ── Ejecutar todas las detecciones ──
    shortened_links = detect_shortened_links(text)
    urgent_words = detect_urgent_language(text)
    personal_info = detect_personal_info_request(text)
    scam_types = detect_scam_types(text)
    all_urls = detect_all_urls(text)
    similar_count = count_similar_reports(text, db)

    # ── Construir detected_rules ──
    detected_rules: dict = {}

    if shortened_links:
        detected_rules["shortened_links"] = shortened_links
    if urgent_words:
        detected_rules["urgent_language"] = urgent_words
    if personal_info:
        detected_rules["personal_info_request"] = True
    if scam_types:
        detected_rules["scam_types_detected"] = scam_types
    if all_urls:
        detected_rules["urls_found"] = all_urls

    # ── Calcular puntuación de riesgo ──
    risk_score = 0.0

    # Cada hallazgo suma puntos
    if shortened_links:
        risk_score += 0.25
    if urgent_words:
        risk_score += 0.20
    if personal_info:
        risk_score += 0.30
    if scam_types:
        risk_score += 0.25 * len(scam_types)

    # Reportes similares aumentan el riesgo
    if similar_count >= 5:
        risk_score += 0.30
    elif similar_count >= 2:
        risk_score += 0.15
    elif similar_count >= 1:
        risk_score += 0.10

    # Limitar a 1.0
    risk_score = min(risk_score, 1.0)

    # ── Determinar nivel de riesgo (semáforo) ──
    if risk_score >= 0.6:
        risk_level = "red"
    elif risk_score >= 0.3:
        risk_level = "yellow"
    else:
        risk_level = "green"

    # ── Determinar si es estafa ──
    is_scam = risk_score >= 0.5

    # ── Tipo de estafa principal ──
    scam_type = scam_types[0] if scam_types else None

    # ── Explicación ──
    explanation_parts = []

    if risk_level == "green":
        explanation_parts.append("No se encontraron suficientes características sospechosas en el mensaje.")
    else:
        if shortened_links:
            explanation_parts.append(f"Se detectaron enlaces acortados o sospechosos: {', '.join(shortened_links)}.")
        if urgent_words:
            explanation_parts.append(f"El mensaje usa lenguaje de urgencia: {', '.join(urgent_words[:3])}.")
        if personal_info:
            explanation_parts.append("El mensaje solicita información personal o financiera.")
        if scam_types:
            explanation_parts.append(f"Patrones detectados de: {', '.join(scam_types)}.")
        if similar_count > 0:
            explanation_parts.append(f"Se encontraron {similar_count} reporte(s) similar(es) en la base de datos.")

    explanation = " ".join(explanation_parts) if explanation_parts else "Análisis completado."

    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "is_scam": is_scam,
        "scam_type": scam_type,
        "explanation": explanation,
        "detected_rules": detected_rules,
        "similar_reports_count": similar_count,
    }