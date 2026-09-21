from app.models.entities import IncidentStatus

ALLOWED_TRANSITIONS = {
    IncidentStatus.NEW: {IncidentStatus.ASSIGNED, IncidentStatus.REJECTED},
    IncidentStatus.ASSIGNED: {IncidentStatus.IN_PROGRESS, IncidentStatus.REJECTED},
    IncidentStatus.IN_PROGRESS: {IncidentStatus.RESOLVED},
    IncidentStatus.RESOLVED: {IncidentStatus.CLOSED},
    IncidentStatus.CLOSED: set(),
    IncidentStatus.REJECTED: set(),
}

def transition_allowed(old: IncidentStatus, new: IncidentStatus) -> bool:
    return new in ALLOWED_TRANSITIONS[old]
