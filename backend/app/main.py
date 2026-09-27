from fastapi import FastAPI

from app.core.config import settings
from app.db.database import engine, Base
from app.models import User, Analysis, Report  # noqa: F401

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)


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