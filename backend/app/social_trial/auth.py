"""Server-side admin auth for endpoints that spend paid API credits (signed, expiring bearer token)."""
import base64
import hashlib
import hmac
import json
import os
import time
from typing import Optional

from fastapi import Header, HTTPException

TOKEN_TTL_SECONDS = 8 * 3600


def _secret() -> bytes:
    secret = os.getenv("ADMIN_TOKEN_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Server auth is not configured (ADMIN_TOKEN_SECRET missing).")
    return secret.encode("utf-8")


def _sign(payload: bytes) -> str:
    return hmac.new(_secret(), payload, hashlib.sha256).hexdigest()


def issue_token(username: str, now: Optional[float] = None) -> str:
    payload = json.dumps({"sub": username, "exp": int((now or time.time()) + TOKEN_TTL_SECONDS)}).encode("utf-8")
    return f"{base64.urlsafe_b64encode(payload).decode()}.{_sign(payload)}"


def verify_token(token: str, now: Optional[float] = None) -> str:
    try:
        b64, sig = token.split(".", 1)
        payload = base64.urlsafe_b64decode(b64.encode())
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")
    if not hmac.compare_digest(sig, _sign(payload)):
        raise HTTPException(status_code=401, detail="Invalid token.")
    data = json.loads(payload)
    if data.get("exp", 0) < (now or time.time()):
        raise HTTPException(status_code=401, detail="Session expired. Sign in again.")
    return data["sub"]


def check_credentials(username: str, password: str) -> bool:
    exp_user = os.getenv("ADMIN_USERNAME", "")
    exp_pass = os.getenv("ADMIN_PASSWORD", "")
    if not exp_user or not exp_pass:
        raise HTTPException(status_code=503, detail="Server admin login is not configured (ADMIN_USERNAME / ADMIN_PASSWORD).")
    ok_user = hmac.compare_digest(username.encode(), exp_user.encode())
    ok_pass = hmac.compare_digest(password.encode(), exp_pass.encode())
    return ok_user and ok_pass


def require_admin(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin sign-in required.")
    return verify_token(authorization[7:].strip())
