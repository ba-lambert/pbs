from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.core.config import settings
from api.v1.router import api_router

app = FastAPI(title=settings.app_name)
Path("uploads").mkdir(parents=True, exist_ok=True)
app.include_router(api_router, prefix=settings.api_prefix)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"service": settings.app_name}


@app.get("/health")
def health():
    return {"status": "healthy"}
