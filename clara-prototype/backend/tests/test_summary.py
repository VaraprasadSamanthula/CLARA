"""Unit tests for summary generation."""

import pytest
from app.services.summary import (
    generate_template_summary,
    generate_summary,
    build_llm_prompt,
    validate_summary_against_evidence,
)


class TestTemplateSummary:
    """Tests for deterministic template summary."""

    def test_generate_template_summary(self):
        """Test template summary generation."""
        context = {
            "patient_name": "Test Patient",
            "birth_year": 1970,
            "encounters": [
                {
                    "encounter_id": "ENC001",
                    "encounter_date": "2024-10-15",
                    "encounter_type": "clinic",
                    "summary": "Visit 1",
                },
                {
                    "encounter_id": "ENC002",
                    "encounter_date": "2024-11-15",
                    "encounter_type": "follow-up",
                    "summary": "Visit 2",
                },
            ],
            "medications": [
                {
                    "medication_id": "MED001",
                    "medication_name": "Drug A",
                    "dose_text": "10 mg daily",
                    "status": "active",
                    "recorded_date": "2024-10-15",
                }
            ],
            "labs": [
                {
                    "lab_id": "LAB001",
                    "test_name": "HbA1c",
                    "value": 6.5,
                    "unit": "%",
                    "recorded_date": "2024-10-15",
                }
            ],
            "date_range": {
                "start": "2024-10-15",
                "end": "2024-11-15",
            },
        }

        summary = generate_template_summary(context)
        assert len(summary) > 0
        assert "Test Patient" in summary
        assert "2024-10-15" in summary
        assert "2024-11-15" in summary
        assert "clinic" in summary.lower()
        assert "Drug A" in summary

    def test_template_summary_with_empty_data(self):
        """Test template summary with minimal data."""
        context = {
            "patient_name": "Patient",
            "birth_year": 1970,
            "encounters": [],
            "medications": [],
            "labs": [],
            "date_range": {"start": "unknown", "end": "unknown"},
        }

        summary = generate_template_summary(context)
        assert len(summary) > 0
        assert "Patient" in summary


class TestLLMPrompt:
    """Tests for LLM prompt construction."""

    def test_build_llm_prompt(self):
        """Test LLM prompt building."""
        context = {
            "patient_name": "Test Patient",
            "encounters": [
                {
                    "encounter_id": "ENC001",
                    "encounter_date": "2024-10-15",
                    "encounter_type": "clinic",
                }
            ],
            "medications": [
                {
                    "medication_name": "Drug A",
                    "dose_text": "10 mg",
                    "status": "active",
                }
            ],
            "labs": [
                {
                    "test_name": "HbA1c",
                    "value": 6.5,
                    "unit": "%",
                    "recorded_date": "2024-10-15",
                }
            ],
        }

        prompt = build_llm_prompt(context)
        assert "Test Patient" in prompt
        assert "Drug A" in prompt
        assert "HbA1c" in prompt
        assert "6.5 %" in prompt
        # Verify safety instructions are in prompt
        assert "Do NOT" in prompt or "NOT" in prompt


class TestSummaryValidation:
    """Tests for summary validation."""

    def test_validate_summary_valid(self):
        """Test validation of valid summary."""
        summary = "This is a valid clinical summary with enough information."
        context = {
            "patient_name": "Test",
            "encounters": [{"encounter_id": "ENC001"}],
        }

        is_valid = validate_summary_against_evidence(summary, context)
        assert is_valid is True

    def test_validate_summary_too_short(self):
        """Test validation rejects very short summaries."""
        summary = "Too short"
        context = {}

        is_valid = validate_summary_against_evidence(summary, context)
        assert is_valid is False

    def test_validate_summary_empty(self):
        """Test validation rejects empty summary."""
        summary = ""
        context = {}

        is_valid = validate_summary_against_evidence(summary, context)
        assert is_valid is False


class TestSummaryGeneration:
    """Tests for overall summary generation."""

    def test_generate_summary_returns_mode(self):
        """Test that generate_summary returns mode."""
        context = {
            "patient_name": "Test",
            "birth_year": 1970,
            "encounters": [
                {
                    "encounter_id": "ENC001",
                    "encounter_date": "2024-10-15",
                    "encounter_type": "clinic",
                }
            ],
            "medications": [],
            "labs": [],
            "date_range": {"start": "2024-10-15", "end": "2024-10-15"},
        }

        summary, mode = generate_summary(context, use_llm=False)
        assert len(summary) > 0
        assert mode == "template"  # Should be template since use_llm=False

    def test_generate_summary_llm_disabled(self):
        """Test summary generation with LLM disabled."""
        context = {
            "patient_name": "Test",
            "birth_year": 1970,
            "encounters": [
                {
                    "encounter_id": "ENC001",
                    "encounter_date": "2024-10-15",
                    "encounter_type": "clinic",
                }
            ],
            "medications": [],
            "labs": [],
            "date_range": {"start": "2024-10-15", "end": "2024-10-15"},
        }

        summary, mode = generate_summary(context, use_llm=False)
        assert mode == "template"
