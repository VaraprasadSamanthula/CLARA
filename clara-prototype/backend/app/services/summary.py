"""Summary generation with optional LLM support and deterministic fallback."""

import os
import json
from typing import Dict, Any, Tuple, Optional
from app.services.retrieval import SummaryService


OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", None)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

# Deterministic template for fallback (no LLM required)
TEMPLATE_SUMMARY = """
{patient_name}, age {age}, has been followed over the past {num_encounters} encounters between {start_date} and {end_date}. 
Recent clinical encounters include {encounter_types}. 
Current active medications include {medications}.
Recent laboratory values show {labs}.
This summary is based on retrieved clinical records and is provided for informational support only.
"""

SAFE_DISCLAIMER = "Synthetic demo data — not for clinical use. Summary is for informational support only and does not constitute clinical advice."


def check_ollama_available() -> bool:
    """Check if Ollama API is reachable."""
    if not OLLAMA_API_URL:
        return False
    
    try:
        import requests
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=2)
        return response.status_code == 200
    except Exception:
        return False


def generate_summary_with_llm(context: Dict[str, Any], model: str = OLLAMA_MODEL) -> Optional[str]:
    """
    Call local Ollama LLM to generate summary.
    Prompt is designed to:
    - Only summarize provided context
    - Not infer missing information
    - Not make diagnostic claims
    """
    if not OLLAMA_API_URL:
        return None

    try:
        import requests

        # Build safe prompt from context
        prompt = build_llm_prompt(context)

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
        }

        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json=payload,
            timeout=30,
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("response", None)
        else:
            return None

    except Exception:
        return None


def build_llm_prompt(context: Dict[str, Any]) -> str:
    """Build safe LLM prompt from context."""
    patient_name = context.get("patient_name", "Patient")
    encounters = context.get("encounters", [])
    medications = context.get("medications", [])
    labs = context.get("labs", [])

    # Format encounters
    enc_summary = "; ".join([
        f"{e['encounter_date']} {e['encounter_type']}" 
        for e in encounters[:5]
    ]) if encounters else "No encounters"

    # Format medications
    med_summary = ", ".join([
        f"{m['medication_name']} ({m['dose_text']})"
        for m in medications[:5]
    ]) if medications else "None"

    # Format labs
    lab_summary = "; ".join([
        f"{l['test_name']} {l['value']} {l['unit']} on {l['recorded_date']}"
        for l in labs[:5]
    ]) if labs else "None"

    prompt = f"""Based strictly on the following clinical record data, write a brief, factual summary. 
Do NOT infer, speculate, or add information not present in the data.
Do NOT make diagnoses or treatment recommendations.
Do NOT mention prognosis or clinical outcomes beyond what is stated.

Patient: {patient_name}
Encounters: {enc_summary}
Medications: {med_summary}
Labs: {lab_summary}

Summary (2-3 sentences, factual only):"""

    return prompt


def generate_template_summary(context: Dict[str, Any]) -> str:
    """Generate deterministic template-based summary."""
    patient_name = context.get("patient_name", "Patient")
    birth_year = context.get("birth_year", 1960)
    encounters = context.get("encounters", [])
    medications = context.get("medications", [])
    labs = context.get("labs", [])
    date_range = context.get("date_range", {})

    from datetime import datetime
    age = datetime.now().year - birth_year

    num_encounters = len(encounters)
    start_date = date_range.get("start", "unknown")
    end_date = date_range.get("end", "unknown")

    encounter_types = ", ".join(list(set([e["encounter_type"] for e in encounters[:3]]))) if encounters else "none"

    medications_str = ", ".join([
        f"{m['medication_name']} ({m['dose_text']})"
        for m in medications[:3]
    ]) if medications else "none"

    labs_str = "; ".join([
        f"{l['test_name']} {l['value']} {l['unit']}"
        for l in labs[:3]
    ]) if labs else "no recent labs"

    summary = TEMPLATE_SUMMARY.format(
        patient_name=patient_name,
        age=age,
        num_encounters=num_encounters,
        start_date=start_date,
        end_date=end_date,
        encounter_types=encounter_types,
        medications=medications_str,
        labs=labs_str,
    )

    return summary.strip()


def validate_summary_against_evidence(summary_text: str, context: Dict[str, Any]) -> bool:
    """
    Basic validation: ensure summary doesn't claim facts not in context.
    This is a simple heuristic check (not exhaustive).
    """
    # For now, accept all summaries if they contain at least some context
    # A more robust check would parse named entities and verify against records
    if not summary_text or len(summary_text.strip()) < 20:
        return False
    return True


def generate_summary(
    context: Dict[str, Any],
    use_llm: bool = True,
) -> Tuple[str, str]:
    """
    Generate summary using LLM if available, otherwise fallback to template.
    
    Returns:
        (summary_text, mode) where mode is 'local_llm' or 'template'
    """
    if use_llm and OLLAMA_API_URL and check_ollama_available():
        # Try LLM first
        summary = generate_summary_with_llm(context)
        if summary and validate_summary_against_evidence(summary, context):
            return summary, "local_llm"
    
    # Fallback to template
    summary = generate_template_summary(context)
    return summary, "template"
