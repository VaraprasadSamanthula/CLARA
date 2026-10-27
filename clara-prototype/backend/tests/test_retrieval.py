"""Unit tests for retrieval service."""

import pytest
from app.services.retrieval import PatientService, TimelineService, LabService, SummaryService


class TestPatientService:
    """Tests for PatientService."""

    def test_get_all_patients(self, seed_test_data):
        """Test retrieving all patients."""
        db = seed_test_data
        patients, total = PatientService.get_all_patients(db)
        assert total == 2
        assert len(patients) == 2
        assert patients[0]["patient_id"] == "TEST001"
        assert patients[0]["display_name"] == "Test Patient 1"
        assert patients[0]["encounter_count"] == 2

    def test_get_patient_by_id(self, seed_test_data):
        """Test retrieving patient by ID."""
        db = seed_test_data
        patient = PatientService.get_patient_by_id(db, "TEST001")
        assert patient is not None
        assert patient.display_name == "Test Patient 1"
        assert patient.birth_year == 1970

    def test_get_patient_by_id_not_found(self, seed_test_data):
        """Test retrieving non-existent patient returns None."""
        db = seed_test_data
        patient = PatientService.get_patient_by_id(db, "NONEXISTENT")
        assert patient is None

    def test_get_patient_detail(self, seed_test_data):
        """Test retrieving patient detail with related data."""
        db = seed_test_data
        detail = PatientService.get_patient_detail(db, "TEST001")
        assert detail is not None
        assert detail["patient"].patient_id == "TEST001"
        assert len(detail["recent_encounters"]) == 2
        assert len(detail["active_medications"]) == 1
        assert len(detail["recent_labs"]) == 2

    def test_get_patient_detail_not_found(self, seed_test_data):
        """Test retrieving detail for non-existent patient."""
        db = seed_test_data
        detail = PatientService.get_patient_detail(db, "NONEXISTENT")
        assert detail is None

    def test_get_patient_age(self):
        """Test age calculation."""
        age = PatientService.get_patient_age(1970)
        from datetime import datetime
        expected_age = datetime.now().year - 1970
        assert age == expected_age


class TestTimelineService:
    """Tests for TimelineService."""

    def test_get_timeline(self, seed_test_data):
        """Test retrieving patient timeline."""
        db = seed_test_data
        timeline = TimelineService.get_timeline(db, "TEST001")
        assert timeline is not None
        assert timeline["patient_id"] == "TEST001"
        assert len(timeline["timeline"]) == 2
        # Should be ordered newest first
        assert timeline["timeline"][0]["encounter_date"] == "2024-11-15"

    def test_get_timeline_not_found(self, seed_test_data):
        """Test retrieving timeline for non-existent patient."""
        db = seed_test_data
        timeline = TimelineService.get_timeline(db, "NONEXISTENT")
        assert timeline is None

    def test_get_timeline_with_date_filter(self, seed_test_data):
        """Test timeline filtering by date range."""
        db = seed_test_data
        timeline = TimelineService.get_timeline(
            db, "TEST001", start_date="2024-11-01"
        )
        assert timeline is not None
        assert len(timeline["timeline"]) == 1
        assert timeline["timeline"][0]["encounter_date"] == "2024-11-15"

    def test_get_timeline_with_encounter_type_filter(self, seed_test_data):
        """Test timeline filtering by encounter type."""
        db = seed_test_data
        timeline = TimelineService.get_timeline(
            db, "TEST001", encounter_type="clinic"
        )
        assert len(timeline["timeline"]) == 2


class TestLabService:
    """Tests for LabService."""

    def test_get_lab_trend(self, seed_test_data):
        """Test retrieving lab trend."""
        db = seed_test_data
        result = LabService.get_lab_trend(db, "TEST001", "HbA1c")
        assert result is not None
        assert result["test_name"] == "HbA1c"
        assert result["unit"] == "%"
        assert len(result["values"]) == 2
        # Should be sorted by date
        assert result["values"][0]["value"] == 6.5
        assert result["values"][1]["value"] == 6.8

    def test_get_lab_trend_not_found(self, seed_test_data):
        """Test retrieving non-existent lab trend."""
        db = seed_test_data
        result = LabService.get_lab_trend(db, "TEST001", "NONEXISTENT_TEST")
        assert result is None

    def test_get_lab_trend_patient_not_found(self, seed_test_data):
        """Test lab trend for non-existent patient."""
        db = seed_test_data
        result = LabService.get_lab_trend(db, "NONEXISTENT", "HbA1c")
        assert result is None


class TestSummaryService:
    """Tests for SummaryService."""

    def test_get_summary_context(self, seed_test_data):
        """Test retrieving summary context."""
        db = seed_test_data
        context = SummaryService.get_summary_context(db, "TEST001")
        assert context is not None
        assert context["patient_id"] == "TEST001"
        assert context["patient_name"] == "Test Patient 1"
        assert len(context["encounters"]) == 2
        assert len(context["medications"]) == 1
        assert len(context["labs"]) == 2

    def test_get_summary_context_not_found(self, seed_test_data):
        """Test summary context for non-existent patient."""
        db = seed_test_data
        context = SummaryService.get_summary_context(db, "NONEXISTENT")
        assert context is None

    def test_get_evidence_references(self, seed_test_data):
        """Test extracting evidence references."""
        db = seed_test_data
        context = SummaryService.get_summary_context(db, "TEST001")
        evidence = SummaryService.get_evidence_references(context)
        assert len(evidence["encounters"]) == 2
        assert len(evidence["medications"]) == 1
        assert len(evidence["labs"]) == 2
        assert "start" in evidence["date_range"]
        assert "end" in evidence["date_range"]
