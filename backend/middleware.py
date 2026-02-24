"""
Request-Middleware für UVA Express – Go-live V1
════════════════════════════════════════════════

- Correlation-ID (X-Request-ID) pro Request
- Strukturiertes JSON-Logging (Endpoint, Methode, Status, Dauer)
- Basis-Metriken (Count, Dauer, Fehlerquote)
- Keine sensiblen Payloads in Logs
"""

import json
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("request")


class RequestMetrics:
    """Einfache In-Memory-Metriken pro Endpoint."""

    def __init__(self):
        self._counts: Dict[str, int] = defaultdict(int)
        self._errors: Dict[str, int] = defaultdict(int)
        self._total_ms: Dict[str, float] = defaultdict(float)
        self._started = datetime.now(timezone.utc).isoformat()

    def record(self, path: str, status: int, duration_ms: float):
        key = path.split("?")[0]  # Strip query params
        self._counts[key] += 1
        self._total_ms[key] += duration_ms
        if status >= 500:
            self._errors[key] += 1

    def summary(self) -> Dict:
        result = {
            "since": self._started,
            "endpoints": {},
            "totals": {
                "requests": sum(self._counts.values()),
                "errors_5xx": sum(self._errors.values()),
            },
        }
        for path in sorted(self._counts.keys()):
            count = self._counts[path]
            result["endpoints"][path] = {
                "count": count,
                "errors_5xx": self._errors.get(path, 0),
                "avg_ms": round(self._total_ms[path] / count, 1) if count > 0 else 0,
                "error_rate": round(self._errors.get(path, 0) / count * 100, 1) if count > 0 else 0,
            }
        return result


# Singleton
metrics = RequestMetrics()


class CorrelationMiddleware(BaseHTTPMiddleware):
    """
    Fügt jedem Request eine Correlation-ID hinzu und loggt
    strukturiert: Methode, Pfad, Status, Dauer.
    """

    async def dispatch(self, request: Request, call_next):
        # Correlation-ID: vom Client oder generiert
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
        request.state.request_id = request_id

        start = time.monotonic()
        status_code = 500  # Default für unbehandelte Fehler

        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception:
            status_code = 500
            raise
        finally:
            duration_ms = round((time.monotonic() - start) * 1000, 1)
            path = request.url.path

            # Metriken
            metrics.record(path, status_code, duration_ms)

            # Strukturiertes Log (JSON)
            log_entry = {
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status": status_code,
                "duration_ms": duration_ms,
                "client": request.client.host if request.client else "unknown",
            }

            log_line = json.dumps(log_entry)

            if status_code >= 500:
                logger.error(f"REQUEST {log_line}")
            elif status_code >= 400:
                logger.warning(f"REQUEST {log_line}")
            else:
                logger.info(f"REQUEST {log_line}")
