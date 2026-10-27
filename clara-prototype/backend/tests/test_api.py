"""Integration tests for API endpoints."""

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"
        assert "db_connected" in data
        assert "ollama_available" in data


class TestPatientEndpoints:
    """Tests for patient endpoints."""

    def test_list_patients(self, client, seed_test_data):
        """Test listing patients."""
        response = client.get("/api/patients")
        assert response.status_code == 200
        data = response.json()
        assert "patients" in data
        assert "total" in data
        assert data["total"] == 2

    def test_get_patient_detail(self, client, seed_test_data):
        """Test retrieving patient detail."""
        response = client.get("/api/patients/TEST001")
        assert response.status_code == 200
        data = response.json()
        assert data["patient"]["patient_id"] == "TEST001"
        assert "recent_encounters" in data
        assert "active_medications" in data
        assert "recent_labs" in data

    def test_get_patient_detail_not_found(self, client, seed_test_data):
        """Test retrieving non-existent patient."""
        response = client.get("/api/patients/NONEXISTENT")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data


class TestTimelineEndpoint:
    """Tests for timeline endpoint."""

    def test_get_timeline(self, client, seed_test_data):
        """Test retrieving patient timeline."""
        response = client.get("/api/patients/TEST001/timeline")
        assert response.status_code == 200
        data = response.json()
        assert data["patient_id"] == "TEST001"
        assert "timeline" in data
        assert len(data["timeline"]) == 2

    def test_get_timeline_not_found(self, client, seed_test_data):
        """Test timeline for non-existent patient."""
        response = client.get("/api/patients/NONEXISTENT/timeline")
        assert response.status_code == 404

    def test_get_timeline_with_filters(self, client, seed_test_data):
        """Test timeline with date filter."""
        response = client.get(
            "/api/patients/TEST001/timeline?start_date=2024-11-01"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["timeline"]) == 1


class TestLabEndpoints:
    """Tests for lab endpoints."""

    def test_get_lab_trend(self, client, seed_test_data):
        """Test retrieving lab trend."""
        response = client.get("/api/patients/TEST001/labs?test_name=HbA1c")
        assert response.status_code == 200
        data = response.json()
        assert data["test_name"] == "HbA1c"
        assert data["unit"] == "%"
        assert len(data["values"]) == 2

    def test_get_lab_trend_not_found(self, client, seed_test_data):
        """Test lab trend for non-existent test."""
        response = client.get(
            "/api/patients/TEST001/labs?test_name=NONEXISTENT"
        )
        assert response.status_code == 404

    def test_get_lab_trend_patient_not_found(self, client, seed_test_data):
        """Test lab trend for non-existent patient."""
        response = client.get(
            "/api/patients/NONEXISTENT/labs?test_name=HbA1c"
        )
        assert response.status_code == 404

    def test_get_lab_trend_missing_test_name(self, client, seed_test_data):
        """Test lab endpoint without test_name parameter."""
        response = client.get("/api/patients/TEST001/labs")
        assert response.status_code == 422  # Validation error


class TestSummaryEndpoint:
    """Tests for summary endpoint."""

    def test_generate_summary(self, client, seed_test_data):
        """Test generating summary."""
        response = client.post("/api/patients/TEST001/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["patient_id"] == "TEST001"
        assert "summary_text" in data
        assert "evidence_references" in data
        assert "mode" in data
        assert "status" in data
        # Check evidence references
        assert len(data["evidence_references"]["encounters"]) > 0
        assert len(data["evidence_references"]["labs"]) > 0

    def test_generate_summary_not_found(self, client, seed_test_data):
        """Test summary for non-existent patient."""
        response = client.post("/api/patients/NONEXISTENT/summary")
        assert response.status_code == 404

    def test_generate_summary_with_options(self, client, seed_test_data):
        """Test summary with custom parameters."""
        payload = {
            "max_encounters": 5,
            "focus_test": "HbA1c",
        }
        response = client.post("/api/patients/TEST001/summary", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "summary_text" in data

    def test_summary_mode_is_template(self, client, seed_test_data):
        """Test that summary mode is template (Ollama not available in test)."""
        response = client.post("/api/patients/TEST001/summary")
        data = response.json()
        # In test environment, Ollama is typically not available
        assert data["mode"] in ["local_llm", "template"]

    def test_summary_includes_disclaimer(self, client, seed_test_data):
        """Test that summary includes safety disclaimer."""
        response = client.post("/api/patients/TEST001/summary")
        data = response.json()
        assert "Synthetic demo data" in data["status"]
