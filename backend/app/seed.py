import asyncio

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.entities import IncidentCategory, RailwayStation, User, UserRole

STATIONS = [
    {"name": "Новосибирск-Главный", "code": "850609", "latitude": 55.0357, "longitude": 82.8962, "region": "Новосибирская область"},
    {"name": "Новосибирск-Западный", "code": "851207", "latitude": 54.9950, "longitude": 82.8545, "region": "Новосибирская область"},
    {"name": "Новосибирск-Восточный", "code": "851508", "latitude": 55.0680, "longitude": 82.9743, "region": "Новосибирская область"},
    {"name": "Новосибирск-Южный", "code": "850505", "latitude": 55.0047, "longitude": 82.9522, "region": "Новосибирская область"},
    {"name": "Инская", "code": "850007", "latitude": 54.9644, "longitude": 83.1192, "region": "Новосибирская область"},
]

CATEGORIES = [
    ("Сход с рельсов", "CRITICAL"),
    ("Столкновение", "CRITICAL"),
    ("Повреждение пути", "HIGH"),
    ("Неисправность сигнализации", "HIGH"),
    ("Посторонний предмет на путях", "MEDIUM"),
    ("Травмирование пассажира", "HIGH"),
]


async def seed():
    async with SessionLocal() as db:
        admin = await db.scalar(select(User).where(User.email == settings.admin_initial_email.lower()))
        if not admin:
            db.add(User(
                email=settings.admin_initial_email.lower(),
                password_hash=hash_password(settings.admin_initial_password),
                full_name="Администратор RailSafe",
                role=UserRole.ADMIN,
            ))

        for row in STATIONS:
            exists = await db.scalar(select(RailwayStation).where(RailwayStation.code == row["code"]))
            if not exists:
                db.add(RailwayStation(**row))

        for name, severity in CATEGORIES:
            exists = await db.scalar(select(IncidentCategory).where(IncidentCategory.name == name))
            if not exists:
                db.add(IncidentCategory(name=name, default_severity=severity))

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
