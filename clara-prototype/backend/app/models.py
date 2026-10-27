"""SQLAlchemy ORM models for CLARA database schema."""

from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


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

    def __repr__(self):
        return f"<Patient(patient_id={self.patient_id}, display_name={self.display_name})>"


class Encounter(Base):
    """Clinical encounters (clinic visits, ER, inpatient, etc.)."""
    __tablename__ = "encounters"

    encounter_id = Column(String, primary_key=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"), nullable=False)
    encounter_date = Column(String, nullable=False)  # ISO 8601
    encounter_type = Column(String, nullable=False)  # 'clinic', 'ER', 'inpatient'
    summary = Column(String, nullable=True)  # Brief clinical summary (no diagnoses)
    created_at = Column(String, nullable=False)  # ISO 8601

    # Relationships
    patient = relationship("Patient", back_populates="encounters")
    medications = relationship("Medication", back_populates="encounter", cascade="all, delete-orphan")
    labs = relationship("LabResult", back_populates="encounter", cascade="all, delete-orphan")

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
