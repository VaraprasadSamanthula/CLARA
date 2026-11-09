"""FastAPI main application."""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy.orm import Session
from app.database import init_db, get_db
from app.services.llm import get_or_create_llm_provider
from app.schemas import HealthCheckResponse
from app.routers import patients, timeline, labs, summary, auth
from config import settings

# Initialize app
app = FastAPI(
    title="CLARA Prototype 1",
    description="Clinical Longitudinal Analysis and Retrieval Assistant",
    version="0.1.0",
    debug=settings.debug,
)

# Security middleware: Trusted hosts (prevents host header injection)
if settings.is_production:
    # In production, only allow known hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["clara.example.com", "*.onrender.com"]
    )

# CORS middleware - use settings from config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()


# Include routers
app.include_router(auth.router)
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

    # Check LLM provider
    try:
        llm_provider = get_or_create_llm_provider()
        llm_status = llm_provider.test_connection()
    except Exception as e:
        llm_status = {"status": "error", "error": str(e)}

    return {
        "status": "ok",
        "version": "0.1.0",
        "db_connected": db_connected,
        "llm_available": llm_status.get("status") == "ok",
        "llm_provider": llm_status.get("provider", "unknown"),
    }


@app.get("/")
def read_root():
    """Root endpoint."""
    return {
        "message": "CLARA Prototype 1 API",
        "docs": "/docs",
        "health": "/health",
    }
