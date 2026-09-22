import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def _send_2fa_code_sync(recipient: str, code: str) -> None:
    if not settings.smtp_host or not settings.smtp_from:
        raise RuntimeError("SMTP не настроен: укажите SMTP_HOST и SMTP_FROM")
    if recipient.lower().endswith(".local"):
        raise RuntimeError("Для 2FA по SMTP у пользователя должен быть реальный email")

    message = EmailMessage()
    message["Subject"] = "RailSafe — код двухфакторной аутентификации"
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message.set_content(
        "Код подтверждения входа в RailSafe: "
        f"{code}\n\nКод действует {settings.two_factor_ttl_seconds // 60} мин. "
        "Если вы не выполняли вход, проигнорируйте это письмо."
    )

    timeout = 15
    if settings.smtp_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=timeout, context=context) as client:
            if settings.smtp_username:
                client.login(settings.smtp_username, settings.smtp_password)
            client.send_message(message)
        return

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=timeout) as client:
        client.ehlo()
        if settings.smtp_starttls:
            client.starttls(context=ssl.create_default_context())
            client.ehlo()
        if settings.smtp_username:
            client.login(settings.smtp_username, settings.smtp_password)
        client.send_message(message)


async def send_2fa_code(recipient: str, code: str) -> None:
    await asyncio.to_thread(_send_2fa_code_sync, recipient, code)
