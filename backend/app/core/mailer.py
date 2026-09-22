import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings


def _send_message_sync(recipient: str, subject: str, body: str) -> None:
    if not settings.smtp_host or not settings.smtp_from:
        raise RuntimeError("SMTP не настроен: укажите SMTP_HOST и SMTP_FROM")
    if recipient.lower().endswith(".local"):
        raise RuntimeError("Для отправки письма у пользователя должен быть реальный email")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = recipient
    message.set_content(body)

    timeout = 15
    if settings.smtp_ssl:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=timeout,
            context=context,
        ) as client:
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
    body = (
        f"Код подтверждения входа в RailSafe: {code}\n\n"
        f"Код действует {settings.two_factor_ttl_seconds // 60} мин. "
        "Если вы не выполняли вход, проигнорируйте это письмо."
    )
    await asyncio.to_thread(
        _send_message_sync,
        recipient,
        "RailSafe — код двухфакторной аутентификации",
        body,
    )


async def send_password_reset_code(recipient: str, code: str) -> None:
    body = (
        f"Код восстановления пароля RailSafe: {code}\n\n"
        f"Код действует {settings.password_reset_ttl_seconds // 60} мин. "
        "Если вы не запрашивали восстановление пароля, проигнорируйте это письмо."
    )
    await asyncio.to_thread(
        _send_message_sync,
        recipient,
        "RailSafe — восстановление пароля",
        body,
    )
