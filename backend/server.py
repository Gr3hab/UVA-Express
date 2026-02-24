"""
UVA Express – FastAPI Backend Server
════════════════════════════════════════

Go-live V1 API:
- /api/uva/calculate    → UVA-Berechnung aus Rechnungsdaten
- /api/uva/validate     → BMF-Plausibilitätsprüfung
- /api/uva/export-xml   → BMF-konformer XML-Export
- /api/rksv/validate    → RKSV-Datenvalidierung
- /api/uva/submission   → Einreichungspipeline
- /api/uva/kz-info      → KZ-Referenzdaten
"""

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI(
    title="UVA Express API",
    description="Österreichische Umsatzsteuervoranmeldung – Go-live V1",
    version="1.0.0",
)

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {
        "service": "UVA Express API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "uva-calculation",
            "uva-validation",
            "xml-export",
            "rksv-validation",
            "submission-pipeline",
        ],
    }


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


# ═══════════════════════════════════════════════════════════════════
# UVA Calculation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/calculate", response_model=UVACalculationResponse)
async def api_calculate_uva(request: UVACalculationRequest):
    """
    Berechnet die UVA aus den übergebenen Rechnungsdaten.

    Alle Kennzahlen (KZ) gemäß Formular U 30 (2026) werden berechnet.
    """
    try:
        logger.info(
            f"UVA calculation: {request.year}-{request.month:02d}, "
            f"{len(request.invoices)} Rechnungen"
        )
        result = calculate_uva(request)
        logger.info(
            f"UVA calculated: KZ095={result.kz_values.kz095_betrag:.2f}, "
            f"{result.summary.ausgang_count} Ausgang, "
            f"{result.summary.eingang_count} Eingang"
        )
        return result
    except Exception as e:
        logger.error(f"UVA calculation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="UVA-Berechnung fehlgeschlagen. Bitte prüfen Sie die Eingabedaten."
        )


# ═══════════════════════════════════════════════════════════════════
# UVA Validation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/validate", response_model=UVAValidationResponse)
async def api_validate_uva(request: UVAValidationRequest):
    """
    Validiert die UVA-Kennzahlen gegen BMF-Plausibilitätsregeln.

    Prüft Quersummen, USt-Satz-Konsistenz, RC-Symmetrie, etc.
    """
    try:
        logger.info(f"UVA validation: {request.year}-{request.month:02d}")
        result = validate_uva(request)
        logger.info(
            f"Validation result: valid={result.valid}, "
            f"{len(result.errors)} errors, {len(result.warnings)} warnings"
        )
        return result
    except Exception as e:
        logger.error(f"UVA validation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="UVA-Validierung fehlgeschlagen."
        )


# ═══════════════════════════════════════════════════════════════════
# XML Export
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/export-xml")
async def api_export_xml(request: XMLExportRequest):
    """
    Generiert BMF-konformes XML für FinanzOnline-Upload.

    Format: ERKLAERUNGENPAKET mit U30-Erklaerung.
    """
    try:
        logger.info(
            f"XML export: {request.year}-{request.month:02d}, "
            f"Steuernummer: {request.steuernummer[:5]}..."
        )
        result = build_uva_xml(request)

        if not result.success:
            return result

        # Return as downloadable XML file
        filename = result.filename
        return Response(
            content=result.xml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Validation-Passed": str(result.validation_passed).lower(),
            },
        )
    except Exception as e:
        logger.error(f"XML export failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="XML-Export fehlgeschlagen."
        )


@api_router.post("/uva/export-xml-json", response_model=XMLExportResponse)
async def api_export_xml_json(request: XMLExportRequest):
    """
    Returns XML as JSON (for frontend preview/processing).
    """
    try:
        result = build_uva_xml(request)
        return result
    except Exception as e:
        logger.error(f"XML export (JSON) failed: {e}")
        raise HTTPException(status_code=500, detail="XML-Export fehlgeschlagen.")


# ═══════════════════════════════════════════════════════════════════
# RKSV Validation
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/rksv/validate", response_model=RKSVValidationResponse)
async def api_validate_rksv(request: RKSVValidationRequest):
    """
    Validiert RKSV-Belegdaten (Kassen-ID, Belegnr, QR-Daten).

    V1: Format- und Plausibilitätsprüfung, keine Signaturprüfung.
    """
    try:
        logger.info(f"RKSV validation: {len(request.receipts)} Belege")
        result = validate_rksv(request)
        logger.info(
            f"RKSV result: {result.valid_receipts}/{result.total_receipts} valid"
        )
        return result
    except Exception as e:
        logger.error(f"RKSV validation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="RKSV-Validierung fehlgeschlagen."
        )


# ═══════════════════════════════════════════════════════════════════
# Submission Pipeline
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/uva/submission/prepare", response_model=SubmissionPrepareResponse)
async def api_prepare_submission(request: SubmissionPrepareRequest):
    """
    Bereitet die UVA-Einreichung vor.

    Prüft alle Voraussetzungen und erstellt eine Checkliste.
    Workflow: Entwurf → Berechnet → Validiert → Freigegeben → Eingereicht
    """
    try:
        kz = request.kz_values
        checklist: List[SubmissionChecklistItem] = []
        blocking = 0

        # 1. Steuernummer vorhanden
        has_stnr = bool(request.steuernummer and len(request.steuernummer) >= 5)
        checklist.append(SubmissionChecklistItem(
            label="Steuernummer vorhanden",
            passed=has_stnr,
            severity=ValidationSeverity.ERROR,
            details=f"Steuernummer: {request.steuernummer}" if has_stnr else "Bitte Steuernummer eingeben",
        ))
        if not has_stnr:
            blocking += 1

        # 2. UVA berechnet (has data)
        has_data = any(
            getattr(kz, f) != 0
            for f in kz.model_fields
            if f not in ("kz090_betrag", "kz095_betrag")
        )
        has_kz095 = kz.kz095_betrag != 0 or has_data  # Allow Leermeldung
        checklist.append(SubmissionChecklistItem(
            label="UVA berechnet",
            passed=True,  # Always true if we have KZ values
            severity=ValidationSeverity.ERROR,
            details=f"KZ 095: {kz.kz095_betrag:.2f} EUR" if has_kz095 else "Leermeldung",
        ))

        # 3. BMF Validation
        from uva_validator import validate_uva as _validate
        validation_req = UVAValidationRequest(
            kz_values=kz,
            year=request.year,
            month=request.month,
            invoices=request.invoices,
        )
        validation_result = _validate(validation_req)

        checklist.append(SubmissionChecklistItem(
            label="BMF-Plausibilitätsprüfung bestanden",
            passed=validation_result.valid,
            severity=ValidationSeverity.ERROR,
            details=(
                f"{len(validation_result.errors)} Fehler, "
                f"{len(validation_result.warnings)} Warnungen"
            ),
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

        # 5. XML generierbar
        from uva_xml import build_uva_xml as _build_xml
        xml_req = XMLExportRequest(
            kz_values=kz,
            steuernummer=request.steuernummer or "000/0000",
            year=request.year,
            month=request.month,
        )
        xml_result = _build_xml(xml_req)
        checklist.append(SubmissionChecklistItem(
            label="XML-Export generierbar",
            passed=xml_result.success,
            severity=ValidationSeverity.ERROR,
            details=f"Datei: {xml_result.filename}" if xml_result.success else "XML-Generierung fehlgeschlagen",
        ))
        if not xml_result.success:
            blocking += 1

        # 6. Zeitraum plausibel
        now = datetime.utcnow()
        is_current_or_past = (
            request.year < now.year or
            (request.year == now.year and request.month <= now.month)
        )
        checklist.append(SubmissionChecklistItem(
            label="Zeitraum ist abgeschlossen",
            passed=is_current_or_past,
            severity=ValidationSeverity.WARNING,
            details=f"Periode: {request.month:02d}/{request.year}",
        ))

        # 7. Rechnungsanzahl > 0
        inv_count = len(request.invoices) if request.invoices else 0
        checklist.append(SubmissionChecklistItem(
            label="Rechnungen zugeordnet",
            passed=inv_count > 0 or not has_data,
            severity=ValidationSeverity.WARNING,
            details=f"{inv_count} Rechnungen" if inv_count > 0 else "Leermeldung (keine Rechnungen)",
        ))

        # Determine status
        if blocking > 0:
            current_status = SubmissionStatus.BERECHNET
            next_status = SubmissionStatus.VALIDIERT
        else:
            current_status = SubmissionStatus.VALIDIERT
            next_status = SubmissionStatus.FREIGEGEBEN

        # Due date
        due_month = request.month + 2
        due_year = request.year
        if due_month > 12:
            due_month -= 12
            due_year += 1
        due_date = f"{due_year}-{str(due_month).zfill(2)}-15"

        warning_count = sum(
            1 for c in checklist
            if not c.passed and c.severity == ValidationSeverity.WARNING
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
        logger.error(f"Submission preparation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Einreichungsvorbereitung fehlgeschlagen."
        )


@api_router.post("/uva/submission/confirm", response_model=SubmissionConfirmResponse)
async def api_confirm_submission(request: SubmissionConfirmRequest):
    """
    Bestätigt die manuelle Einreichung der UVA.

    V1: Manuelle Bestätigung nach XML-Upload auf FinanzOnline.
    Phase 2: Automatische FinanzOnline-Webservice-Übermittlung.
    """
    try:
        logger.info(
            f"Submission confirmed: {request.year}-{request.month:02d}, "
            f"Reference: {request.finanzonline_reference or 'none'}"
        )

        return SubmissionConfirmResponse(
            success=True,
            new_status=SubmissionStatus.EINGEREICHT,
            message=(
                f"UVA {request.month:02d}/{request.year} als eingereicht markiert. "
                + (f"FinanzOnline-Referenz: {request.finanzonline_reference}" if request.finanzonline_reference else "")
            ),
        )
    except Exception as e:
        logger.error(f"Submission confirmation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Einreichungsbestätigung fehlgeschlagen."
        )


# ═══════════════════════════════════════════════════════════════════
# KZ Reference Data
# ═══════════════════════════════════════════════════════════════════

KZ_REFERENCE: List[KZInfo] = [
    # Kopfdaten
    KZInfo(kz="000", label="Gesamtbetrag Lieferungen/Leistungen", section="Kopfdaten", has_netto=True),
    KZInfo(kz="001", label="Eigenverbrauch", section="Kopfdaten", paragraph="§1 Abs1 Z2, §3 Abs2, §3a Abs1a", has_netto=True),
    KZInfo(kz="021", label="Abzüglich RC-Umsätze", section="Kopfdaten", paragraph="§19", has_netto=True),
    # Abschnitt 1
    KZInfo(kz="022", label="20% Normalsteuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs1", has_netto=True, has_ust=True, rate=20),
    KZInfo(kz="029", label="10% ermäßigter Steuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs2", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="006", label="13% ermäßigter Steuersatz", section="Steuerpflichtige Umsätze", paragraph="§10 Abs3", has_netto=True, has_ust=True, rate=13),
    KZInfo(kz="037", label="19% Jungholz/Mittelberg", section="Steuerpflichtige Umsätze", paragraph="Art XIV §48", has_netto=True, has_ust=True, rate=19),
    KZInfo(kz="052", label="10% Zusatzsteuer pauschaliert", section="Steuerpflichtige Umsätze", paragraph="§12 Abs15", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="007", label="7% Zusatzsteuer land-/forstwirtsch.", section="Steuerpflichtige Umsätze", has_netto=True, has_ust=True, rate=7),
    # Abschnitt 2
    KZInfo(kz="011", label="Ausfuhrlieferungen", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z1 iVm §7", has_netto=True),
    KZInfo(kz="012", label="Lohnveredelung", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z1 iVm §8", has_netto=True),
    KZInfo(kz="015", label="Seeschifffahrt, Luftfahrt, Diplomaten", section="Steuerfrei MIT VSt-Abzug", paragraph="§6 Abs1 Z2-6", has_netto=True),
    KZInfo(kz="017", label="IG Lieferungen", section="Steuerfrei MIT VSt-Abzug", paragraph="Art.6 Abs1 BMR", has_netto=True),
    KZInfo(kz="018", label="Fahrzeuglieferungen ohne UID", section="Steuerfrei MIT VSt-Abzug", paragraph="Art.6 Abs1, Art.2", has_netto=True),
    # Abschnitt 3
    KZInfo(kz="019", label="Grundstücksumsätze", section="Steuerfrei OHNE VSt-Abzug", paragraph="§6 Abs1 Z9 lit a", has_netto=True),
    KZInfo(kz="016", label="Kleinunternehmer", section="Steuerfrei OHNE VSt-Abzug", paragraph="§6 Abs1 Z27", has_netto=True),
    KZInfo(kz="020", label="Übrige steuerfreie Umsätze", section="Steuerfrei OHNE VSt-Abzug", has_netto=True),
    # Abschnitt 4
    KZInfo(kz="056", label="§11 Abs12/14, §16 Abs2, Art7 Abs4", section="Steuerschuld", has_ust=True),
    KZInfo(kz="057", label="§19 Abs1 2.Satz, 1c, 1e, Art25 Abs5", section="Steuerschuld", has_ust=True),
    KZInfo(kz="048", label="§19 Abs1a Bauleistungen", section="Steuerschuld", has_ust=True),
    KZInfo(kz="044", label="§19 Abs1b Sicherungseigentum", section="Steuerschuld", has_ust=True),
    KZInfo(kz="032", label="§19 Abs1d Schrott, Metalle", section="Steuerschuld", has_ust=True),
    # Abschnitt 5
    KZInfo(kz="070", label="Gesamtbetrag IG Erwerbe", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="071", label="Steuerfrei Art6 Abs2", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="072", label="20% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=20),
    KZInfo(kz="073", label="10% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=10),
    KZInfo(kz="008", label="13% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=13),
    KZInfo(kz="088", label="19% IG Erwerbe", section="IG Erwerbe", has_netto=True, has_ust=True, rate=19),
    KZInfo(kz="076", label="Nicht zu versteuern Art3 Abs8", section="IG Erwerbe", has_netto=True),
    KZInfo(kz="077", label="Nicht zu versteuern Art3 Abs8 + Art25 Abs2", section="IG Erwerbe", has_netto=True),
    # Abschnitt 6
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
    # Ergebnis
    KZInfo(kz="090", label="Gesamtbetrag abziehbare Vorsteuer", section="Ergebnis", has_betrag=True),
    KZInfo(kz="095", label="Vorauszahlung/Überschuss", section="Ergebnis", has_betrag=True),
]


@api_router.get("/uva/kz-info", response_model=List[KZInfo])
async def api_kz_info():
    """Returns reference data for all Kennzahlen."""
    return KZ_REFERENCE


# ═══════════════════════════════════════════════════════════════════
# Audit Trail (stateless – returns calculated entries)
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/audit/log", response_model=AuditEntry)
async def api_create_audit_entry(entry: AuditEntry):
    """
    Creates an audit entry (stateless – returns the entry for frontend to store in Supabase).
    """
    entry.timestamp = datetime.utcnow().isoformat()
    logger.info(f"Audit: {entry.action} on {entry.entity_type}/{entry.entity_id}")
    return entry


# Include the router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
