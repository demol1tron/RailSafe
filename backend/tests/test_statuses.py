from app.models.entities import IncidentStatus
from app.services.statuses import transition_allowed

def test_allowed_status_transition():
    assert transition_allowed(IncidentStatus.NEW, IncidentStatus.ASSIGNED)
    assert not transition_allowed(IncidentStatus.NEW, IncidentStatus.CLOSED)
