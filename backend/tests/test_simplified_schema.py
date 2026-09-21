from app.models.entities import Base
from app.schemas.common import IncidentCreate, IncidentOut


def test_removed_subsystems_are_not_in_metadata():
    assert set(Base.metadata.tables) == {
        "users",
        "refresh_tokens",
        "railway_stations",
        "incident_categories",
        "incidents",
        "incident_status_history",
        "incident_comments",
        "notifications",
    }


def test_incident_schemas_do_not_expose_line_or_train():
    assert "line_id" not in IncidentCreate.model_fields
    assert "train_id" not in IncidentCreate.model_fields
    assert "line_id" not in IncidentOut.model_fields
    assert "train_id" not in IncidentOut.model_fields
