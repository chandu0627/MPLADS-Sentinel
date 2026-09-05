from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database.database import initialize_database
from .routes.datasets import router as datasets_router
from .routes.projects import router as projects_router
from .routes.risk import router as risk_router


initialize_database()

app = FastAPI(
    title="MPLADS Sentinel API",
    description="AI-powered Public Fund Risk & Anomaly Intelligence System",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(datasets_router)
app.include_router(risk_router)


@app.get("/")
def home():
    return {
        "message": "MPLADS Sentinel API is running!"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
