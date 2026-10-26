"""EdiByte API entrypoint.

Run locally:  uvicorn app.main:app --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from .config import get_settings
from .db import engine, init_db
from .middleware import RateLimitMiddleware, setup_logging
from .routers import coach, meal, system
from .seed import seed_if_empty
from .store import refresh

log = logging.getLogger("edibyte")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging()
    init_db()
    with Session(engine) as session:
        added = seed_if_empty(session)
    refresh()
    log.info("startup", extra={"mode": get_settings().mode, "seeded": added})
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title="EdiByte API",
        version="1.0.0",
        description="Bangla-first nutrition coach. Nutrition numbers come from the food table, never from the LLM.",
        lifespan=lifespan,
    )
    app.add_middleware(RateLimitMiddleware)
    # Added last so it runs first and also covers 429 responses.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    app.include_router(system.router)
    app.include_router(meal.router)
    app.include_router(coach.router)
    return app


app = create_app()
