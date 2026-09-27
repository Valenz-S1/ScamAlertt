import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Crear análisis (entrada del usuario) ──
class AnalysisCreate(BaseModel):
    input_type: str = Field(pattern="^(text|image)$")  # "text" o "image"
    input_text: str | None = None  # texto del mensaje
    image_url: str | None = None   # URL de la imagen (si subió captura)


# ── Resultado del análisis (lo que guarda el backend) ──
class AnalysisResult(BaseModel):
    risk_level: str = Field(pattern="^(green|yellow|red)$")
    risk_score: float | None = Field(default=None, ge=0.0, le=1.0)
    is_scam: bool | None = None
    scam_type: str | None = None
    explanation: str | None = None
    detected_rules: dict | None = None
    similar_reports_count: int = 0
    ocr_extracted_text: str | None = None


# ── Respuesta (lo que se devuelve al frontend) ──
class AnalysisOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    input_type: str
    input_text: str | None
    image_url: str | None
    ocr_extracted_text: str | None
    risk_level: str
    risk_score: float | None
    is_scam: bool | None
    scam_type: str | None
    explanation: str | None
    detected_rules: dict | None
    similar_reports_count: int
    created_at: datetime

    model_config = {"from_attributes": True}