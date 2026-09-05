from fastapi import FastAPI

from .database.database import initialize_database
from .routes.datasets import router as datasets_router
from .routes.projects import router as projects_router


initialize_database()

app = FastAPI(
    title="MPLADS Sentinel API",
    description="AI-powered Public Fund Risk & Anomaly Intelligence System",
    version="1.0"
)

app.include_router(projects_router)
app.include_router(datasets_router)


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