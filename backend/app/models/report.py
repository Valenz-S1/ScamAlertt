import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis.id", ondelete="SET NULL"), nullable=True
    )

    # Datos del reporte
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    scam_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "whatsapp", "sms", "email", "other"
    sender_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_confirmed_scam: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    user: Mapped["User"] = relationship(back_populates="reports")
    analysis: Mapped["Analysis | None"] = relationship(back_populates="reports")