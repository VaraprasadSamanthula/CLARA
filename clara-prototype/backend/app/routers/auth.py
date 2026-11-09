"""Authentication routes (JWT)."""

import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Form
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# Configuration from settings
SECRET_KEY = settings.jwt_secret_key
ALGORITHM = settings.jwt_algorithm
EXPIRY_HOURS = settings.jwt_expiry_hours

# Password hashing context
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# ============ Schemas ============

class LoginResponse:
    """Login response with JWT token."""
    def __init__(self, access_token: str, token_type: str = "bearer", expires_in: int = 0):
        self.access_token = access_token
        self.token_type = token_type
        self.expires_in = expires_in


class TokenData:
    """Token data embedded in JWT."""
    def __init__(self, user_id: str, email: str, role: str):
        self.user_id = user_id
        self.email = email
        self.role = role


# ============ Utilities ============

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT access token."""
    expires = datetime.utcnow() + timedelta(hours=EXPIRY_HOURS)
    to_encode = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": expires,
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        role: str = payload.get("role")
        if user_id is None or email is None or role is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return TokenData(user_id=user_id, email=email, role=role)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ Endpoints ============

@router.post("/login")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """
    Login with email/password.
    Returns JWT access token.
    
    Demo user:
    - Email: doctor@clara.local
    - Password: demo123
    
    Expects form data with 'username' (email) and 'password' fields.
    """
    # Find user by email (username field contains email)
    user = db.query(User).filter(User.email == username).first()
    
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(user.user_id, user.email, user.role)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": EXPIRY_HOURS * 3600,  # seconds
    }


@router.get("/verify")
def verify(token: Optional[str] = None, authorization: Optional[str] = None):
    """
    Verify a JWT token.
    Pass token either as:
    - Query parameter: /auth/verify?token=<jwt>
    - Authorization header: Authorization: Bearer <jwt>
    """
    # Extract token from either source
    actual_token = token
    if not actual_token and authorization:
        if authorization.startswith("Bearer "):
            actual_token = authorization[7:]
    
    if not actual_token:
        raise HTTPException(status_code=401, detail="Missing token")
    
    token_data = decode_token(actual_token)
    return {
        "user_id": token_data.user_id,
        "email": token_data.email,
        "role": token_data.role,
    }


@router.post("/check-auth")
def check_auth(authorization: Optional[str] = None):
    """
    Check if JWT token is valid.
    Pass token in Authorization header: Authorization: Bearer <jwt>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = authorization[7:]  # Remove "Bearer " prefix
    token_data = decode_token(token)
    
    return {
        "authenticated": True,
        "user_id": token_data.user_id,
        "email": token_data.email,
        "role": token_data.role,
    }
