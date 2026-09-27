import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.analysis import router as analysis_router
from app.api.reports import router as reports_router

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# ── CORS (para que el frontend de React Native pueda conectarse) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: restringir orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rutas ──
app.include_router(auth_router)
app.include_router(analysis_router)
app.include_router(reports_router)

# ── Archivos estáticos (imágenes subidas) ──
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}