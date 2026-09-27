"""
Servicio de Claude API — STUB

Por ahora solo devuelve un placeholder.
Cuando se integre la API de Claude, este servicio enviará el texto
a Anthropic y devolverá el análisis con IA.
"""


def analyze_with_claude(text: str) -> dict:
    """
    Stub: análisis con Claude API.
    TODO: Implementar llamada real a la API de Anthropic.
    
    Args:
        text: Texto del mensaje a analizar.
    
    Returns:
        Diccionario con resultado del análisis IA.
    """
    return {
        "claude_analysis": None,
        "message": "Claude API no integrada aún. Usando solo reglas.",
    }