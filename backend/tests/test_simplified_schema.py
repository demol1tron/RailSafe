from app.models.entities import Base
from app.schemas.common import IncidentCreate, IncidentOut


def test_release_schema_tables():
    assert set(Base.metadata.tables) == {
        "users",
        "refresh_tokens",
        "railway_stations",
        "incident_categories",
        "incidents",
        "incident_status_history",
        "incident_comments",
        "notifications",
        "two_factor_challenges",
        "audit_logs",
    }


def test_removed_subsystems_are_not_exposed():
    assert "line_id" not in IncidentCreate.model_fields
    assert "train_id" not in IncidentCreate.model_fields
    assert "line_id" not in IncidentOut.model_fields
    assert "train_id" not in IncidentOut.model_fields
