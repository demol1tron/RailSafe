from app.models.entities import Base


def test_current_schema_contains_only_expected_tables():
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
