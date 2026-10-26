"""Rate limiting and structured request logging.

Logs are one JSON object per line and never contain request bodies, so no
user meal text or questions are written unless LOG_USER_TEXT=true.
"""

from __future__ import annotations

import json
import logging
import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import get_settings


class JsonFormatter(logging.Formatter):
    _skip = set(logging.makeLogRecord({}).__dict__) | {"message", "asctime"}

    def format(self, record: logging.LogRecord) -> str:
        data = {"level": record.levelname, "logger": record.name, "event": record.getMessage()}
        data.update({k: v for k, v in record.__dict__.items() if k not in self._skip})
        return json.dumps(data, ensure_ascii=False, default=str)


def setup_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger("edibyte")
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    root.propagate = False


log = logging.getLogger("edibyte.http")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory sliding window per client IP (fine for one instance)."""

    def __init__(self, app):
        super().__init__(app)
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        s = get_settings()
        path = request.url.path
        if request.method == "OPTIONS" or path == "/health":
            return await call_next(request)
        limit = s.coach_rate_limit_per_minute if path.startswith("/coach") else s.rate_limit_per_minute
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (
            request.client.host if request.client else "?"
        )
        key = f"{ip}:{'coach' if path.startswith('/coach') else 'api'}"
        now = time.monotonic()
        window = self.hits[key]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= limit:
            return JSONResponse(
                {"detail": "Too many requests. Please wait a minute and try again.", "code": "rate_limited"},
                status_code=429,
                headers={"Retry-After": "60"},
            )
        window.append(now)

        start = time.perf_counter()
        response = await call_next(request)
        log.info(
            "request",
            extra={
                "method": request.method,
                "path": path,
                "status": response.status_code,
                "ms": round((time.perf_counter() - start) * 1000, 1),
                "mode": s.mode,
            },
        )
        return response
