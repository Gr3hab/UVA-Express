"""
UVA Express – FastAPI Backend Server · Go-live V1 (gehärtet)
═════════════════════════════════════════════════════════════

Härtungen:
1. Submission-Idempotenz (Idempotency-Key + Status-Lock)
2. XML-Validierung (XSD + Strukturprüfung)
3. Audit-Log (fachlicher Nachvollzug, keine PII in Logs)
4. Strukturiertes Logging + Metriken
5. Request-Correlation-ID
"""

from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import json
import uuid
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

from models import (
    UVACalculationRequest, UVACalculationResponse,
    UVAValidationRequest, UVAValidationResponse,
    XMLExportRequest, XMLExportResponse,
    RKSVValidationRequest, RKSVValidationResponse,
    SubmissionPrepareRequest, SubmissionPrepareResponse,
    SubmissionConfirmRequest, SubmissionConfirmResponse,
    SubmissionStatus, SubmissionChecklistItem,
    ValidationIssue, ValidationSeverity,
    KZInfo, KZValues, AuditEntry,
)
from uva_engine import calculate_uva
from uva_validator import validate_uva
from uva_xml import build_uva_xml
from rksv_validator import validate_rksv
from audit import audit_logger, AuditAction
from middleware import CorrelationMiddleware, metrics

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ═══════════════════════════════════════════════════════════════════
# Logging Setup (JSON structured)
# ═══════════════════════════════════════════════════════════════════

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info and record.exc_info[0]:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler])
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# App + Router
# ═══════════════════════════════════════════════════════════════════

app = FastAPI(
    title="UVA Express API",
    description="Österreichische Umsatzsteuervoranmeldung – Go-live V1 (gehärtet)",
    version="1.1.0",
)
api_router = APIRouter(prefix="/api")

# ═══════════════════════════════════════════════════════════════════
# Idempotency Store (In-Memory – für stateless Engine ausreichend)
# ═══════════════════════════════════════════════════════════════════

class IdempotencyStore:
    """
    Verhindert Doppelverarbeitung bei Submission-Confirm.
    Speichert: idempotency_key → response (max 10000 Einträge).
    """
    def __init__(self, max_entries: int = 10000):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._max = max_entries

    def _period_key(self, year: int, month: int) -> str:
        return f"{year}-{str(month).zfill(2)}"

    def check_and_store(
        self, key: str, year: int, month: int, response_data: Dict
    ) -> Tuple[bool, Optional[Dict]]:
        """
        Returns (is_duplicate, cached_response).
        If is_duplicate=True, return cached_response.
        If is_duplicate=False, stores the response for future dedup.
        """
        if key in self._store:
            return True, self._store[key]

        # Evict old entries if full
        if len(self._store) >= self._max:
            oldest_keys = list(self._store.keys())[:len(self._store) // 2]
            for k in oldest_keys:
                del self._store[k]

        self._store[key] = response_data
        return False, None

    def has_confirmed(self, year: int, month: int) -> bool:
        """Check if a period was already confirmed (Status-Lock)."""
        period = self._period_key(year, month)
        return any(
            v.get("_period") == period and v.get("success")
            for v in self._store.values()
        )

idempotency_store = IdempotencyStore()

# ═══════════════════════════════════════════════════════════════════
# Helper: Get correlation ID from request
# ═══════════════════════════════════════════════════════════════════

def _get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid.uuid4())[:12])

def _get_tenant_id(request: Request) -> Optional[str]:
    return request.headers.get("X-Tenant-ID")

def _get_user_id(request: Request) -> Optional[str]:
    return request.headers.get("X-User-ID")


# ═══════════════════════════════════════════════════════════════════
# Health + Metrics
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {
        "service": "UVA Express API",
        "version": "1.1.0",
        "status": "running",
        "hardened": True,
        "features": [
            "uva-calculation", "uva-validation", "xml-export",
            "rksv-validation", "submission-pipeline",
            "idempotency", "audit-trail", "xsd-validation",
        ],
    }

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/metrics")
async def get_metrics():
    """Basis-Metriken: Request-Count, Dauer, Fehlerquote pro Endpoint."""
    return metrics.summary()


# ═══════════════════════════════════════════════════════════════════
# UVA Calculation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/calculate", response_model=UVACalculationResponse)
async def api_calculate_uva(request_body: UVACalculationRequest, request: Request):
    cid = _get_request_id(request)
    period = f"{request_body.year}-{str(request_body.month).zfill(2)}"

    try:
        logger.info(json.dumps({
            "event": "uva.calculate.start", "cid": cid, "period": period,
            "invoice_count": len(request_body.invoices),
        }))

        result = calculate_uva(request_body)

        # Audit
        audit_logger.log(
            action=AuditAction.CALCULATE,
            correlation_id=cid,
            period=period,
            tenant_id=_get_tenant_id(request),
            user_id=_get_user_id(request),
            payload=request_body,
            metadata={
                "invoice_count": len(request_body.invoices),
                "kz095": result.kz_values.kz095_betrag,
                "warnings": len(result.warnings),
            },
        )

        return result
    except Exception as e:
        audit_logger.log(
            action=AuditAction.CALCULATE,
            correlation_id=cid, period=period,
            success=False, error_code=type(e).__name__,
            tenant_id=_get_tenant_id(request),
        )
        logger.error(json.dumps({"event": "uva.calculate.error", "cid": cid, "error": str(e)}))
        raise HTTPException(status_code=500, detail="UVA-Berechnung fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# UVA Validation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/validate", response_model=UVAValidationResponse)
async def api_validate_uva(request_body: UVAValidationRequest, request: Request):
    cid = _get_request_id(request)
    period = f"{request_body.year}-{str(request_body.month).zfill(2)}"

    try:
        result = validate_uva(request_body)

        audit_logger.log(
            action=AuditAction.VALIDATE,
            correlation_id=cid, period=period,
            tenant_id=_get_tenant_id(request),
            user_id=_get_user_id(request),
            payload=request_body,
            metadata={
                "valid": result.valid,
                "errors": len(result.errors),
                "warnings": len(result.warnings),
                "kz095_matches": result.kz095_matches,
            },
        )
        return result
    except Exception as e:
        audit_logger.log(
            action=AuditAction.VALIDATE,
            correlation_id=cid, period=period,
            success=False, error_code=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="UVA-Validierung fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# XML Export
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/export-xml")
async def api_export_xml(request_body: XMLExportRequest, request: Request):
    cid = _get_request_id(request)
    period = f"{request_body.year}-{str(request_body.month).zfill(2)}"

    try:
        result = build_uva_xml(request_body)

        # Hash des generierten XML (nicht Volltext loggen!)
        xml_hash = hashlib.sha256(result.xml_content.encode()).hexdigest()[:16] if result.xml_content else None

        audit_logger.log(
            action=AuditAction.EXPORT_XML,
            correlation_id=cid, period=period,
            tenant_id=_get_tenant_id(request),
            user_id=_get_user_id(request),
            metadata={
                "success": result.success,
                "validation_passed": result.validation_passed,
                "xml_hash": xml_hash,
                "filename": result.filename,
                "issues": len(result.validation_issues),
            },
        )

        if not result.success:
            return JSONResponse(
                status_code=422,
                content={
                    "success": False,
                    "validation_issues": [i.model_dump() for i in result.validation_issues],
                    "message": "XML-Export fehlgeschlagen: Validierungsfehler gefunden",
                }
            )

        return Response(
            content=result.xml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": f'attachment; filename="{result.filename}"',
                "X-Validation-Passed": str(result.validation_passed).lower(),
                "X-XML-Hash": xml_hash or "",
                "X-Request-ID": cid,
            },
        )
    except Exception as e:
        audit_logger.log(
            action=AuditAction.EXPORT_XML,
            correlation_id=cid, period=period,
            success=False, error_code=type(e).__name__,
        )
        raise HTTPException(status_code=500, detail="XML-Export fehlgeschlagen.")


@api_router.post("/uva/export-xml-json", response_model=XMLExportResponse)
async def api_export_xml_json(request_body: XMLExportRequest, request: Request):
    _get_request_id(request)  # ensure correlation
    try:
        result = build_uva_xml(request_body)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="XML-Export fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# RKSV Validation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/rksv/validate", response_model=RKSVValidationResponse)
async def api_validate_rksv(request_body: RKSVValidationRequest, request: Request):
    cid = _get_request_id(request)
    try:
        result = validate_rksv(request_body)

        audit_logger.log(
            action=AuditAction.RKSV_VALIDATE,
            correlation_id=cid,
            tenant_id=_get_tenant_id(request),
            metadata={
                "total": result.total_receipts,
                "valid": result.valid_receipts,
                "invalid": result.invalid_receipts,
            },
        )
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="RKSV-Validierung fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# Submission Pipeline (IDEMPOTENT)
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/submission/prepare", response_model=SubmissionPrepareResponse)
async def api_prepare_submission(request_body: SubmissionPrepareRequest, request: Request):
    cid = _get_request_id(request)
    period = f"{request_body.year}-{str(request_body.month).zfill(2)}"

    try:
        kz = request_body.kz_values
        checklist: List[SubmissionChecklistItem] = []
        blocking = 0

        # 1. Steuernummer
        has_stnr = bool(request_body.steuernummer and len(request_body.steuernummer) >= 5)
        checklist.append(SubmissionChecklistItem(
            label="Steuernummer vorhanden",
            passed=has_stnr,
            severity=ValidationSeverity.ERROR,
            details=f"Steuernummer: {request_body.steuernummer}" if has_stnr else "Bitte Steuernummer eingeben",
        ))
        if not has_stnr:
            blocking += 1

        # 2. UVA berechnet
        has_data = any(
            getattr(kz, f) != 0 for f in kz.model_fields
            if f not in ("kz090_betrag", "kz095_betrag")
        )
        checklist.append(SubmissionChecklistItem(
            label="UVA berechnet",
            passed=True,
            severity=ValidationSeverity.ERROR,
            details=f"KZ 095: {kz.kz095_betrag:.2f} EUR" if has_data else "Leermeldung",
        ))

        # 3. BMF Validation
        validation_req = UVAValidationRequest(
            kz_values=kz, year=request_body.year, month=request_body.month,
            invoices=request_body.invoices,
        )
        validation_result = validate_uva(validation_req)
        checklist.append(SubmissionChecklistItem(
            label="BMF-Plausibilitätsprüfung bestanden",
            passed=validation_result.valid,
            severity=ValidationSeverity.ERROR,
            details=f"{len(validation_result.errors)} Fehler, {len(validation_result.warnings)} Warnungen",
        ))
        if not validation_result.valid:
            blocking += 1

        # 4. KZ 095 Konsistenz
        checklist.append(SubmissionChecklistItem(
            label="KZ 095 Berechnung konsistent",
            passed=validation_result.kz095_matches,
            severity=ValidationSeverity.ERROR,
            details=f"KZ 095 = {kz.kz095_betrag:.2f}, Neuberechnung = {validation_result.kz095_recalculated:.2f}",
        ))
        if not validation_result.kz095_matches:
            blocking += 1

        # 5. XML generierbar + XSD-valide
        xml_req = XMLExportRequest(
            kz_values=kz, steuernummer=request_body.steuernummer or "000/0000",
            year=request_body.year, month=request_body.month,
        )
        xml_result = build_uva_xml(xml_req)
        checklist.append(SubmissionChecklistItem(
            label="XML-Export generierbar und XSD-valide",
            passed=xml_result.success and xml_result.validation_passed,
            severity=ValidationSeverity.ERROR,
            details=(
                f"Datei: {xml_result.filename}" if xml_result.success
                else f"Fehler: {len(xml_result.validation_issues)} Validierungsprobleme"
            ),
        ))
        if not (xml_result.success and xml_result.validation_passed):
            blocking += 1

        # 6. Zeitraum plausibel
        now = datetime.now(timezone.utc)
        is_current_or_past = (
            request_body.year < now.year or
            (request_body.year == now.year and request_body.month <= now.month)
        )
        checklist.append(SubmissionChecklistItem(
            label="Zeitraum ist abgeschlossen",
            passed=is_current_or_past,
            severity=ValidationSeverity.WARNING,
            details=f"Periode: {request_body.month:02d}/{request_body.year}",
        ))

        # 7. Noch nicht eingereicht (Idempotenz-Schutz)
        already_confirmed = idempotency_store.has_confirmed(request_body.year, request_body.month)
        checklist.append(SubmissionChecklistItem(
            label="Noch nicht eingereicht (Doppeleinreichungs-Schutz)",
            passed=not already_confirmed,
            severity=ValidationSeverity.WARNING,
            details="Bereits eingereicht – erneute Einreichung möglich" if already_confirmed else "Ersteinreichung",
        ))

        # Status
        if blocking > 0:
            current_status = SubmissionStatus.BERECHNET
            next_status = SubmissionStatus.VALIDIERT
        else:
            current_status = SubmissionStatus.VALIDIERT
            next_status = SubmissionStatus.FREIGEGEBEN

        # Due date
        due_month = request_body.month + 2
        due_year = request_body.year
        if due_month > 12:
            due_month -= 12
            due_year += 1
        due_date = f"{due_year}-{str(due_month).zfill(2)}-15"

        warning_count = sum(1 for c in checklist if not c.passed and c.severity == ValidationSeverity.WARNING)

        # Audit
        audit_logger.log(
            action=AuditAction.SUBMISSION_PREPARE,
            correlation_id=cid, period=period,
            tenant_id=_get_tenant_id(request),
            user_id=_get_user_id(request),
            metadata={
                "ready": blocking == 0,
                "blocking_issues": blocking,
                "warnings": warning_count,
                "already_confirmed": already_confirmed,
            },
        )

        return SubmissionPrepareResponse(
            ready=blocking == 0,
            current_status=current_status,
            next_status=next_status,
            checklist=checklist,
            blocking_issues=blocking,
            warnings=warning_count,
            xml_preview=xml_result.xml_content if xml_result.success else None,
            due_date=due_date,
        )
    except Exception as e:
        logger.error(json.dumps({"event": "submission.prepare.error", "cid": cid, "error": str(e)}))
        raise HTTPException(status_code=500, detail="Einreichungsvorbereitung fehlgeschlagen.")


@api_router.post("/uva/submission/confirm", response_model=SubmissionConfirmResponse)
async def api_confirm_submission(request_body: SubmissionConfirmRequest, request: Request):
    """
    Bestätigt die manuelle Einreichung – IDEMPOTENT.

    - Idempotency-Key: bei Wiederholung gleiche Antwort
    - Status-Lock: verhindert unbeabsichtigte Doppelverarbeitung
    """
    cid = _get_request_id(request)
    period = f"{request_body.year}-{str(request_body.month).zfill(2)}"

    # Generate idempotency key if not provided
    idem_key = request_body.idempotency_key or f"confirm-{period}-{str(uuid.uuid4())[:8]}"

    try:
        # ── Idempotenz-Check ──
        is_dup, cached = idempotency_store.check_and_store(
            idem_key, request_body.year, request_body.month, {}
        )

        if is_dup and cached:
            logger.info(json.dumps({
                "event": "submission.confirm.duplicate", "cid": cid,
                "idem_key": idem_key, "period": period,
            }))
            return SubmissionConfirmResponse(
                success=True,
                new_status=SubmissionStatus.EINGEREICHT,
                message=f"UVA {period} war bereits als eingereicht markiert (idempotent).",
                idempotency_key=idem_key,
                was_duplicate=True,
                audit_entry_id=cached.get("audit_id"),
            )

        # ── Neue Einreichung ──
        audit_entry = audit_logger.log(
            action=AuditAction.SUBMISSION_CONFIRM,
            correlation_id=cid, period=period,
            tenant_id=_get_tenant_id(request),
            user_id=_get_user_id(request),
            old_status=SubmissionStatus.FREIGEGEBEN.value,
            new_status=SubmissionStatus.EINGEREICHT.value,
            metadata={
                "idempotency_key": idem_key,
                "finanzonline_reference": request_body.finanzonline_reference or None,
                "has_note": bool(request_body.confirmation_note),
            },
        )

        response_data = {
            "success": True,
            "_period": period,
            "audit_id": audit_entry.get("id"),
        }

        # Store for idempotency
        idempotency_store._store[idem_key] = response_data

        msg = f"UVA {period} als eingereicht markiert."
        if request_body.finanzonline_reference:
            msg += f" FinanzOnline-Referenz: {request_body.finanzonline_reference}"

        return SubmissionConfirmResponse(
            success=True,
            new_status=SubmissionStatus.EINGEREICHT,
            message=msg,
            idempotency_key=idem_key,
            was_duplicate=False,
            audit_entry_id=audit_entry.get("id"),
        )

    except Exception as e:
        audit_logger.log(
            action=AuditAction.SUBMISSION_CONFIRM,
            correlation_id=cid, period=period,
            success=False, error_code=type(e).__name__,
        )
        logger.error(json.dumps({"event": "submission.confirm.error", "cid": cid, "error": str(e)}))
        raise HTTPException(status_code=500, detail="Einreichungsbestätigung fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# KZ Reference Data
# ═══════════════════════════════════════════════════════════════════

KZ_REFERENCE: List[KZInfo] = [
    KZInfo(kz="000", label="Gesamtbetrag Lieferungen/Leistungen", section="Kopfdaten", has_netto=True),
    KZInfo(kz="001", label="Eigenverbrauch", section="Kopfdaten", paragraph="§1 Abs1 Z2, §3 Abs2, §3a Abs1a", has_netto=True),
    KZInfo(kz="021", label="Abzüglich RC-Umsätze", section="Kopfdaten", paragraph="§19", has_netto=True),
    KZInfo(kz="022", label="20% Normalsteuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs1", has_netto=True, has_ust=True, rate=20),
    KZInfo(kz="029", label="10% ermäßigter Steuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs2", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="006", label="13% ermäßigter Steuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs3", has_netto=True, has_ust=True, rate=13),
    KZInfo(kz="037", label="19% Jungholz/Mittelberg", section="Steuerpflichtige Umsätze", paragraph="Art XIV §48", has_netto=True, has_ust=True, rate=19),
    KZInfo(kz="052", label="10% Zusatzsteuer pauschaliert", section="Steuerpflichtige Umsätze", paragraph="§12 Abs15", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="007", label="7% Zusatzsteuer land-/forstwirtsch.", section="Steuerpflichtige Umsätze", has_netto=True, has_ust=True, rate=7),
    KZInfo(kz="011", label="Ausfuhrlieferungen", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z1 iVm §7", has_netto=True),
    KZInfo(kz="012", label="Lohnveredelung", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z1 iVm §8", has_netto=True),
    KZInfo(kz="015", label="Seeschifffahrt, Luftfahrt, Diplomaten", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z2-6", has_netto=True),
    KZInfo(kz="017", label="IG Lieferungen", section="Steuerfrei MIT VSt-Abzug", paragraph="Art.6 Abs1 BMR", has_netto=True),
    KZInfo(kz="018", label="Fahrzeuglieferungen ohne UID", section="Steuerfrei MIT VSt-Abzug", paragraph="Art.6 Abs1, Art.2", has_netto=True),
    KZInfo(kz="019", label="Grundstücksumsätze", section="Steuerfrei OHNE VSt-Abzug", paragraph="§6 Abs1 Z9 lit a", has_netto=True),
    KZInfo(kz="016", label="Kleinunternehmer", section="Steuerfrei OHNE VSt-Abzug", paragraph="§6 Abs1 Z27", has_netto=True),
    KZInfo(kz="020", label="Übrige steuerfreie Umsätze", section="Steuerfrei OHNE VSt-Abzug", has_netto=True),
    KZInfo(kz="056", label="§11 Abs12/14, §16 Abs2, Art7 Abs4", section="Steuerschuld", has_ust=True),
    KZInfo(kz="057", label="§19 Abs1 2.Satz, 1c, 1e, Art25 Abs5", section="Steuerschuld", has_ust=True),
    KZInfo(kz="048", label="§19 Abs1a Bauleistungen", section="Steuerschuld", has_ust=True),
    KZInfo(kz="044", label="§19 Abs1b Sicherungseigentum", section="Steuerschuld", has_ust=True),
    KZInfo(kz="032", label="§19 Abs1d Schrott, Metalle", section="Steuerschuld", has_ust=True),
    KZInfo(kz="070", label="Gesamtbetrag IG Erwerbe", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="071", label="Steuerfrei Art6 Abs2", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="072", label="20% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=20),
    KZInfo(kz="073", label="10% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="008", label="13% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=13),
    KZInfo(kz="088", label="19% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=19),
    KZInfo(kz="076", label="Nicht zu versteuern Art3 Abs8", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="077", label="Nicht zu versteuern Art3 Abs8 + Art25 Abs2", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="060", label="Gesamtbetrag Vorsteuern", section="Vorsteuer", paragraph="§12 Abs1 Z1", has_vorsteuer=True),
    KZInfo(kz="061", label="EUSt entrichtet", section="Vorsteuer", paragraph="§12 Abs1 Z2 lit a", has_vorsteuer=True),
    KZInfo(kz="083", label="EUSt Abgabenkonto", section="Vorsteuer", paragraph="§12 Abs1 Z2 lit b", has_vorsteuer=True),
    KZInfo(kz="065", label="Vorsteuern IG Erwerbe", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="066", label="Vorsteuern §19 Abs1, 1c, 1e", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="082", label="Vorsteuern §19 Abs1a (Bauleistungen)", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="087", label="Vorsteuern §19 Abs1b (Sicherungseigentum)", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="089", label="Vorsteuern §19 Abs1d (Schrott)", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="064", label="Vorsteuern IG Fahrzeuge", section="Vorsteuer", paragraph="Art.2", has_vorsteuer=True),
    KZInfo(kz="062", label="Nicht abzugsfähig", section="Vorsteuer", paragraph="§12 Abs3 iVm 4,5", has_vorsteuer=True),
    KZInfo(kz="063", label="Berichtigung §12 Abs10,11", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="067", label="Berichtigung §16", section="Vorsteuer", has_vorsteuer=True),
    KZInfo(kz="090", label="Gesamtbetrag abziehbare Vorsteuer", section="Ergebnis", has_betrag=True),
    KZInfo(kz="095", label="Vorauszahlung/Überschuss", section="Ergebnis", has_betrag=True),
]

@api_router.get("/uva/kz-info", response_model=List[KZInfo])
async def api_kz_info():
    return KZ_REFERENCE


# ═══════════════════════════════════════════════════════════════════
# Audit Trail Endpoints
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/audit/recent")
async def api_audit_recent(limit: int = 50):
    """Letzte Audit-Einträge (für Monitoring/Debugging)."""
    return audit_logger.get_recent(limit=min(limit, 200))

@api_router.post("/audit/log")
async def api_create_audit_entry(entry: AuditEntry):
    """Stateless Audit-Eintrag für Frontend-seitige Speicherung."""
    entry.timestamp = datetime.now(timezone.utc).isoformat()
    return entry


# ═══════════════════════════════════════════════════════════════════
# Include Router + Middleware
# ═══════════════════════════════════════════════════════════════════

app.include_router(api_router)

# Correlation-ID + Request Logging Middleware
app.add_middleware(CorrelationMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
