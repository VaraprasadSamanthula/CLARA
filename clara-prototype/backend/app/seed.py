"""Seed script: populate database with synthetic data."""

from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session
from app.database import SessionLocal, init_db, drop_all_tables
from app.models import Patient, Encounter, Medication, LabResult


def generate_iso_date(year: int, month: int, day: int) -> str:
    """Generate ISO 8601 date string."""
    return datetime(year, month, day).isoformat()


def seed_database():
    """Create and populate database with 3+ synthetic patients."""
    
    # Drop and recreate tables
    drop_all_tables()
    init_db()
    
    db = SessionLocal()
    
    try:
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
            summary="Annual diabetes check. BP controlled.",
            created_at=generate_iso_date(2024, 10, 15),
        )
        enc2_alice = Encounter(
            encounter_id="ENC002",
            patient_id="PAT001",
            encounter_date=generate_iso_date(2025, 4, 20),
            encounter_type="clinic",
            summary="Follow-up diabetes visit. Weight stable.",
            created_at=generate_iso_date(2025, 4, 20),
        )
        enc3_alice = Encounter(
            encounter_id="ENC003",
            patient_id="PAT001",
            encounter_date=generate_iso_date(2025, 10, 15),
            encounter_type="clinic",
            summary="Annual diabetes check. Continue current regimen.",
            created_at=generate_iso_date(2025, 10, 15),
        )
        db.add_all([enc1_alice, enc2_alice, enc3_alice])

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
        db.add_all([med1_alice, med2_alice])

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
            summary="Hypertension management. BP elevated.",
            created_at=generate_iso_date(2025, 8, 10),
        )
        enc2_bob = Encounter(
            encounter_id="ENC005",
            patient_id="PAT002",
            encounter_date=generate_iso_date(2025, 10, 12),
            encounter_type="clinic",
            summary="Follow-up hypertension. Medication adjusted.",
            created_at=generate_iso_date(2025, 10, 12),
        )
        db.add_all([enc1_bob, enc2_bob])

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
            summary="General health check. No acute concerns.",
            created_at=generate_iso_date(2025, 9, 5),
        )
        db.add(enc1_carol)

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
        print("✓ Database seeded successfully with 3 synthetic patients")
        print("  - PAT001: Alice Smith (3 HbA1c values, diabetes focus)")
        print("  - PAT002: Bob Johnson (hypertension)")
        print("  - PAT003: Carol Davis (general health)")

    except Exception as e:
        db.rollback()
        print(f"✗ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
