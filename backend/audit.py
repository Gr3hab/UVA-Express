"""
Audit-Logger für UVA Express – Go-live V1
═════════════════════════════════════════════

Fachlicher Nachvollzug: wer, was, wann, Status, Hash.
KEINE sensiblen Inhalte (PII, XML-Volltext) in Logs.
Stattdessen: SHA-256-Hash des Payloads + Metadaten.
"""

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("audit")


class AuditAction:
    """Definierte Audit-Events."""
    CALCULATE = "uva.calculate"
    VALIDATE = "uva.validate"
    EXPORT_XML = "uva.export_xml"
    RKSV_VALIDATE = "rksv.validate"
    SUBMISSION_PREPARE = "submission.prepare"
    SUBMISSION_CONFIRM = "submission.confirm"
    SUBMISSION_STATUS_CHANGE = "submission.status_change"


def _payload_hash(payload: Any) -> str:
    """SHA-256-Hash eines Payloads (kein Klartext)."""
    try:
        if hasattr(payload, "model_dump"):
            raw = json.dumps(payload.model_dump(), sort_keys=True, default=str)
        elif isinstance(payload, dict):
            raw = json.dumps(payload, sort_keys=True, default=str)
        else:
            raw = str(payload)
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    except Exception:
        return "hash-error"


class AuditEntry:
    """Einzelner Audit-Eintrag."""

    def __init__(
        self,
        action: str,
        correlation_id: str,
        period: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        payload_hash: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_code: Optional[str] = None,
    ):
        self.id = str(uuid.uuid4())
        self.action = action
        self.correlation_id = correlation_id
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.period = period
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.old_status = old_status
        self.new_status = new_status
        self.payload_hash = payload_hash
        self.success = success
        self.error_code = error_code
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "action": self.action,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp,
            "period": self.period,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "payload_hash": self.payload_hash,
            "success": self.success,
            "error_code": self.error_code,
            "metadata": self.metadata,
        }

    def to_log_line(self) -> str:
        """Strukturierte Log-Zeile (JSON)."""
        return json.dumps(self.to_dict(), default=str)


class AuditLogger:
    """
    Fachlicher Audit-Logger.
    
    Schreibt strukturierte Audit-Events in den Python-Logger
    und gibt AuditEntry-Objekte zurück, die das Frontend
    in Supabase speichern kann.
    """

    def __init__(self):
        self._recent: List[Dict[str, Any]] = []
        self._max_recent = 1000  # In-Memory-Ring für Debugging

    def log(
        self,
        action: str,
        correlation_id: str,
        period: Optional[str] = None,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        payload: Any = None,
        metadata: Optional[Dict[str, Any]] = None,
        success: bool = True,
        error_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Erstellt und loggt einen Audit-Eintrag."""
        p_hash = _payload_hash(payload) if payload is not None else None

        entry = AuditEntry(
            action=action,
            correlation_id=correlation_id,
            period=period,
            tenant_id=tenant_id,
            user_id=user_id,
            old_status=old_status,
            new_status=new_status,
            payload_hash=p_hash,
            metadata=metadata,
            success=success,
            error_code=error_code,
        )

        # Strukturiertes Log
        logger.info(f"AUDIT {entry.to_log_line()}")

        # In-Memory-Ring
        entry_dict = entry.to_dict()
        self._recent.append(entry_dict)
        if len(self._recent) > self._max_recent:
            self._recent = self._recent[-self._max_recent:]

        return entry_dict

    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Letzte Audit-Einträge (für Debugging/Monitoring)."""
        return list(reversed(self._recent[-limit:]))


# Singleton
audit_logger = AuditLogger()
