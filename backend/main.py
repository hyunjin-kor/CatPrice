"""FastAPI sidecar entry point for the desktop app."""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from backend.config import settings
from backend.database import create_db_and_tables, engine, sync_material_library
from backend.routers import (
    calculator,
    capex,
    catcost_import,
    compare,
    decision,
    equipment,
    estimates,
    indices,
    lca,
    materials,
    prices,
    templates,
    uncertainty,
)
from backend.services.price_scheduler import collect_prices

logger = logging.getLogger(__name__)

# Must match package.json / pyproject.toml / frontend/package.json;
# backend/tests/test_version_sync.py enforces this.
APP_VERSION = "1.4.0"

scheduler = AsyncIOScheduler(timezone=UTC)
_last_price_update: datetime | None = None
_startup_tasks: set[asyncio.Task] = set()


async def _scheduled_price_update() -> None:
    """Scheduled task to collect metal prices."""
    global _last_price_update
    try:
        await collect_prices()
        _last_price_update = datetime.now(UTC)
        logger.info("Scheduled price update completed")
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Scheduled price update failed: %s", exc)


def _is_local_request(host: str | None) -> bool:
    """Allow manual refresh only from loopback/test clients by default."""
    return host in {"127.0.0.1", "::1", "localhost", "testclient", None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables, fetch prices on startup, then schedule daily updates."""
    create_db_and_tables()
    with Session(engine) as session:
        sync_material_library(session, force=True)

    # Fetch prices immediately on startup without blocking the Electron shell.
    # Hold a reference so the task can't be garbage-collected mid-flight.
    startup_task = asyncio.create_task(_scheduled_price_update())
    _startup_tasks.add(startup_task)
    startup_task.add_done_callback(_startup_tasks.discard)

    scheduler.add_job(
        _scheduled_price_update,
        "cron",
        hour=settings.price_update_hour,
        minute=0,
        id="daily_price_update",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Price scheduler started (daily refresh at %02d:00 UTC + immediate fetch on startup)",
        settings.price_update_hour,
    )

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(
    title="COMET API",
    description="Loopback API sidecar for the COMET desktop app",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(calculator.router)
app.include_router(capex.router)
app.include_router(prices.router)
app.include_router(materials.router)
app.include_router(uncertainty.router)
app.include_router(compare.router)
app.include_router(catcost_import.router)
app.include_router(decision.router)
app.include_router(templates.router)
app.include_router(equipment.router)
app.include_router(estimates.router)
app.include_router(indices.router)
app.include_router(lca.router)


@app.middleware("http")
async def apply_security_headers(request: Request, call_next):
    """Apply low-regression response hardening for the loopback API."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health")
def health():
    """Server health check."""
    return {
        "status": "ok",
        "version": APP_VERSION,
        "last_price_update": _last_price_update.isoformat() if _last_price_update else None,
        "scheduler_running": scheduler.running,
    }


@app.post("/api/prices/refresh")
async def refresh_prices(request: Request, source: str | None = None):
    """Manually trigger a price update.

    Pass ``?source=yahoo`` for a fast, Yahoo Finance-only refresh — this is
    what the desktop client uses for short-interval polling. Omit the
    parameter for the full multi-source refresh.
    """
    client_host = request.client.host if request.client else None
    if not settings.debug and not _is_local_request(client_host):
        raise HTTPException(status_code=403, detail="Manual refresh is only available from local requests.")

    if source is not None and source != "yahoo":
        raise HTTPException(status_code=422, detail="Unsupported source")

    global _last_price_update
    prices_data = await collect_prices(source=source)
    _last_price_update = datetime.now(UTC)
    return {
        "status": "ok",
        "prices_fetched": len(prices_data),
        "updated_at": _last_price_update.isoformat(),
    }


# --- Browser mode -----------------------------------------------------------
# When the built frontend exists in the repo (frontend/dist), serve it so the
# whole app runs in a normal browser from this one process:
#     npm run web   ->   http://localhost:8765
# The packaged PyInstaller sidecar ships without that directory, so this stays
# a no-op on the desktop build, where Electron loads the UI itself. The
# catch-all is registered after every API router, so /api/* always wins.
_FRONTEND_DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"

if _FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=_FRONTEND_DIST / "assets"), name="spa_assets")

    # Paths that must stay 404 when their features are disabled (the debug-mode
    # docs routes are registered before this catch-all, so they still win when
    # enabled).
    _RESERVED_PATHS = {"docs", "redoc", "openapi.json"}

    @app.get("/{spa_path:path}", include_in_schema=False)
    def serve_frontend(spa_path: str):
        if spa_path in _RESERVED_PATHS:
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (_FRONTEND_DIST / spa_path).resolve()
        if spa_path and candidate.is_file() and candidate.is_relative_to(_FRONTEND_DIST):
            return FileResponse(candidate)
        # The bundle is built with base './' for the Electron file:// loader, so
        # nested SPA routes request assets as /<route>/assets/<file>; recover
        # them by basename (hashed filenames make collisions a non-issue).
        basename = Path(spa_path).name
        if basename and "." in basename:
            for fallback in (_FRONTEND_DIST / "assets" / basename, _FRONTEND_DIST / basename):
                if fallback.is_file():
                    return FileResponse(fallback)
        return FileResponse(_FRONTEND_DIST / "index.html")
