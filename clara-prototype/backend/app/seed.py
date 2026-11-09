"""Seed script: populate database with synthetic data."""

from datetime import datetime, timedelta
import random
import uuid
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, drop_all_tables
from app.models import Patient, Encounter, Medication, LabResult, Diagnosis, Procedure, Admission, User

# Password hashing
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def generate_iso_date(year: int, month: int, day: int) -> str:
    """Generate ISO 8601 date string."""
    return datetime(year, month, day).isoformat()


def hash_password(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)


def seed_database():
    """Create and populate database with 3+ synthetic patients + demo user."""
    
    # Drop and recreate tables
    drop_all_tables()
    init_db()
    
    db = SessionLocal()
    
    try:
        # ===== DEMO USER (for JWT auth) =====
        demo_user = User(
            user_id=str(uuid.uuid4()),
            email="doctor@clara.local",
            password_hash=hash_password("demo123"),
            role="doctor",
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
        )
        db.add(demo_user)
        print("[OK] Demo user created: doctor@clara.local / demo123")

        # ===== Patient 1: Alice Smith (diabetes focus, 3+ HbA1c values) =====
        patient1 = Patient(
            patient_id="PAT001",
            display_name="Alice Smith",
            birth_year=1965,
            sex="F",
            created_at=generate_iso_date(2024, 1, 1),
        )
        db.add(patient1)

        # Encounters for Alice (3 encounters, spaced ~6 months)
        enc1_alice = Encounter(
            encounter_id="ENC001",
            patient_id="PAT001",
            encounter_date=generate_iso_date(2024, 10, 15),
            encounter_type="clinic",
            encounter_status="completed",
            summary="Annual diabetes check. BP controlled.",
            created_at=generate_iso_date(2024, 10, 15),
        )
        enc2_alice = Encounter(
            encounter_id="ENC002",
            patient_id="PAT001",
            encounter_date=generate_iso_date(2025, 4, 20),
            encounter_type="clinic",
            encounter_status="completed",
            summary="Follow-up diabetes visit. Weight stable.",
            created_at=generate_iso_date(2025, 4, 20),
        )
        enc3_alice = Encounter(
            encounter_id="ENC003",
            patient_id="PAT001",
            encounter_date=generate_iso_date(2025, 10, 15),
            encounter_type="clinic",
            encounter_status="completed",
            summary="Annual diabetes check. Continue current regimen.",
            created_at=generate_iso_date(2025, 10, 15),
        )
        db.add_all([enc1_alice, enc2_alice, enc3_alice])

        # Diagnoses for Alice
        diag1_alice = Diagnosis(
            diagnosis_id=str(uuid.uuid4()),
            patient_id="PAT001",
            encounter_id="ENC001",
            icd10_code="E11",
            description="Type 2 Diabetes Mellitus",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        diag2_alice = Diagnosis(
            diagnosis_id=str(uuid.uuid4()),
            patient_id="PAT001",
            encounter_id="ENC001",
            icd10_code="I10",
            description="Essential (primary) hypertension",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        db.add_all([diag1_alice, diag2_alice])

        # Medications for Alice (all active)
        med1_alice = Medication(
            medication_id="MED001",
            patient_id="PAT001",
            encounter_id="ENC001",
            medication_name="Metformin",
            dose_text="500 mg twice daily",
            status="active",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        med2_alice = Medication(
            medication_id="MED002",
            patient_id="PAT001",
            encounter_id="ENC001",
            medication_name="Lisinopril",
            dose_text="10 mg once daily",
            status="active",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        med3_alice = Medication(
            medication_id="MED006",
            patient_id="PAT001",
            encounter_id="ENC001",
            medication_name="Aspirin",
            dose_text="81 mg once daily",
            status="active",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        db.add_all([med1_alice, med2_alice, med3_alice])

        # HbA1c labs for Alice (3 values showing trend)
        lab1_alice = LabResult(
            lab_id="LAB001",
            patient_id="PAT001",
            encounter_id="ENC001",
            test_name="HbA1c",
            value=6.5,
            unit="%",
            reference_range_text="4.0-6.0",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        lab2_alice = LabResult(
            lab_id="LAB002",
            patient_id="PAT001",
            encounter_id="ENC002",
            test_name="HbA1c",
            value=6.8,
            unit="%",
            reference_range_text="4.0-6.0",
            recorded_date=generate_iso_date(2025, 4, 20),
            created_at=generate_iso_date(2025, 4, 20),
        )
        lab3_alice = LabResult(
            lab_id="LAB003",
            patient_id="PAT001",
            encounter_id="ENC003",
            test_name="HbA1c",
            value=6.8,
            unit="%",
            reference_range_text="4.0-6.0",
            recorded_date=generate_iso_date(2025, 10, 15),
            created_at=generate_iso_date(2025, 10, 15),
        )
        
        # Additional labs for Alice
        lab4_alice = LabResult(
            lab_id="LAB004",
            patient_id="PAT001",
            encounter_id="ENC001",
            test_name="glucose",
            value=145.0,
            unit="mg/dL",
            reference_range_text="70-100",
            recorded_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        lab5_alice = LabResult(
            lab_id="LAB005",
            patient_id="PAT001",
            encounter_id="ENC003",
            test_name="glucose",
            value=150.0,
            unit="mg/dL",
            reference_range_text="70-100",
            recorded_date=generate_iso_date(2025, 10, 15),
            created_at=generate_iso_date(2025, 10, 15),
        )
        db.add_all([lab1_alice, lab2_alice, lab3_alice, lab4_alice, lab5_alice])

        # Procedures for Alice
        proc1_alice = Procedure(
            procedure_id=str(uuid.uuid4()),
            patient_id="PAT001",
            encounter_id="ENC001",
            procedure_code="99213",
            description="Office visit for established patient - low complexity",
            procedure_date=generate_iso_date(2024, 10, 15),
            created_at=generate_iso_date(2024, 10, 15),
        )
        db.add(proc1_alice)

        # ===== Patient 2: Bob Johnson (hypertension focus) =====
        patient2 = Patient(
            patient_id="PAT002",
            display_name="Bob Johnson",
            birth_year=1958,
            sex="M",
            created_at=generate_iso_date(2024, 2, 1),
        )
        db.add(patient2)

        # Encounters for Bob
        enc1_bob = Encounter(
            encounter_id="ENC004",
            patient_id="PAT002",
            encounter_date=generate_iso_date(2025, 8, 10),
            encounter_type="clinic",
            encounter_status="completed",
            summary="Hypertension management. BP elevated.",
            created_at=generate_iso_date(2025, 8, 10),
        )
        enc2_bob = Encounter(
            encounter_id="ENC005",
            patient_id="PAT002",
            encounter_date=generate_iso_date(2025, 10, 12),
            encounter_type="clinic",
            encounter_status="completed",
            summary="Follow-up hypertension. Medication adjusted.",
            created_at=generate_iso_date(2025, 10, 12),
        )
        db.add_all([enc1_bob, enc2_bob])

        # Diagnoses for Bob
        diag1_bob = Diagnosis(
            diagnosis_id=str(uuid.uuid4()),
            patient_id="PAT002",
            encounter_id="ENC004",
            icd10_code="I10",
            description="Essential (primary) hypertension",
            recorded_date=generate_iso_date(2025, 8, 10),
            created_at=generate_iso_date(2025, 8, 10),
        )
        db.add(diag1_bob)

        # Medications for Bob
        med1_bob = Medication(
            medication_id="MED003",
            patient_id="PAT002",
            encounter_id="ENC004",
            medication_name="Amlodipine",
            dose_text="5 mg once daily",
            status="active",
            recorded_date=generate_iso_date(2025, 8, 10),
            created_at=generate_iso_date(2025, 8, 10),
        )
        med2_bob = Medication(
            medication_id="MED004",
            patient_id="PAT002",
            encounter_id="ENC005",
            medication_name="Hydrochlorothiazide",
            dose_text="25 mg once daily",
            status="active",
            recorded_date=generate_iso_date(2025, 10, 12),
            created_at=generate_iso_date(2025, 10, 12),
        )
        db.add_all([med1_bob, med2_bob])

        # Labs for Bob
        lab1_bob = LabResult(
            lab_id="LAB006",
            patient_id="PAT002",
            encounter_id="ENC004",
            test_name="blood_pressure_systolic",
            value=155.0,
            unit="mmHg",
            reference_range_text="<120",
            recorded_date=generate_iso_date(2025, 8, 10),
            created_at=generate_iso_date(2025, 8, 10),
        )
        lab2_bob = LabResult(
            lab_id="LAB007",
            patient_id="PAT002",
            encounter_id="ENC005",
            test_name="blood_pressure_systolic",
            value=145.0,
            unit="mmHg",
            reference_range_text="<120",
            recorded_date=generate_iso_date(2025, 10, 12),
            created_at=generate_iso_date(2025, 10, 12),
        )
        db.add_all([lab1_bob, lab2_bob])

        # Admission for Bob
        adm1_bob = Admission(
            admission_id=str(uuid.uuid4()),
            patient_id="PAT002",
            admission_date=generate_iso_date(2025, 7, 1),
            discharge_date=generate_iso_date(2025, 7, 5),
            length_of_stay_days=4,
            admission_reason="Hypertensive crisis",
            discharge_summary="Admitted with BP 180/110. Stabilized on IV antihypertensives. Discharged on oral regimen.",
            created_at=generate_iso_date(2025, 7, 1),
        )
        db.add(adm1_bob)

        # ===== Patient 3: Carol Davis (general follow-up) =====
        patient3 = Patient(
            patient_id="PAT003",
            display_name="Carol Davis",
            birth_year=1972,
            sex="F",
            created_at=generate_iso_date(2024, 3, 1),
        )
        db.add(patient3)

        # Encounters for Carol
        enc1_carol = Encounter(
            encounter_id="ENC006",
            patient_id="PAT003",
            encounter_date=generate_iso_date(2025, 9, 5),
            encounter_type="clinic",
            encounter_status="completed",
            summary="General health check. No acute concerns.",
            created_at=generate_iso_date(2025, 9, 5),
        )
        db.add(enc1_carol)

        # Diagnoses for Carol
        diag1_carol = Diagnosis(
            diagnosis_id=str(uuid.uuid4()),
            patient_id="PAT003",
            encounter_id="ENC006",
            icd10_code="E78",
            description="Dyslipidemia",
            recorded_date=generate_iso_date(2025, 9, 5),
            created_at=generate_iso_date(2025, 9, 5),
        )
        db.add(diag1_carol)

        # Medications for Carol
        med1_carol = Medication(
            medication_id="MED005",
            patient_id="PAT003",
            encounter_id="ENC006",
            medication_name="Atorvastatin",
            dose_text="20 mg once daily",
            status="active",
            recorded_date=generate_iso_date(2025, 9, 5),
            created_at=generate_iso_date(2025, 9, 5),
        )
        db.add(med1_carol)

        # Labs for Carol
        lab1_carol = LabResult(
            lab_id="LAB008",
            patient_id="PAT003",
            encounter_id="ENC006",
            test_name="cholesterol",
            value=195.0,
            unit="mg/dL",
            reference_range_text="<200",
            recorded_date=generate_iso_date(2025, 9, 5),
            created_at=generate_iso_date(2025, 9, 5),
        )
        db.add(lab1_carol)

        # Commit all changes
        db.commit()
        print("\n[OK] Database seeded successfully:")
        print("  Patients:")
        print("    - PAT001: Alice Smith (3 HbA1c values, diabetes focus)")
        print("    - PAT002: Bob Johnson (hypertension, 1 admission)")
        print("    - PAT003: Carol Davis (dyslipidemia)")
        print("  Auth:")
        print("    - doctor@clara.local / demo123")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

