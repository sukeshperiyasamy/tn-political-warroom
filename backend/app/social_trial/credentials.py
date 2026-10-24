"""Backend-only credential loading. Secrets are read from files named by env vars, never logged or returned."""
import json
import os
from typing import List, Optional

try:  # make sure the project .env is loaded even if db.py has not been imported yet
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"))
except Exception:
    pass


class CredentialError(RuntimeError):
    """Raised when a credential is missing/unreadable. Message never contains secret values."""


def _read(path_env: str, inline_env: Optional[str] = None) -> str:
    if inline_env and os.getenv(inline_env):
        return os.getenv(inline_env, "").strip()
    path = os.getenv(path_env, "").strip()
    if not path:
        raise CredentialError(f"{path_env} is not set (point it at the credential file outside the repo).")
    if not os.path.isfile(path):
        raise CredentialError(f"{path_env} points to a file that does not exist.")
    with open(path, "r", encoding="utf-8") as fh:
        value = fh.read().strip()
    if not value:
        raise CredentialError(f"The file named by {path_env} is empty.")
    return value


def brightdata_api_key() -> str:
    return _read("BRIGHTDATA_API_KEY_FILE", "BRIGHTDATA_API_KEY")


def google_service_account_path() -> str:
    path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if not path:
        raise CredentialError("GOOGLE_APPLICATION_CREDENTIALS is not set.")
    if not os.path.isfile(path):
        raise CredentialError("GOOGLE_APPLICATION_CREDENTIALS points to a file that does not exist.")
    return path


def google_project_id() -> str:
    try:
        with open(google_service_account_path(), "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError) as exc:
        raise CredentialError(f"Service-account file is unreadable or not valid JSON ({type(exc).__name__}).")
    pid = data.get("project_id")
    if not pid:
        raise CredentialError("Service-account file has no project_id.")
    return pid


def _known_secrets() -> List[str]:
    found: List[str] = []
    try:
        found.append(brightdata_api_key())
    except CredentialError:
        pass
    try:
        with open(google_service_account_path(), "r", encoding="utf-8") as fh:
            data = json.load(fh)
        for k in ("private_key", "private_key_id", "client_email"):
            if data.get(k):
                found.append(str(data[k]))
    except Exception:
        pass
    for k in ("ADMIN_PASSWORD", "ADMIN_TOKEN_SECRET"):
        if os.getenv(k):
            found.append(os.getenv(k, ""))
    return [s for s in found if len(s) >= 6]


def redact(text: object) -> str:
    """Strip any known secret value from a string before it is stored, logged or returned."""
    out = str(text)
    for secret in _known_secrets():
        out = out.replace(secret, "[REDACTED]")
    return out
