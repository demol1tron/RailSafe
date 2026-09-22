from datetime import datetime
import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.entities import IncidentSeverity, IncidentStatus, UserRole


def _normalize_email(value: str) -> str:
    value = value.strip().lower()
    if len(value) > 255 or "@" not in value:
        raise ValueError("Некорректный email")
    local, domain = value.rsplit("@", 1)
    if not local or not domain or " " in value or "." not in domain:
        raise ValueError("Некорректный email")
    return value

def _normalize_full_name(value: str) -> str:
    value = " ".join(value.split())
    if len(value) < 2:
        raise ValueError("Введите ФИО")
    if len(value) > 255:
        raise ValueError("ФИО не должно превышать 255 символов")
    return value


def _normalize_phone(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None

    value = value.strip()
    if not re.fullmatch(r"\+?[\d\s()\-]+", value):
        raise ValueError("Телефон может содержать только цифры, пробелы, скобки, дефисы и знак +")

    if value.startswith("+") and not value.startswith("+7"):
        raise ValueError("Для российских номеров код страны должен быть +7")

    digits = re.sub(r"\D", "", value)

    if len(digits) == 10:
        national = digits
    elif len(digits) == 11 and digits[0] in {"7", "8"}:
        national = digits[1:]
    else:
        raise ValueError("Введите российский номер из 10 цифр, например +7 913 123-45-67")

    if national[0] not in "3456789":
        raise ValueError("Некорректный российский номер телефона")

    return "+7" + national


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(ORMModel):
    id: UUID
    email: str
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    created_at: datetime


class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return _normalize_full_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return _normalize_email(value)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginOut(BaseModel):
    requires_2fa: bool = False
    access_token: str | None = None
    token_type: str = "bearer"
    challenge_id: UUID | None = None
    expires_in: int | None = None


class TwoFactorVerifyIn(BaseModel):
    challenge_id: UUID
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class UserCreate(RegisterIn):
    role: UserRole


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    role: UserRole | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_full_name(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return _normalize_phone(value)


class UserStatusUpdate(BaseModel):
    is_active: bool


class StationIn(BaseModel):
    name: str
    code: str
    latitude: float
    longitude: float
    region: str | None = None


class StationOut(ORMModel):
    id: UUID
    name: str
    code: str
    latitude: float
    longitude: float
    region: str | None


class CategoryIn(BaseModel):
    name: str
    default_severity: str | None = None
    description: str | None = None


class CategoryOut(ORMModel):
    id: UUID
    name: str
    default_severity: str | None
    description: str | None


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=3, max_length=10000)
    category_id: UUID
    station_id: UUID | None = None
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    severity: IncidentSeverity
    occurred_at: datetime


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category_id: UUID | None = None
    station_id: UUID | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    severity: IncidentSeverity | None = None
    occurred_at: datetime | None = None
    resolution_notes: str | None = None


class IncidentOut(ORMModel):
    id: UUID
    title: str
    description: str
    category_id: UUID
    station_id: UUID | None
    latitude: float
    longitude: float
    severity: IncidentSeverity
    status: IncidentStatus
    occurred_at: datetime
    reported_by_id: UUID
    assigned_to_id: UUID | None
    resolution_notes: str | None
    created_at: datetime
    updated_at: datetime


class IncidentMapOut(BaseModel):
    id: UUID
    latitude: float
    longitude: float
    severity: IncidentSeverity
    status: IncidentStatus
    title: str
    category: str


class IncidentListOut(BaseModel):
    items: list[IncidentOut]
    total: int
    page: int
    size: int


class AssignIn(BaseModel):
    assigned_to_id: UUID


class StatusIn(BaseModel):
    new_status: IncidentStatus
    comment: str | None = None


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class CommentOut(ORMModel):
    id: UUID
    incident_id: UUID
    user_id: UUID
    text: str
    created_at: datetime


class HistoryOut(ORMModel):
    id: UUID
    old_status: str | None
    new_status: str
    changed_by_id: UUID
    comment: str | None
    changed_at: datetime


class NotificationOut(ORMModel):
    id: UUID
    incident_id: UUID | None
    message: str
    is_read: bool
    created_at: datetime


class AuditLogOut(ORMModel):
    id: UUID
    actor_id: UUID | None
    actor_email: str | None
    action: str
    method: str
    path: str
    query_string: str | None
    status_code: int
    ip_address: str | None
    user_agent: str | None
    created_at: datetime


class AuditLogListOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    size: int
