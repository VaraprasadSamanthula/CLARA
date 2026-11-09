"""Summary generation with LLM provider abstraction."""

import os
import logging
from typing import Dict, Any, Tuple, Optional, Iterator
from app.services.llm import get_or_create_llm_provider
from app.services.intent import validate_intent, validate_output, build_patient_summary_intent

logger = logging.getLogger(__name__)

SAFE_DISCLAIMER = "Synthetic demo data — not for clinical use. Summary is for informational support only and does not constitute clinical advice."

# System prompt for clinical summaries
SYSTEM_PROMPT = """You are CLARA, a Clinical Longitudinal Analysis and Retrieval Assistant.
Your role is to provide concise, evidence-based clinical summaries from patient records.

CRITICAL RULES:
1. Be concise (max 400 words)
2. Cite specific dates and lab values
3. Highlight trends (improving/worsening)
4. Note active medications
5. Flag any critical or concerning values
6. NEVER make new diagnoses
7. NEVER recommend treatments beyond noting current ones
8. Use medical terminology appropriately
9. Include a brief clinical impression
10. End with key monitoring points

Output format:
- Patient Overview (1 sentence)
- Recent Encounters
- Current Medications
- Recent Lab Results (with trends)
- Key Diagnoses
- Clinical Impression
- Monitoring Points"""


def build_llm_prompt(context: Dict[str, Any]) -> str:
    """Build clinical prompt from patient context."""
    patient_name = context.get("patient_name", "Patient")
    birth_year = context.get("birth_year", 1960)
    encounters = context.get("encounters", [])
    medications = context.get("medications", [])
    labs = context.get("labs", [])
    diagnoses = context.get("diagnoses", [])

    from datetime import datetime
    age = datetime.now().year - birth_year

    # Format encounters
    enc_summary = "\n  ".join([
        f"- {e.get('encounter_date', 'Unknown')}: {e.get('encounter_type', '')} - {e.get('summary', '')}"
        for e in encounters[:10]
    ]) if encounters else "No encounters"

    # Format medications
    med_summary = "\n  ".join([
        f"- {m.get('medication_name', '')}: {m.get('dose_text', '')} ({m.get('status', '')})"
        for m in medications[:10]
    ]) if medications else "None"

    # Format labs
    lab_summary = "\n  ".join([
        f"- {l.get('test_name', '')}: {l.get('value', '')} {l.get('unit', '')} on {l.get('recorded_date', '')}"
        for l in labs[:10]
    ]) if labs else "None"

    # Format diagnoses
    diag_summary = "\n  ".join([
        f"- {d.get('description', '')} ({d.get('icd10_code', '')})"
        for d in diagnoses[:5]
    ]) if diagnoses else "None documented"

    prompt = f"""Please provide a clinical summary for the following patient:

Patient: {patient_name}, {age} years old

Recent Encounters:
  {enc_summary}

Current Active Medications:
  {med_summary}

Recent Laboratory Results:
  {lab_summary}

Documented Diagnoses:
  {diag_summary}

Generate a concise clinical summary analyzing this patient's clinical status, trends, and key monitoring points."""

    return prompt


def generate_summary(
    context: Dict[str, Any],
    use_llm: bool = True,
    focus_test: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Generate clinical summary using LLM provider.
    
    Args:
        context: Patient context dict
        use_llm: Whether to use LLM (True) or template (False)
        focus_test: Optional test to focus on
    
    Returns:
        (summary_text, mode) where mode is 'llm' or 'template'
    """
    if not use_llm:
        return generate_template_summary(context), "template"

    try:
        # Build intent
        intent = build_patient_summary_intent(
            patient_id=context.get("patient_id", "unknown"),
            max_encounters=10,
            focus_area=focus_test,
        )

        # Validate intent
        is_valid, error_msg, validated_intent = validate_intent(intent)
        if not is_valid:
            logger.warning(f"Intent validation failed: {error_msg}")
            return generate_template_summary(context), "template"

        # Get LLM provider
        provider = get_or_create_llm_provider()

        # Build prompt
        prompt = build_llm_prompt(context)

        # Generate summary
        summary = provider.generate(prompt, SYSTEM_PROMPT)

        # Validate output
        is_valid_output, output_error, sanitized_output = validate_output(summary)
        if not is_valid_output:
            logger.warning(f"Output validation failed: {output_error}")
            return generate_template_summary(context), "template"

        return sanitized_output, "llm"

    except Exception as e:
        logger.error(f"LLM summary generation failed: {e}")
        return generate_template_summary(context), "template"


def generate_summary_stream(
    context: Dict[str, Any],
    use_llm: bool = True,
    focus_test: Optional[str] = None,
) -> Iterator[str]:
    """
    Generate streaming clinical summary.
    
    Yields chunks of the summary as they're generated.
    """
    if not use_llm:
        summary = generate_template_summary(context)
        # Simulate streaming
        words = summary.split(" ")
        chunk = ""
        for word in words:
            chunk += word + " "
            if len(chunk.split(" ")) % 5 == 0:
                yield chunk
                chunk = ""
        if chunk:
            yield chunk
        return

    try:
        # Build intent
        intent = build_patient_summary_intent(
            patient_id=context.get("patient_id", "unknown"),
            max_encounters=10,
            focus_area=focus_test,
        )

        # Validate intent
        is_valid, error_msg, validated_intent = validate_intent(intent)
        if not is_valid:
            logger.warning(f"Intent validation failed: {error_msg}")
            summary = generate_template_summary(context)
            yield summary
            return

        # Get LLM provider
        provider = get_or_create_llm_provider()

        # Build prompt
        prompt = build_llm_prompt(context)

        # Stream response
        full_response = ""
        for chunk in provider.generate_stream(prompt, SYSTEM_PROMPT):
            full_response += chunk
            yield chunk

        # Validate complete output
        is_valid_output, output_error, _ = validate_output(full_response)
        if not is_valid_output:
            logger.warning(f"Output validation failed: {output_error}")

    except Exception as e:
        logger.error(f"LLM streaming failed: {e}")
        summary = generate_template_summary(context)
        yield summary


def generate_template_summary(context: Dict[str, Any]) -> str:
    """Generate deterministic template-based summary (fallback)."""
    patient_name = context.get("patient_name", "Patient")
    birth_year = context.get("birth_year", 1960)
    encounters = context.get("encounters", [])
    medications = context.get("medications", [])
    labs = context.get("labs", [])

    from datetime import datetime
    age = datetime.now().year - birth_year

    num_encounters = len(encounters)
    
    encounter_types = ", ".join(list(set([e.get("encounter_type", "") for e in encounters[:3]]))) if encounters else "none"

    medications_str = ", ".join([
        f"{m.get('medication_name', '')} ({m.get('dose_text', '')})"
        for m in medications[:3]
    ]) if medications else "none"

    labs_str = "; ".join([
        f"{l.get('test_name', '')} {l.get('value', '')} {l.get('unit', '')}"
        for l in labs[:3]
    ]) if labs else "no recent labs"

    summary = f"""{patient_name}, age {age}, has {num_encounters} documented clinical encounters including {encounter_types}.

Current medications include {medications_str}.

Recent laboratory findings: {labs_str}.

This summary is based on retrieved clinical records and is provided for informational support only."""

    return summary.strip()


def check_ollama_available() -> bool:
    """Deprecated - kept for backward compatibility."""
    logger.warning("check_ollama_available() is deprecated")
    return False
