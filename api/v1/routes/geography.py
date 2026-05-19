from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from api.core.database import get_db
from api.deps import enforce_company_scope, get_current_user, require_roles
from api.schemas import GeometryEntityCreate, GeometryEntityUpdate, RouteCreate
from models.entities import BusPark, District, Province, Role, Route, RoutePark, RouteStop, Stop, User

router = APIRouter()


@router.get("/provinces", dependencies=[Depends(get_current_user)])
def list_provinces(db: Session = Depends(get_db)):
    items = db.scalars(select(Province).order_by(Province.name.asc())).all()
    return [{"id": p.id, "name": p.name} for p in items]


@router.get("/districts", dependencies=[Depends(get_current_user)])
def list_districts(db: Session = Depends(get_db)):
    items = db.scalars(select(District).order_by(District.name.asc())).all()
    return [{"id": d.id, "name": d.name, "province_id": d.province_id} for d in items]


@router.post("/stops", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_stop(payload: GeometryEntityCreate, db: Session = Depends(get_db)):
    item = Stop(name=payload.name, district_id=payload.district_id, geometry=WKTElement(payload.geometry_wkt, srid=4326))
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/stops", dependencies=[Depends(get_current_user)])
def list_stops(db: Session = Depends(get_db)):
    rows = db.execute(select(Stop.id, Stop.name, Stop.district_id, func.ST_AsText(Stop.geometry))).all()
    return [{"id": r[0], "name": r[1], "district_id": r[2], "geometry_wkt": r[3]} for r in rows]


@router.put("/stops/{stop_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def update_stop(stop_id: int, payload: GeometryEntityUpdate, db: Session = Depends(get_db)):
    item = db.get(Stop, stop_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found")
    item.name = payload.name
    item.district_id = payload.district_id
    item.geometry = WKTElement(payload.geometry_wkt, srid=4326)
    db.commit()
    return {"status": "updated"}


@router.delete("/stops/{stop_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_stop(stop_id: int, db: Session = Depends(get_db)):
    item = db.get(Stop, stop_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stop not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


@router.post("/parks", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_park(payload: GeometryEntityCreate, db: Session = Depends(get_db)):
    item = BusPark(name=payload.name, district_id=payload.district_id, geometry=WKTElement(payload.geometry_wkt, srid=4326))
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@router.get("/parks", dependencies=[Depends(get_current_user)])
def list_parks(db: Session = Depends(get_db)):
    rows = db.execute(select(BusPark.id, BusPark.name, BusPark.district_id, func.ST_AsText(BusPark.geometry))).all()
    return [{"id": r[0], "name": r[1], "district_id": r[2], "geometry_wkt": r[3]} for r in rows]


@router.put("/parks/{park_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def update_park(park_id: int, payload: GeometryEntityUpdate, db: Session = Depends(get_db)):
    item = db.get(BusPark, park_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Park not found")
    item.name = payload.name
    item.district_id = payload.district_id
    item.geometry = WKTElement(payload.geometry_wkt, srid=4326)
    db.commit()
    return {"status": "updated"}


@router.delete("/parks/{park_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_park(park_id: int, db: Session = Depends(get_db)):
    item = db.get(BusPark, park_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Park not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


@router.post("/routes", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def create_route(payload: RouteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    enforce_company_scope(current_user, payload.company_id)
    route = Route(name=payload.name, company_id=payload.company_id, geometry=WKTElement(payload.geometry_wkt, srid=4326))
    db.add(route)
    db.flush()
    db.add_all([RouteStop(route_id=route.id, stop_id=stop_id, order_index=index) for index, stop_id in enumerate(payload.stop_ids)])
    db.add_all([RoutePark(route_id=route.id, park_id=park_id, order_index=index) for index, park_id in enumerate(payload.park_ids)])
    db.commit()
    return {"id": route.id}


@router.get("/routes", dependencies=[Depends(get_current_user)])
def list_routes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Route.id, Route.name, Route.company_id, func.ST_AsText(Route.geometry))
    if current_user.role != Role.SUPER_ADMIN:
        query = query.where(Route.company_id == current_user.company_id)
    rows = db.execute(query.order_by(Route.id.desc())).all()
    return [{"id": row[0], "name": row[1], "company_id": row[2], "geometry_wkt": row[3]} for row in rows]


@router.put("/routes/{route_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def update_route(route_id: int, payload: RouteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    enforce_company_scope(current_user, route.company_id)
    route.name = payload.name
    route.company_id = payload.company_id
    route.geometry = WKTElement(payload.geometry_wkt, srid=4326)
    db.execute(delete(RouteStop).where(RouteStop.route_id == route_id))
    db.execute(delete(RoutePark).where(RoutePark.route_id == route_id))
    db.add_all([RouteStop(route_id=route.id, stop_id=stop_id, order_index=index) for index, stop_id in enumerate(payload.stop_ids)])
    db.add_all([RoutePark(route_id=route.id, park_id=park_id, order_index=index) for index, park_id in enumerate(payload.park_ids)])
    db.commit()
    return {"status": "updated"}


@router.delete("/routes/{route_id}", dependencies=[Depends(require_roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.COMPANY_OPERATOR))])
def delete_route(route_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    enforce_company_scope(current_user, route.company_id)
    db.delete(route)
    db.commit()
    return {"status": "deleted"}

