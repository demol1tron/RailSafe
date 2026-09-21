from fastapi import HTTPException
from app.models.entities import Incident, User, UserRole

def ensure_incident_access(incident: Incident, user: User) -> None:
    if user.role in {UserRole.ADMIN, UserRole.DISPATCHER}:
        return
    if user.role == UserRole.EMPLOYEE and incident.reported_by_id == user.id:
        return
    if user.role == UserRole.INSPECTOR and incident.assigned_to_id == user.id:
        return
    raise HTTPException(status_code=403, detail="Нет доступа к инциденту")

def can_edit_incident(incident: Incident, user: User) -> bool:
    if user.role in {UserRole.ADMIN, UserRole.DISPATCHER}:
        return True
    return user.role == UserRole.EMPLOYEE and incident.reported_by_id == user.id and incident.status.value == "NEW"
