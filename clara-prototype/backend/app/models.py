"""SQLAlchemy ORM models for CLARA database schema."""

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class User(Base):
    """Users for authentication (Phase 2)."""
    __tablename__ = "users"

    user_id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # 'doctor', 'admin', 'patient'
    created_at = Column(String, nullable=False)  # ISO 8601
    updated_at = Column(String, nullable=False)  # ISO 8601

    __table_args__ = (
        Index("idx_users_email", "email"),
    )

    def __repr__(self):
        return f"<User(user_id={self.user_id}, email={self.email}, role={self.role})>"


class Patient(Base):
    """Patient demographics and metadata."""
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    birth_year = Column(Integer, nullable=False)
    sex = Column(String(1), nullable=False)  # 'M' or 'F'
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    encounters = relationship("Encounter", back_populates="patient", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    labs = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="patient", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")
    admissions = relationship("Admission", back_populates="patient", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Patient(patient_id={self.patient_id}, display_name={self.display_name})>"


class Encounter(Base):
    """Clinical encounters (clinic visits, ER, inpatient, etc.)."""
    __tablename__ = "encounters"

    encounter_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_date = Column(String, nullable=False)  # ISO 8601
    encounter_type = Column(String, nullable=False)  # 'clinic', 'ER', 'inpatient'
    encounter_status = Column(String, nullable=False, default="completed")  # 'active', 'completed', 'cancelled'
    summary = Column(String, nullable=True)  # Brief clinical summary (no diagnoses)
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    medications = relationship("Medication", back_populates="encounter", cascade="all, delete-orphan")
    labs = relationship("LabResult", back_populates="encounter", cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="encounter", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="encounter", cascade="all, delete-orphan")

    # Index for efficient timeline queries
    __table_args__ = (
        Index("idx_patient_date", "patient_id", "encounter_date"),
    )

    def __repr__(self):
        return f"<Encounter(encounter_id={self.encounter_id}, encounter_date={self.encounter_date})>"


class Medication(Base):
    """Patient medications (per encounter)."""
    __tablename__ = "medications"

    medication_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_id = Column(String, ForeignKey("encounters.encounter_id"), nullable=False)
    medication_name = Column(String, nullable=False)
    dose_text = Column(String, nullable=False)  # e.g., "10 mg daily"
    status = Column(String, nullable=False)  # 'active', 'completed', 'discontinued'
    recorded_date = Column(String, nullable=False)  # ISO 8601
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="medications")
    encounter = relationship("Encounter", back_populates="medications")

    # Index for efficient status queries
    __table_args__ = (
        Index("idx_patient_status", "patient_id", "status"),
    )

    def __repr__(self):
        return f"<Medication(medication_id={self.medication_id}, medication_name={self.medication_name})>"


class LabResult(Base):
    """Lab test results (per encounter)."""
    __tablename__ = "lab_results"

    lab_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_id = Column(String, ForeignKey("encounters.encounter_id"), nullable=False)
    test_name = Column(String, nullable=False)  # e.g., 'HbA1c', 'glucose'
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # e.g., '%', 'mg/dL'
    reference_range_text = Column(String, nullable=True)  # e.g., '4.0-6.0'
    recorded_date = Column(String, nullable=False)  # ISO 8601
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="labs")
    encounter = relationship("Encounter", back_populates="labs")

    # Indexes for efficient trend queries
    __table_args__ = (
        Index("idx_patient_test_date", "patient_id", "test_name", "recorded_date"),
        Index("idx_encounter", "encounter_id"),
    )

    def __repr__(self):
        return f"<LabResult(lab_id={self.lab_id}, test_name={self.test_name}, value={self.value})>"


class Diagnosis(Base):
    """Diagnosis history (NEW)."""
    __tablename__ = "diagnoses"

    diagnosis_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_id = Column(String, ForeignKey("encounters.encounter_id"), nullable=False)
    icd10_code = Column(String, nullable=True)  # e.g., 'E11', 'E11.22'
    description = Column(String, nullable=False)  # e.g., 'Type 2 Diabetes Mellitus'
    recorded_date = Column(String, nullable=False)  # ISO 8601
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="diagnoses")
    encounter = relationship("Encounter", back_populates="diagnoses")

    # Index for efficient queries
    __table_args__ = (
        Index("idx_diagnoses_patient_date", "patient_id", "recorded_date"),
    )

    def __repr__(self):
        return f"<Diagnosis(diagnosis_id={self.diagnosis_id}, icd10_code={self.icd10_code})>"


class Procedure(Base):
    """Clinical procedures (NEW)."""
    __tablename__ = "procedures"

    procedure_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_id = Column(String, ForeignKey("encounters.encounter_id"), nullable=False)
    procedure_code = Column(String, nullable=True)  # CPT or ICD-10-PCS
    description = Column(String, nullable=False)
    procedure_date = Column(String, nullable=False)  # ISO 8601
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="procedures")
    encounter = relationship("Encounter", back_populates="procedures")

    # Index for efficient queries
    __table_args__ = (
        Index("idx_procedures_patient_date", "patient_id", "procedure_date"),
    )

    def __repr__(self):
        return f"<Procedure(procedure_id={self.procedure_id}, description={self.description})>"


class Admission(Base):
    """Hospital admissions (NEW)."""
    __tablename__ = "admissions"

    admission_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    admission_date = Column(String, nullable=False)  # ISO 8601
    discharge_date = Column(String, nullable=True)  # ISO 8601
    length_of_stay_days = Column(Integer, nullable=True)
    admission_reason = Column(String, nullable=True)
    discharge_summary = Column(String, nullable=True)
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="admissions")

    # Index for efficient queries
    __table_args__ = (
        Index("idx_admissions_patient_date", "patient_id", "admission_date"),
    )

    def __repr__(self):
        return f"<Admission(admission_id={self.admission_id}, admission_date={self.admission_date})>"
