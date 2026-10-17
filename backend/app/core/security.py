import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "hospital_badges_secret_key_ad_glpi_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 12  # 12 hours

def hash_password(password: str) -> str:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return f"{salt.hex()}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt$key hash."""
    try:
        salt_hex, key_hex = hashed_password.split("$", 1)
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a JWT access token for local admin authentication."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
