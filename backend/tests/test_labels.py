from app.core.labels import role_label, severity_label, status_label
from app.models.entities import IncidentSeverity, IncidentStatus, UserRole


def test_status_labels_are_russian():
    assert status_label(IncidentStatus.IN_PROGRESS) == "В работе"
    assert status_label("CLOSED") == "Закрыт"


def test_severity_labels_are_russian():
    assert severity_label(IncidentSeverity.HIGH) == "Высокая"
    assert severity_label("CRITICAL") == "Критическая"


def test_role_labels_are_russian():
    assert role_label(UserRole.ADMIN) == "Администратор"
    assert role_label("EMPLOYEE") == "Сотрудник"
