from fastapi import FastAPI

app = FastAPI(
    title="MPLADS Sentinel API",
    description="AI-powered Public Fund Risk & Anomaly Intelligence System",
    version="1.0"
)


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