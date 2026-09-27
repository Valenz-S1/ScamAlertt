import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.report import Report
from app.models.analysis import Analysis
from app.schemas.report import ReportCreate, ReportConfirm, ReportOut

router = APIRouter(prefix="/reports", tags=["Reportes"])


# ── CREAR REPORTE ──
@router.post("/", response_model=ReportOut, status_code=201)
def create_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea un nuevo reporte de estafa."""
    # Si viene con analysis_id, verificar que exista y sea del usuario
    if report_in.analysis_id:
        analysis = (
            db.query(Analysis)
            .filter(
                Analysis.id == report_in.analysis_id,
                Analysis.user_id == current_user.id,
            )
            .first()
        )
        if not analysis:
            raise HTTPException(status_code=404, detail="Análisis no encontrado")

    report = Report(
        user_id=current_user.id,
        analysis_id=report_in.analysis_id,
        message_text=report_in.message_text,
        scam_type=report_in.scam_type,
        source_type=report_in.source_type,
        sender_info=report_in.sender_info,
        is_confirmed_scam=report_in.is_confirmed_scam,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ── CONFIRMAR SI FUE ESTAFA O NO (retroalimentación) ──
@router.put("/{report_id}/confirm", response_model=ReportOut)
def confirm_report(
    report_id: uuid.UUID,
    confirm_in: ReportConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El usuario confirma si un mensaje fue estafa o no. Mejora el sistema con el tiempo."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    report.is_confirmed_scam = confirm_in.is_confirmed_scam
    db.commit()
    db.refresh(report)
    return report


# ── LISTAR REPORTES DEL USUARIO ──
@router.get("/", response_model=list[ReportOut])
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista los reportes del usuario actual."""
    reports = (
        db.query(Report)
        .filter(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return reports


# ── OBTENER UN REPORTE ESPECÍFICO ──
@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene un reporte específico."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return report