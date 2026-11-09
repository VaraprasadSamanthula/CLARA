"""Security utilities for CLARA."""

import re
from typing import Optional
from config import settings


def sanitize_string(value: str, max_length: int = 500) -> str:
    """
    Sanitize a string input to prevent XSS and injection attacks.
    
    - Removes any HTML/script tags
    - Limits length
    - Strips leading/trailing whitespace
    """
    if not isinstance(value, str):
        return ""
    
    # Remove HTML/script tags
    value = re.sub(r'<[^>]*>', '', value)
    
    # Limit length
    value = value[:max_length]
    
    # Strip whitespace
    return value.strip()


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength.
    
    Returns (is_valid, error_message)
    
    Requirements:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    return True, None


def get_secure_headers() -> dict:
    """
    Get secure HTTP headers for production.
    
    These headers help prevent common security vulnerabilities:
    - X-Content-Type-Options: prevents MIME type sniffing
    - X-Frame-Options: prevents clickjacking
    - X-XSS-Protection: legacy XSS protection
    - Strict-Transport-Security: enforces HTTPS
    """
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
    }
    
    if settings.is_production:
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    
    return headers
