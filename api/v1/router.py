from fastapi import APIRouter

from api.v1.routes import auth, booking, companies, fleet, geography, payments, planner, pricing, tracking, trips, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(geography.router, prefix="/geography", tags=["geography"])
api_router.include_router(fleet.router, prefix="/fleet", tags=["fleet"])
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(booking.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["tracking"])
api_router.include_router(planner.router, prefix="/planner", tags=["planner"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])

