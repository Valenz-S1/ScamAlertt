"""
Servicio encargado de enviar el mensaje sospechoso a la API de Claude
y devolver una clasificación de riesgo (bajo, medio, alto).
"""

from anthropic import Anthropic
from app.core.config import settings

client = Anthropic(api_key=settings.anthropic_api_key)

SYSTEM_PROMPT = (
    "Eres un asistente que detecta estafas digitales. "
    "Analiza el siguiente mensaje y responde SOLO en JSON con las claves: "
    "'es_sospechoso' (bool), 'tipo_estafa' (string), "
    "'nivel_riesgo' ('bajo' | 'medio' | 'alto'), 'explicacion' (string)."
)


def analizar_mensaje(texto: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": texto}],
    )

    # El contenido puede tener uno o varios bloques; se une el texto
    raw_text = "".join(
        block.text for block in response.content if block.type == "text"
    )

    return {"raw": raw_text}
