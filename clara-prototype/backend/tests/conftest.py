"""Pytest configuration and fixtures."""

import pytest
import sys
from pathlib import Path

# Add parent directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import get_db, Base
from app.models import Patient, Encounter, Medication, LabResult
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="function")
def db():
    """Create a temporary test database (in-memory SQLite)."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db_session = TestingSessionLocal()
    
    yield db_session
    
    db_session.close()


@pytest.fixture(scope="function")
def client(db):
    """Create a FastAPI test client with test database."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def seed_test_data(db):
    """Populate test database with sample data."""
    # Create patients
    pat1 = Patient(
        patient_id="TEST001",
        display_name="Test Patient 1",
        birth_year=1970,
        sex="M",
        created_at="2024-01-01T00:00:00",
    )
    pat2 = Patient(
        patient_id="TEST002",
        display_name="Test Patient 2",
        birth_year=1980,
        sex="F",
        created_at="2024-01-02T00:00:00",
    )
    db.add_all([pat1, pat2])
    db.flush()

    # Create encounters
    enc1 = Encounter(
        encounter_id="TEST_ENC001",
        patient_id="TEST001",
        encounter_date="2024-10-15",
        encounter_type="clinic",
        summary="Test visit 1",
        created_at="2024-10-15T00:00:00",
    )
    enc2 = Encounter(
        encounter_id="TEST_ENC002",
        patient_id="TEST001",
        encounter_date="2024-11-15",
        encounter_type="clinic",
        summary="Test visit 2",
        created_at="2024-11-15T00:00:00",
    )
    db.add_all([enc1, enc2])
    db.flush()

    # Create medications
    med1 = Medication(
        medication_id="TEST_MED001",
        patient_id="TEST001",
        encounter_id="TEST_ENC001",
        medication_name="Test Drug",
        dose_text="10 mg daily",
        status="active",
        recorded_date="2024-10-15",
        created_at="2024-10-15T00:00:00",
    )
    db.add(med1)
    db.flush()

    # Create labs
    lab1 = LabResult(
        lab_id="TEST_LAB001",
        patient_id="TEST001",
        encounter_id="TEST_ENC001",
        test_name="HbA1c",
        value=6.5,
        unit="%",
        reference_range_text="4.0-6.0",
        recorded_date="2024-10-15",
        created_at="2024-10-15T00:00:00",
    )
    lab2 = LabResult(
        lab_id="TEST_LAB002",
        patient_id="TEST001",
        encounter_id="TEST_ENC002",
        test_name="HbA1c",
        value=6.8,
        unit="%",
        reference_range_text="4.0-6.0",
        recorded_date="2024-11-15",
        created_at="2024-11-15T00:00:00",
    )
    db.add_all([lab1, lab2])

    db.commit()
    return db
