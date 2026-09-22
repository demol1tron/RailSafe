import pytest
from pydantic import ValidationError

from app.schemas.common import RegisterIn, ResetPasswordIn, UserUpdate


def test_phone_is_normalized():
    data = RegisterIn(
        email="user@example.com",
        password="StrongPass123!",
        full_name="Иван Иванов",
        phone="8 (913) 123-45-67",
    )
    assert data.phone == "+79131234567"


def test_invalid_phone_is_rejected():
    with pytest.raises(ValidationError):
        UserUpdate(phone="12345")


def test_reset_password_code_must_be_six_digits():
    with pytest.raises(ValidationError):
        ResetPasswordIn(email="user@example.com", code="12ab56", new_password="StrongPass123!")
