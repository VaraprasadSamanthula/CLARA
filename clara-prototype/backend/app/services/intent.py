"""Intent validation and safety pipeline for LLM requests."""

import re
import json
from typing import Any, Dict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# ============ Constants ============

ALLOWED_INTENTS = {
    "patient_summary",      # Generate clinical summary
    "lab_interpretation",   # Interpret lab values
    "medication_review",    # Review medications
}

UNSAFE_PATTERNS = [
    r"delete\s+from",
    r"drop\s+table",
    r"update\s+",
    r"insert\s+into",
    r"exec\s*\(",
    r"--\s*",
    r";",
    r"\/\*",
]

MAX_OUTPUT_LENGTH = 10000
MAX_INPUT_LENGTH = 5000


# ============ Intent Classes ============

class IntentType(str, Enum):
    """Allowed intent types."""
    PATIENT_SUMMARY = "patient_summary"
    LAB_INTERPRETATION = "lab_interpretation"
    MEDICATION_REVIEW = "medication_review"


class Intent:
    """Represents a validated intent for LLM processing."""

    def __init__(
        self,
        intent_type: str,
        action: str,
        parameters: Dict[str, Any],
    ):
        self.intent_type = intent_type
        self.action = action
        self.parameters = parameters
        self.timestamp = None

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "intent_type": self.intent_type,
            "action": self.action,
            "parameters": self.parameters,
        }


# ============ Validation Functions ============

def is_safe_input(text: str) -> bool:
    """Check if input contains unsafe patterns (SQL injection, etc.)."""
    if len(text) > MAX_INPUT_LENGTH:
        logger.warning(f"Input exceeds max length: {len(text)} > {MAX_INPUT_LENGTH}")
        return False

    text_lower = text.lower()
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            logger.warning(f"Unsafe pattern detected: {pattern}")
            return False

    return True


def sanitize_output(text: str) -> str:
    """Sanitize LLM output to ensure it's safe."""
    if len(text) > MAX_OUTPUT_LENGTH:
        logger.warning(f"Output exceeds max length, truncating")
        text = text[:MAX_OUTPUT_LENGTH]

    # Remove any potentially dangerous characters
    # Keep only printable characters
    text = "".join(char for char in text if char.isprintable() or char in "\n\t")

    return text.strip()


def validate_intent(intent_data: dict) -> tuple[bool, str, Intent | None]:
    """
    Validate an intent against allowlist and schema.
    
    Returns: (is_valid, error_message, intent_object)
    """
    try:
        # Check required fields
        if "intent_type" not in intent_data:
            return False, "Missing 'intent_type'", None

        if "action" not in intent_data:
            return False, "Missing 'action'", None

        if "parameters" not in intent_data:
            return False, "Missing 'parameters'", None

        intent_type = intent_data.get("intent_type", "").lower()

        # Check against allowlist
        if intent_type not in ALLOWED_INTENTS:
            return False, f"Intent '{intent_type}' not in allowlist. Allowed: {ALLOWED_INTENTS}", None

        # Validate parameters
        parameters = intent_data.get("parameters", {})

        # Check patient_id exists if required
        if intent_type in ("patient_summary", "lab_interpretation", "medication_review"):
            if "patient_id" not in parameters:
                return False, f"Intent '{intent_type}' requires 'patient_id' parameter", None

            patient_id = parameters.get("patient_id")
            # Validate patient_id format (alphanumeric, no injection)
            if not re.match(r"^[A-Z0-9_-]+$", str(patient_id)):
                return False, "Invalid patient_id format", None

        # Check for unsafe input in string parameters
        for key, value in parameters.items():
            if isinstance(value, str) and not is_safe_input(value):
                return False, f"Unsafe content detected in parameter '{key}'", None

        # Create intent object
        intent = Intent(
            intent_type=intent_type,
            action=intent_data.get("action"),
            parameters=parameters,
        )

        return True, "", intent

    except Exception as e:
        logger.error(f"Intent validation error: {e}")
        return False, str(e), None


def validate_output(output: str) -> tuple[bool, str, str]:
    """
    Validate LLM output.
    
    Returns: (is_valid, error_message, sanitized_output)
    """
    try:
        if not output or not isinstance(output, str):
            return False, "Output must be non-empty string", ""

        sanitized = sanitize_output(output)

        if not sanitized:
            return False, "Output is empty after sanitization", ""

        return True, "", sanitized

    except Exception as e:
        logger.error(f"Output validation error: {e}")
        return False, str(e), ""


# ============ Intent Builders (Helpers) ============

def build_patient_summary_intent(
    patient_id: str,
    max_encounters: int = 10,
    focus_area: str = None,
) -> dict:
    """Build a patient_summary intent."""
    return {
        "intent_type": "patient_summary",
        "action": "generate_summary",
        "parameters": {
            "patient_id": patient_id,
            "max_encounters": max_encounters,
            "focus_area": focus_area or "overall status",
        },
    }


def build_lab_interpretation_intent(
    patient_id: str,
    test_name: str,
) -> dict:
    """Build a lab_interpretation intent."""
    return {
        "intent_type": "lab_interpretation",
        "action": "interpret_labs",
        "parameters": {
            "patient_id": patient_id,
            "test_name": test_name,
        },
    }


def build_medication_review_intent(
    patient_id: str,
) -> dict:
    """Build a medication_review intent."""
    return {
        "intent_type": "medication_review",
        "action": "review_medications",
        "parameters": {
            "patient_id": patient_id,
        },
    }
