from app.schemas.common import LoginIn, RegisterIn


def test_admin_local_email_is_valid_for_login():
    data = LoginIn(email="admin@railsafe.local", password="Admin12345!")
    assert data.email == "admin@railsafe.local"


def test_email_is_normalized():
    data = RegisterIn(
        email=" User@Example.COM ",
        password="StrongPass123!",
        full_name="Тестовый Пользователь",
    )
    assert data.email == "user@example.com"
