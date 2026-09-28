import os
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy import func

from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.models.analysis import Analysis
from app.schemas.analysis import AnalysisOut
from app.services.analysis_service import analyze_message
from app.services.ocr_service import extract_text_from_image
from app.services.claude_service import analyze_with_claude

router = APIRouter(prefix="/analysis", tags=["Análisis"])

# Directorio donde se guardan las imágenes subidas
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── ANALIZAR TEXTO ──
@router.post("/text", response_model=AnalysisOut)
def analyze_text(
    input_text: str = Form(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analiza un mensaje de texto para detectar estafa."""
    # 1. Análisis por reglas
    result = analyze_message(input_text, db)

    # 2. Stub de Claude (no hace nada aún)
    claude_result = analyze_with_claude(input_text)

    # 3. Guardar análisis en la BD
    analysis = Analysis(
        user_id=current_user.id,
        input_type="text",
        input_text=input_text,
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        is_scam=result["is_scam"],
        scam_type=result["scam_type"],
        explanation=result["explanation"],
        detected_rules=result["detected_rules"],
        similar_reports_count=result["similar_reports_count"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


# ── ANALIZAR IMAGEN ──
@router.post("/image", response_model=AnalysisOut)
async def analyze_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recibe una imagen, extrae texto con OCR y lo analiza."""
    # Validar que sea una imagen
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
        "image/bmp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: {file.content_type}. Use JPEG, PNG, WEBP o BMP.",
        )

    # Guardar la imagen
    file_extension = file.filename.split(".")[-1] if file.filename else "png"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # OCR: extraer texto de la imagen
    try:
        ocr_text = extract_text_from_image(file_path, lang="spa")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la imagen con OCR: {str(e)}",
        )

    if not ocr_text:
        raise HTTPException(
            status_code=400,
            detail="No se pudo extraer texto de la imagen. Intente con una imagen más clara.",
        )

    # Analizar el texto extraído
    result = analyze_message(ocr_text, db)

    # Stub de Claude
    claude_result = analyze_with_claude(ocr_text)

    # Guardar análisis en la BD
    image_url = f"/uploads/{unique_filename}"

    analysis = Analysis(
        user_id=current_user.id,
        input_type="image",
        input_text=ocr_text,
        image_url=image_url,
        ocr_extracted_text=ocr_text,
        risk_level=result["risk_level"],
        risk_score=result["risk_score"],
        is_scam=result["is_scam"],
        scam_type=result["scam_type"],
        explanation=result["explanation"],
        detected_rules=result["detected_rules"],
        similar_reports_count=result["similar_reports_count"],
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


# ── HISTORIAL DE ANÁLISIS DEL USUARIO (con filtros) ──
@router.get("/history", response_model=list[AnalysisOut])
def get_analysis_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    risk_level: Optional[str] = Query(
        None,
        pattern="^(green|yellow|red)$",
    ),
    date: Optional[date_type] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Historial del usuario. Filtros opcionales: nivel de riesgo y fecha (YYYY-MM-DD)."""
    q = db.query(Analysis).filter(
        Analysis.user_id == current_user.id
    )

    if risk_level:
        q = q.filter(Analysis.risk_level == risk_level)

    if date:
        q = q.filter(func.date(Analysis.created_at) == date)

    analyses = (
        q.order_by(Analysis.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return analyses


# ── ESTADÍSTICAS DEL USUARIO (total histórico) ──
@router.get("/stats")
def get_analysis_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Total histórico de análisis del usuario, por nivel de riesgo."""
    rows = (
        db.query(Analysis.risk_level, func.count(Analysis.id))
        .filter(Analysis.user_id == current_user.id)
        .group_by(Analysis.risk_level)
        .all()
    )

    counts = {level: count for level, count in rows}

    return {
        "total": sum(counts.values()),
        "safe": counts.get("green", 0),
        "suspicious": counts.get("yellow", 0),
        "danger": counts.get("red", 0),
    }


# ── OBTENER UN ANÁLISIS ESPECÍFICO ──
@router.get("/{analysis_id}", response_model=AnalysisOut)
def get_analysis(
    analysis_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve un análisis específico del usuario."""
    analysis = (
        db.query(Analysis)
        .filter(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Análisis no encontrado",
        )

    return analysis
