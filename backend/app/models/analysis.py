import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Analysis(Base):
    __tablename__ = "analysis"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Entrada del usuario
    input_type: Mapped[str] = mapped_column(String(10), nullable=False)  # "text" o "image"
    input_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ocr_extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Resultado del análisis
    risk_level: Mapped[str] = mapped_column(String(10), nullable=False)  # "green", "yellow", "red"
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0 a 1.0
    is_scam: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    scam_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_rules: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    similar_reports_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    user: Mapped["User"] = relationship(back_populates="analysis")
    reports: Mapped[list["Report"]] = relationship(back_populates="analysis")