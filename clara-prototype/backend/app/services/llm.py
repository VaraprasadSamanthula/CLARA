"""LLM Provider abstraction for multi-provider support."""

import os
import json
from abc import ABC, abstractmethod
from typing import Optional, Iterator
import google.generativeai as genai
from google.api_core import retry
import logging

logger = logging.getLogger(__name__)

# ============ Abstract Base Class ============

class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a response from the LLM."""
        pass

    @abstractmethod
    def generate_stream(self, prompt: str, system_prompt: str = "") -> Iterator[str]:
        """Generate a streaming response from the LLM."""
        pass

    @abstractmethod
    def test_connection(self) -> dict:
        """Test if the provider is accessible."""
        pass


# ============ Gemini Provider ============

class GeminiProvider(LLMProvider):
    """Google Gemini API provider."""

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not set in environment variables")
        
        genai.configure(api_key=api_key)
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-pro")
        self.temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.7"))
        self.max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "1000"))
        
        try:
            self.model = genai.GenerativeModel(self.model_name)
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            raise

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a response from Gemini."""
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}".strip()
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise

    def generate_stream(self, prompt: str, system_prompt: str = "") -> Iterator[str]:
        """Generate a streaming response from Gemini."""
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}".strip()
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
                stream=True,
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            raise

    def test_connection(self) -> dict:
        """Test Gemini connection."""
        try:
            response = self.model.generate_content("Hello, are you working?")
            return {
                "status": "ok",
                "provider": "gemini",
                "model": self.model_name,
                "message": response.text[:100],
            }
        except Exception as e:
            logger.error(f"Gemini connection test failed: {e}")
            return {
                "status": "error",
                "provider": "gemini",
                "error": str(e),
            }


# ============ Mock Provider (for testing) ============

class MockProvider(LLMProvider):
    """Mock LLM provider for testing without API costs."""

    def __init__(self):
        self.model_name = "mock-model"
        logger.info("Using Mock LLM Provider (no API calls)")

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a mock response."""
        return self._generate_mock_summary(prompt)

    def generate_stream(self, prompt: str, system_prompt: str = "") -> Iterator[str]:
        """Generate a streaming mock response."""
        summary = self._generate_mock_summary(prompt)
        # Simulate streaming by breaking into chunks
        words = summary.split(" ")
        chunk = ""
        for word in words:
            chunk += word + " "
            if len(chunk.split(" ")) % 5 == 0:  # Yield every 5 words
                yield chunk
                chunk = ""
        if chunk:
            yield chunk

    def test_connection(self) -> dict:
        """Test mock provider."""
        return {
            "status": "ok",
            "provider": "mock",
            "model": self.model_name,
            "message": "Mock provider ready for testing",
        }

    def _generate_mock_summary(self, prompt: str) -> str:
        """Generate a realistic mock clinical summary."""
        return """**Patient Overview**
A patient with well-documented chronic conditions being actively managed in outpatient clinic.

**Key Diagnoses**
- Type 2 Diabetes Mellitus (diagnosed 2024): Well-controlled on current regimen
- Essential Hypertension (diagnosed 2024): Blood pressure trending down with medication adjustment

**Medication Summary**
Currently on 3 active medications: Metformin for glucose control, Lisinopril for BP management, and Aspirin for cardiovascular protection.

**Recent Labs**
- HbA1c: 6.5% → 6.8% → 6.8% (stable, within target)
- Blood Glucose: 145 → 150 mg/dL (slight elevation, monitor)
- Blood Pressure: 155 → 145 mmHg (improving with therapy)

**Clinical Impressions**
Patient demonstrates good medication adherence with stable chronic disease management. Recent medication adjustments appear effective for hypertension control. Glucose levels remain in acceptable range but trending slightly upward - may benefit from lifestyle review.

**Recommendations**
1. Continue current medication regimen
2. Reinforce dietary modifications and exercise
3. Recheck labs in 3 months
4. Monitor for any medication side effects"""


# ============ Provider Factory ============

def get_llm_provider() -> LLMProvider:
    """Factory function to get the appropriate LLM provider."""
    provider_name = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    logger.info(f"Initializing LLM provider: {provider_name}")
    
    if provider_name == "gemini":
        return GeminiProvider()
    elif provider_name == "mock":
        return MockProvider()
    elif provider_name == "openai":
        # TODO: Implement OpenAI provider
        logger.warning("OpenAI provider not yet implemented, falling back to Mock")
        return MockProvider()
    else:
        logger.warning(f"Unknown provider '{provider_name}', using Mock")
        return MockProvider()


# ============ Singleton Pattern (Optional) ============

_llm_provider: Optional[LLMProvider] = None


def get_or_create_llm_provider() -> LLMProvider:
    """Get or create singleton LLM provider instance."""
    global _llm_provider
    if _llm_provider is None:
        _llm_provider = get_llm_provider()
    return _llm_provider
