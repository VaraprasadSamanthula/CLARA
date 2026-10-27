"""FastAPI main application."""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import init_db, get_db
from app.services.summary import check_ollama_available
from app.schemas import HealthCheckResponse
from app.routers import patients, timeline, labs, summary

# Initialize app
app = FastAPI(
    title="CLARA Prototype 1",
    description="Clinical Longitudinal Analysis and Retrieval Assistant",
    version="0.1.0",
)

# CORS for frontend (localhost during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()


# Include routers
app.include_router(patients.router)
app.include_router(timeline.router)
app.include_router(labs.router)
app.include_router(summary.router)


# Health check endpoint
@app.get("/health", response_model=HealthCheckResponse)
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    try:
        db_connected = True
    except Exception:
        db_connected = False

    ollama_available = check_ollama_available()

    return {
        "status": "ok",
        "version": "0.1.0",
        "db_connected": db_connected,
        "ollama_available": ollama_available,
    }


@app.get("/")
def read_root():
    """Root endpoint."""
    return {
        "message": "CLARA Prototype 1 API",
        "docs": "/docs",
        "health": "/health",
    }
