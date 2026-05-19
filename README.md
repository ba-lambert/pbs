# PBS (Public Bus System) MVP

FastAPI + PostgreSQL/PostGIS backend and React (TanStack Router + shadcn-style UI) admin dashboard for Rwanda public transport operations.

## Stack
- Backend: FastAPI, SQLAlchemy, Alembic, Pydantic, WebSockets
- DB: PostgreSQL/PostGIS (existing container `ptis_postgres`)
- Frontend: React + TypeScript + TanStack Router + react-hook-form + OpenStreetMap (Leaflet)

## Database
This project uses existing PostGIS instance and creates DB `pbs_db`.

Default backend DB URL:
`postgresql+psycopg://postgres:postgres@localhost:5432/pbs_db`

## Setup
1. Install backend deps
```bash
python3 -m pip install -r requirements.txt
```

2. Create database
```bash
PYTHONPATH=. python3 scripts/create_db.py
```

3. Run migrations
```bash
PYTHONPATH=. alembic upgrade head
```

4. Seed initial data (Rwanda 30 districts + starter companies)
```bash
PYTHONPATH=. python3 -m api.seed
```

5. Start API
```bash
PYTHONPATH=. uvicorn main:app --reload
```

6. Start frontend
```bash
cd client
pnpm install
pnpm dev
```

## Default admin account
- Email: `admin@pbs.rw`
- Password: `Admin@12345`

## Seeded starter companies
- Yahoo -> Eastern Province districts
- Horizon -> Southern Province districts
- Volcano -> Northern Province districts

## Core capabilities implemented
- JWT auth + refresh
- RBAC: super_admin, company_admin, company_operator, driver, passenger
- Companies + operators/users management
- Stops CRUD, bus parks CRUD, routes CRUD (PostGIS geometry)
- Bus + driver CRUD and bus district assignment
- Trip scheduling (bus + driver + route + departure)
- Booking with distance-based fare (admin base RWF/km)
- Journey planner endpoint (origin/destination to distance + fare estimate)
- IMEI GPS ingest + WebSocket live tracking + distance/ETA to stop endpoint
- React admin/company dashboard pages for operations and map-based visibility

