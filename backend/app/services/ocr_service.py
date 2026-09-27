"""
Servicio de OCR: extrae texto de una imagen (captura de pantalla)
usando Tesseract. Si luego se prefiere Google Cloud Vision,
este es el único archivo que habría que cambiar.
"""

from io import BytesIO
from PIL import Image
import pytesseract


def extraer_texto(imagen_bytes: bytes, idioma: str = "spa") -> str:
    imagen = Image.open(BytesIO(imagen_bytes))
    texto = pytesseract.image_to_string(imagen, lang=idioma)
    return texto.strip()
