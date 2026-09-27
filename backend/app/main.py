from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ScamAlert API",
    description="API para detección y prevención de estafas digitales",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Aquí se incluirán los routers, por ejemplo:
# from app.api import analyze
# app.include_router(analyze.router, prefix="/analyze", tags=["analyze"])
