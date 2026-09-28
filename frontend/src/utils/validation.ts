const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Dominios de correo aceptados — agrega más aquí si lo necesitan
const EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.com.mx",
  "hotmail.com",
  "hotmail.com.mx",
  "hotmail.es",
  "live.com",
  "live.com.mx",
  "yahoo.com",
  "yahoo.com.mx",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "terra.com.mx",
  "prodigy.net.mx",
];

export function validateName(v: string): string | undefined {
  if (!v.trim()) return "El nombre es obligatorio";
  if (/\d/.test(v)) return "El nombre no puede contener números";
  if (!NAME_RE.test(v.trim())) return "El nombre solo puede contener letras";
  return undefined;
}

export function validateEmail(v: string): string | undefined {
  const t = v.trim();
  if (!t) return "El correo es obligatorio";
  if (!EMAIL_RE.test(t)) return "Formato inválido. Ejemplo: nombre@gmail.com";
  const domain = t.split("@")[1]?.toLowerCase() ?? "";
  if (!EMAIL_DOMAINS.includes(domain)) {
    return "Dominio no permitido. Usa gmail, outlook, hotmail, yahoo, icloud...";
  }
  return undefined;
}

export function validatePhone(v: string): string | undefined {
  if (!v) return undefined; // es opcional
  if (v.length !== 10) return "El teléfono debe tener 10 dígitos";
  return undefined;
}
