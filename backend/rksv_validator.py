"""
RKSV-Validierung (Registrierkassensicherheitsverordnung)
═══════════════════════════════════════════════════════════

V1: Datenerfassung + Plausibilitätsvalidierung
- Kassen-ID Format-Check
- Belegnummer Format-Check
- QR-Daten Format-Check (DEP-Export-Struktur)
- Plausibilitätsprüfungen

Referenz: BMF Registrierkassen-Detailspezifikation
https://www.bmf.gv.at/public/informationen/registrierkassen-beispiele-detailspezifikation.html

Phase 2 (nicht in V1): Vollständige RKSV-Signaturprüfung via fiskaltrust/fiskaly
"""

import re
import base64
import logging
from typing import List
from models import (
    RKSVData, RKSVValidationRequest, RKSVValidationResponse,
    ValidationIssue, ValidationSeverity,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# RKSV Format Patterns
# ═══════════════════════════════════════════════════════════════════

# Kassen-ID: alphanumerisch, max 36 Zeichen (UUID-Format oder benutzerdefiniert)
KASSENID_PATTERN = re.compile(r'^[a-zA-Z0-9\-_]{1,36}$')

# Belegnummer: numerisch oder alphanumerisch, max 20 Zeichen
BELEGNR_PATTERN = re.compile(r'^[a-zA-Z0-9\-/]{1,20}$')

# QR-Code Daten: Mindestens die grundlegenden Felder
# Format: _R1-AT0_KassenID_Belegnr_Datum_Betrag-Normal_Betrag-Ermaessigt1_...
QR_PREFIX = '_R1-AT'
QR_FIELD_COUNT = 13  # Mindestanzahl Felder im QR-Code-String


def _validate_kassenid(kassenid: str, idx: int) -> List[ValidationIssue]:
    """Validate RKSV Kassen-ID format."""
    issues: List[ValidationIssue] = []

    if not kassenid:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_KASSENID_MISSING",
            message=f"Beleg {idx + 1}: Kassen-ID fehlt",
            field="rksv_kassenid",
        ))
        return issues

    kassenid = kassenid.strip()

    if not KASSENID_PATTERN.match(kassenid):
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_KASSENID_FORMAT",
            message=(
                f"Beleg {idx + 1}: Kassen-ID '{kassenid}' hat ungültiges Format. "
                f"Erlaubt: alphanumerisch, Bindestrich, Unterstrich, max 36 Zeichen."
            ),
            field="rksv_kassenid",
        ))

    if len(kassenid) < 3:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="RKSV_KASSENID_SHORT",
            message=f"Beleg {idx + 1}: Kassen-ID '{kassenid}' ist ungewöhnlich kurz",
            field="rksv_kassenid",
        ))

    return issues


def _validate_belegnr(belegnr: str, idx: int) -> List[ValidationIssue]:
    """Validate RKSV Belegnummer format."""
    issues: List[ValidationIssue] = []

    if not belegnr:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_BELEGNR_MISSING",
            message=f"Beleg {idx + 1}: Belegnummer fehlt",
            field="rksv_belegnr",
        ))
        return issues

    belegnr = belegnr.strip()

    if not BELEGNR_PATTERN.match(belegnr):
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_BELEGNR_FORMAT",
            message=(
                f"Beleg {idx + 1}: Belegnummer '{belegnr}' hat ungültiges Format. "
                f"Erlaubt: alphanumerisch, Bindestrich, Schrägstrich, max 20 Zeichen."
            ),
            field="rksv_belegnr",
        ))

    return issues


def _validate_qr_data(qr_data: str, idx: int) -> List[ValidationIssue]:
    """
    Validate RKSV QR-Code data structure.

    QR-Code Format (vereinfacht):
    _R1-AT0_KassenID_Belegnr_Datum-Uhrzeit_Betrag-Normal_Betrag-Ermaessigt1_
    Betrag-Ermaessigt2_Betrag-Null_Betrag-Besonders_Stand-Umsatzzaehler_
    Zertifikatseriennummer_Signatur-Voriger-Beleg_Signatur
    
    Felder getrennt durch '_'
    """
    issues: List[ValidationIssue] = []

    if not qr_data:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="RKSV_QR_MISSING",
            message=f"Beleg {idx + 1}: QR-Daten fehlen",
            field="rksv_qr_data",
        ))
        return issues

    qr_data = qr_data.strip()

    # Check prefix
    if not qr_data.startswith(QR_PREFIX):
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_QR_PREFIX",
            message=(
                f"Beleg {idx + 1}: QR-Daten beginnen nicht mit '{QR_PREFIX}'. "
                f"RKSV-konformer QR-Code muss mit '_R1-AT' beginnen."
            ),
            field="rksv_qr_data",
        ))
        return issues

    # Split into fields
    fields = qr_data.split('_')
    # Remove empty strings from leading/trailing underscores
    fields = [f for f in fields if f]

    if len(fields) < QR_FIELD_COUNT:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="RKSV_QR_INCOMPLETE",
            message=(
                f"Beleg {idx + 1}: QR-Daten haben nur {len(fields)} Felder, "
                f"erwartet werden mindestens {QR_FIELD_COUNT}. "
                f"Möglicherweise unvollständig."
            ),
            field="rksv_qr_data",
        ))

    # Check that QR data is not excessively long (potential injection)
    if len(qr_data) > 1500:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="RKSV_QR_TOO_LONG",
            message=f"Beleg {idx + 1}: QR-Daten sind ungewöhnlich lang ({len(qr_data)} Zeichen)",
            field="rksv_qr_data",
        ))

    # Basic structure validation of amount fields
    if len(fields) >= 9:
        amount_fields = fields[4:9]  # Fields 5-9 are amounts
        for i, amt in enumerate(amount_fields):
            try:
                # Amounts can be in the format: 1234 (Cents) or base64 encoded
                if amt and not amt.startswith('='):
                    # Try to decode as base64 (encrypted amounts use base64)
                    try:
                        base64.b64decode(amt)
                    except Exception:
                        # Not base64, try as number
                        try:
                            float(amt.replace(',', '.'))
                        except ValueError:
                            issues.append(ValidationIssue(
                                severity=ValidationSeverity.WARNING,
                                code="RKSV_QR_AMOUNT_FORMAT",
                                message=(
                                    f"Beleg {idx + 1}: Betragsfeld {i + 1} im QR-Code "
                                    f"hat ungewöhnliches Format: '{amt[:20]}'"
                                ),
                                field="rksv_qr_data",
                            ))
            except Exception:
                pass

    return issues


def _validate_receipt_plausibility(receipt: RKSVData, idx: int) -> List[ValidationIssue]:
    """Additional plausibility checks for RKSV receipts."""
    issues: List[ValidationIssue] = []

    # Betrag should be positive
    if receipt.betrag is not None and receipt.betrag < 0:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="RKSV_NEGATIVE_AMOUNT",
            message=(
                f"Beleg {idx + 1}: Negativer Betrag ({receipt.betrag:.2f}). "
                f"Stornobeleg? Bitte prüfen."
            ),
            field="betrag",
        ))

    # Date validation
    if receipt.datum:
        try:
            from datetime import date as dt_date
            parts = receipt.datum.split("T")[0].split("-")
            dt = dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
            # Plausibility: not in the future
            from datetime import date
            if dt > date.today():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="RKSV_FUTURE_DATE",
                    message=f"Beleg {idx + 1}: Datum ({receipt.datum}) liegt in der Zukunft",
                    field="datum",
                ))
        except (ValueError, IndexError):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="RKSV_INVALID_DATE",
                message=f"Beleg {idx + 1}: Ungültiges Datum '{receipt.datum}'",
                field="datum",
            ))

    # Cross-check: if QR data present, Kassen-ID and Belegnr should match
    if receipt.rksv_qr_data and receipt.rksv_kassenid:
        qr_fields = [f for f in receipt.rksv_qr_data.split('_') if f]
        if len(qr_fields) >= 3:
            # Field 2 should be Kassen-ID
            qr_kassenid = qr_fields[1] if len(qr_fields) > 1 else ""
            if qr_kassenid and qr_kassenid != receipt.rksv_kassenid:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="RKSV_KASSENID_MISMATCH",
                    message=(
                        f"Beleg {idx + 1}: Kassen-ID '{receipt.rksv_kassenid}' "
                        f"stimmt nicht mit QR-Daten-Kassen-ID '{qr_kassenid}' überein"
                    ),
                    field="rksv_kassenid",
                ))

    return issues


def validate_rksv(request: RKSVValidationRequest) -> RKSVValidationResponse:
    """
    Validate RKSV receipt data for plausibility and format compliance.

    V1 Scope:
    - Format validation (Kassen-ID, Belegnummer, QR-Code)
    - Plausibility checks (amounts, dates, cross-references)
    - No signature verification (Phase 2)
    """
    all_issues: List[ValidationIssue] = []
    valid_count = 0
    invalid_count = 0

    # Check for duplicate Belegnummern within same Kasse
    belegnr_map: dict = {}

    for idx, receipt in enumerate(request.receipts):
        receipt_issues: List[ValidationIssue] = []

        # Validate individual fields
        if receipt.rksv_kassenid:
            receipt_issues.extend(_validate_kassenid(receipt.rksv_kassenid, idx))

        if receipt.rksv_belegnr:
            receipt_issues.extend(_validate_belegnr(receipt.rksv_belegnr, idx))

        if receipt.rksv_qr_data:
            receipt_issues.extend(_validate_qr_data(receipt.rksv_qr_data, idx))

        # Plausibility
        receipt_issues.extend(_validate_receipt_plausibility(receipt, idx))

        # Duplicate check
        if receipt.rksv_kassenid and receipt.rksv_belegnr:
            key = f"{receipt.rksv_kassenid}:{receipt.rksv_belegnr}"
            if key in belegnr_map:
                receipt_issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="RKSV_DUPLICATE_BELEG",
                    message=(
                        f"Beleg {idx + 1}: Doppelte Belegnummer '{receipt.rksv_belegnr}' "
                        f"für Kasse '{receipt.rksv_kassenid}' "
                        f"(bereits bei Beleg {belegnr_map[key] + 1})"
                    ),
                    field="rksv_belegnr",
                ))
            else:
                belegnr_map[key] = idx

        # Count valid/invalid
        has_errors = any(
            i.severity == ValidationSeverity.ERROR for i in receipt_issues
        )
        if has_errors:
            invalid_count += 1
        else:
            valid_count += 1

        all_issues.extend(receipt_issues)

    return RKSVValidationResponse(
        valid=invalid_count == 0,
        total_receipts=len(request.receipts),
        valid_receipts=valid_count,
        invalid_receipts=invalid_count,
        issues=all_issues,
    )
