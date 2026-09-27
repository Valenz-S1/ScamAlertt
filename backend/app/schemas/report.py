import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Crear reporte ──
class ReportCreate(BaseModel):
    message_text: str = Field(min_length=1)
    scam_type: str | None = None
    source_type: str | None = Field(default=None, pattern="^(whatsapp|sms|email|other)$")
    sender_info: str | None = None
    is_confirmed_scam: bool | None = None
    analysis_id: uuid.UUID | None = None  # si viene de un análisis


# ── Confirmar si fue estafa o no (retroalimentación del usuario) ──
class ReportConfirm(BaseModel):
    is_confirmed_scam: bool


# ── Respuesta ──
class ReportOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    analysis_id: uuid.UUID | None
    message_text: str
    scam_type: str | None
    source_type: str | None
    sender_info: str | None
    is_confirmed_scam: bool | None
    created_at: datetime

    model_config = {"from_attributes": True}