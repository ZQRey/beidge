import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.api import (
    departments_router,
    employees_router,
    badges_router,
    auth_router,
    admin_auth_router,
    admin_settings_router
)
from seed_data import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB and seed initial data
    await init_db()
    try:
        await seed_initial_data()
    except Exception as e:
        print(f"Warning during seed: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static and storage dirs
if settings.STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(settings.STATIC_DIR)), name="static")

if settings.STORAGE_DIR.exists():
    app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include Routers
app.include_router(departments_router, prefix=settings.API_V1_STR)
app.include_router(employees_router, prefix=settings.API_V1_STR)
app.include_router(badges_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_settings_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "weasyprint_available": False  # or reportlab vector engine
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
