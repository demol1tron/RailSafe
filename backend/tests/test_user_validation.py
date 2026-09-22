import pytest
from pydantic import ValidationError

from app.schemas.common import RegisterIn, UserUpdate


def test_full_name_is_trimmed_and_spaces_collapsed():
    data = RegisterIn(
        email="user@example.com",
        password="StrongPass123!",
        full_name="  Иван   Иванов  ",
    )
    assert data.full_name == "Иван Иванов"


def test_blank_full_name_is_rejected_on_register():
    with pytest.raises(ValidationError):
        RegisterIn(
            email="user@example.com",
            password="StrongPass123!",
            full_name="   ",
        )


def test_blank_full_name_is_rejected_on_admin_update():
    with pytest.raises(ValidationError):
        UserUpdate(full_name="   ")
