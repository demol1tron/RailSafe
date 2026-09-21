from app.models.entities import IncidentSeverity, IncidentStatus, UserRole

STATUS_LABELS = {
    IncidentStatus.NEW: "Новый",
    IncidentStatus.ASSIGNED: "Назначен",
    IncidentStatus.IN_PROGRESS: "В работе",
    IncidentStatus.RESOLVED: "Решён",
    IncidentStatus.CLOSED: "Закрыт",
    IncidentStatus.REJECTED: "Отклонён",
}

SEVERITY_LABELS = {
    IncidentSeverity.LOW: "Низкая",
    IncidentSeverity.MEDIUM: "Средняя",
    IncidentSeverity.HIGH: "Высокая",
    IncidentSeverity.CRITICAL: "Критическая",
}

ROLE_LABELS = {
    UserRole.ADMIN: "Администратор",
    UserRole.DISPATCHER: "Диспетчер",
    UserRole.INSPECTOR: "Инспектор",
    UserRole.EMPLOYEE: "Сотрудник",
}


def status_label(value: IncidentStatus | str) -> str:
    try:
        status = value if isinstance(value, IncidentStatus) else IncidentStatus(value)
    except ValueError:
        return str(value)
    return STATUS_LABELS[status]


def severity_label(value: IncidentSeverity | str) -> str:
    try:
        severity = value if isinstance(value, IncidentSeverity) else IncidentSeverity(value)
    except ValueError:
        return str(value)
    return SEVERITY_LABELS[severity]


def role_label(value: UserRole | str) -> str:
    try:
        role = value if isinstance(value, UserRole) else UserRole(value)
    except ValueError:
        return str(value)
    return ROLE_LABELS[role]
