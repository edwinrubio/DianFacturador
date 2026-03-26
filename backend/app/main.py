from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — seed default admin user on first run
    from app.services.seed import seed_admin_user
    await seed_admin_user()
    yield
    # Shutdown


settings = get_settings()

app = FastAPI(
    title="DIAN Facturador",
    description="Software de facturacion electronica para Colombia",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
