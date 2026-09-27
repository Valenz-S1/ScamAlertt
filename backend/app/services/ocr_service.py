import os

from PIL import Image
import pytesseract


def extract_text_from_image(image_path: str, lang: str = "spa") -> str:
    """
    Extrae texto de una imagen usando Tesseract OCR.
    
    Args:
        image_path: Ruta absoluta al archivo de imagen.
        lang: Idioma para OCR (por defecto español).
    
    Returns:
        Texto extraído de la imagen.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Imagen no encontrada: {image_path}")

    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image, lang=lang)
        return text.strip()
    except Exception as e:
        raise RuntimeError(f"Error al procesar la imagen con OCR: {e}")