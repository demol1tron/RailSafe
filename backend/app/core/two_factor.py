import hashlib
import hmac
import secrets
from uuid import UUID

from app.core.config import settings


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(challenge_id: UUID, code: str) -> str:
    payload = f"{challenge_id}:{code}".encode()
    return hmac.new(settings.two_factor_secret.encode(), payload, hashlib.sha256).hexdigest()


def verify_otp(challenge_id: UUID, code: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(challenge_id, code), expected_hash)
