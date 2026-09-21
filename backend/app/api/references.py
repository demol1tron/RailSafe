from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.entities import Incident, IncidentCategory, RailwayStation, UserRole
from app.schemas.common import CategoryIn, CategoryOut, StationIn, StationOut

router = APIRouter(tags=["references"])
write_ref = require_roles(UserRole.ADMIN, UserRole.DISPATCHER)
admin = require_roles(UserRole.ADMIN)


@router.get("/stations", response_model=list[StationOut])
async def stations(_=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return list((await db.scalars(select(RailwayStation).order_by(RailwayStation.name))).all())


@router.post("/stations", response_model=StationOut, status_code=201)
async def create_station(data: StationIn, _=Depends(write_ref), db: AsyncSession = Depends(get_db)):
    station = RailwayStation(**data.model_dump())
    db.add(station)
    await db.commit()
    await db.refresh(station)
    return station


@router.get("/stations/{id}", response_model=StationOut)
async def station(id: UUID, _=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = await db.get(RailwayStation, id)
    if not item:
        raise HTTPException(404, "Станция не найдена")
    return item


@router.put("/stations/{id}", response_model=StationOut)
async def update_station(id: UUID, data: StationIn, _=Depends(write_ref), db: AsyncSession = Depends(get_db)):
    item = await db.get(RailwayStation, id)
    if not item:
        raise HTTPException(404, "Станция не найдена")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/stations/{id}", status_code=204)
async def delete_station(id: UUID, _=Depends(admin), db: AsyncSession = Depends(get_db)):
    item = await db.get(RailwayStation, id)
    if not item:
        raise HTTPException(404, "Станция не найдена")
    linked = await db.scalar(select(func.count()).select_from(Incident).where(Incident.station_id == id))
    if linked:
        raise HTTPException(409, "Станция связана с инцидентами")
    await db.delete(item)
    await db.commit()


@router.get("/categories", response_model=list[CategoryOut])
async def categories(_=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return list((await db.scalars(select(IncidentCategory).order_by(IncidentCategory.name))).all())


@router.post("/categories", response_model=CategoryOut, status_code=201)
async def create_category(data: CategoryIn, _=Depends(admin), db: AsyncSession = Depends(get_db)):
    item = IncidentCategory(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/categories/{id}", response_model=CategoryOut)
async def update_category(id: UUID, data: CategoryIn, _=Depends(admin), db: AsyncSession = Depends(get_db)):
    item = await db.get(IncidentCategory, id)
    if not item:
        raise HTTPException(404, "Категория не найдена")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/categories/{id}", status_code=204)
async def delete_category(id: UUID, _=Depends(admin), db: AsyncSession = Depends(get_db)):
    item = await db.get(IncidentCategory, id)
    if not item:
        raise HTTPException(404, "Категория не найдена")
    linked = await db.scalar(select(func.count()).select_from(Incident).where(Incident.category_id == id))
    if linked:
        raise HTTPException(409, "Категория используется")
    await db.delete(item)
    await db.commit()
