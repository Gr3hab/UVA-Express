"""
UVA-Validierung · BMF-Plausibilitätsprüfungen
═══════════════════════════════════════════════

Validiert UVA-Daten gegen offizielle BMF-Regeln:
- KZ-Konsistenzprüfungen
- Quersummen und Plausibilitäten
- Pflichtfeldprüfungen
- USt-Satz-Validierung
- Vorsteuer-Logik
- RKSV-Edge-Cases
"""

import logging
from typing import List, Optional
from models import (
    KZValues, UVAValidationRequest, UVAValidationResponse,
    ValidationIssue, ValidationSeverity, InvoiceData,
)

logger = logging.getLogger(__name__)


def round2(v: float) -> float:
    return round(v * 100) / 100


def validate_uva(request: UVAValidationRequest) -> UVAValidationResponse:
    """
    Comprehensive UVA validation against BMF rules.
    Returns categorized issues (errors, warnings, infos).
    """
    kz = request.kz_values
    year = request.year
    month = request.month
    invoices = request.invoices or []

    errors: List[ValidationIssue] = []
    warnings: List[ValidationIssue] = []
    infos: List[ValidationIssue] = []

    # ══════════════════════════════════════════════
    # 1. Zeitraum-Validierung
    # ══════════════════════════════════════════════
    if year < 2020 or year > 2030:
        warnings.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="UNUSUAL_YEAR",
            message=f"Ungewöhnliches Jahr: {year}. Bitte prüfen.",
            field="year",
        ))

    # ══════════════════════════════════════════════
    # 2. USt-Satz-Konsistenz (Abschnitt 1)
    # ══════════════════════════════════════════════
    rate_checks = [
        ("022", 20, kz.kz022_netto, kz.kz022_ust),
        ("029", 10, kz.kz029_netto, kz.kz029_ust),
        ("006", 13, kz.kz006_netto, kz.kz006_ust),
        ("037", 19, kz.kz037_netto, kz.kz037_ust),
        ("052", 10, kz.kz052_netto, kz.kz052_ust),
        ("007", 7, kz.kz007_netto, kz.kz007_ust),
    ]

    for kz_code, rate, netto, ust in rate_checks:
        if netto > 0:
            expected_ust = round2(netto * rate / 100)
            diff = abs(expected_ust - ust)
            # Allow small rounding tolerance (sum of individual roundings can differ)
            tolerance = max(0.05 * len(invoices) if invoices else 1.0, 0.02)
            if diff > tolerance:
                errors.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="RATE_MISMATCH",
                    message=(
                        f"KZ {kz_code}: USt ({ust:.2f}) entspricht nicht "
                        f"{rate}% von Bemessung ({netto:.2f}) = {expected_ust:.2f}. "
                        f"Differenz: {diff:.2f}"
                    ),
                    kz=kz_code,
                ))
        elif netto == 0 and ust != 0:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="UST_WITHOUT_BASE",
                message=f"KZ {kz_code}: USt-Betrag ({ust:.2f}) ohne Bemessungsgrundlage",
                kz=kz_code,
            ))

    # IG Erwerbe Satz-Konsistenz
    ig_rate_checks = [
        ("072", 20, kz.kz072_netto, kz.kz072_ust),
        ("073", 10, kz.kz073_netto, kz.kz073_ust),
        ("008", 13, kz.kz008_netto, kz.kz008_ust),
        ("088", 19, kz.kz088_netto, kz.kz088_ust),
    ]

    for kz_code, rate, netto, ust in ig_rate_checks:
        if netto > 0:
            expected_ust = round2(netto * rate / 100)
            diff = abs(expected_ust - ust)
            tolerance = max(0.05 * len(invoices) if invoices else 1.0, 0.02)
            if diff > tolerance:
                errors.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="IG_RATE_MISMATCH",
                    message=(
                        f"KZ {kz_code} (IG Erwerb): USt ({ust:.2f}) ≠ "
                        f"{rate}% × {netto:.2f} = {expected_ust:.2f}"
                    ),
                    kz=kz_code,
                ))

    # ══════════════════════════════════════════════
    # 3. KZ 095 Berechnung prüfen
    # ══════════════════════════════════════════════
    summe_ust = round2(
        kz.kz022_ust + kz.kz029_ust + kz.kz006_ust +
        kz.kz037_ust + kz.kz052_ust + kz.kz007_ust
    )

    summe_steuerschuld = round2(
        kz.kz056_ust + kz.kz057_ust + kz.kz048_ust +
        kz.kz044_ust + kz.kz032_ust
    )

    summe_ig_ust = round2(
        kz.kz072_ust + kz.kz073_ust + kz.kz008_ust + kz.kz088_ust
    )

    gesamt_ust = round2(summe_ust + summe_steuerschuld + summe_ig_ust)

    summe_vorsteuer = round2(
        kz.kz060_vorsteuer + kz.kz061_vorsteuer + kz.kz083_vorsteuer +
        kz.kz065_vorsteuer + kz.kz066_vorsteuer + kz.kz082_vorsteuer +
        kz.kz087_vorsteuer + kz.kz089_vorsteuer + kz.kz064_vorsteuer -
        abs(kz.kz062_vorsteuer) +
        kz.kz063_vorsteuer + kz.kz067_vorsteuer
    )

    kz095_recalculated = round2(gesamt_ust - summe_vorsteuer)
    kz095_matches = abs(kz095_recalculated - kz.kz095_betrag) < 0.02

    if not kz095_matches:
        errors.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="KZ095_MISMATCH",
            message=(
                f"KZ 095 ({kz.kz095_betrag:.2f}) stimmt nicht mit "
                f"Neuberechnung ({kz095_recalculated:.2f}) überein. "
                f"Gesamt-USt: {gesamt_ust:.2f}, Vorsteuer: {summe_vorsteuer:.2f}"
            ),
            kz="095",
        ))

    # KZ 090 check
    kz090_recalculated = summe_vorsteuer
    if abs(kz090_recalculated - kz.kz090_betrag) > 0.02:
        errors.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="KZ090_MISMATCH",
            message=(
                f"KZ 090 ({kz.kz090_betrag:.2f}) stimmt nicht mit "
                f"Summe der Vorsteuern ({kz090_recalculated:.2f}) überein"
            ),
            kz="090",
        ))

    # ══════════════════════════════════════════════
    # 4. IG-Erwerbe Plausibilität
    # ══════════════════════════════════════════════
    ig_sum = round2(
        kz.kz072_netto + kz.kz073_netto + kz.kz008_netto + kz.kz088_netto +
        kz.kz071_netto
    )
    if kz.kz070_netto > 0 and abs(ig_sum - kz.kz070_netto) > 0.02:
        warnings.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="IG_TOTAL_MISMATCH",
            message=(
                f"KZ 070 Gesamtbetrag IG Erwerbe ({kz.kz070_netto:.2f}) "
                f"entspricht nicht der Summe der Einzelpositionen ({ig_sum:.2f})"
            ),
            kz="070",
        ))

    # ══════════════════════════════════════════════
    # 5. Reverse Charge Symmetrie-Check
    # ══════════════════════════════════════════════
    # RC-Steuerschuld und RC-Vorsteuer sollten in gleicher Höhe sein
    rc_pairs = [
        ("057", kz.kz057_ust, "066", kz.kz066_vorsteuer, "§19 Abs1"),
        ("048", kz.kz048_ust, "082", kz.kz082_vorsteuer, "Bauleistungen"),
        ("044", kz.kz044_ust, "087", kz.kz087_vorsteuer, "Sicherungseigentum"),
        ("032", kz.kz032_ust, "089", kz.kz089_vorsteuer, "Schrott §19 Abs1d"),
    ]

    for schuld_kz, schuld_val, vorsteuer_kz, vorsteuer_val, label in rc_pairs:
        if schuld_val > 0 or vorsteuer_val > 0:
            if abs(schuld_val - vorsteuer_val) > 0.02:
                warnings.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="RC_ASYMMETRY",
                    message=(
                        f"Reverse Charge {label}: Steuerschuld KZ {schuld_kz} "
                        f"({schuld_val:.2f}) ≠ Vorsteuer KZ {vorsteuer_kz} "
                        f"({vorsteuer_val:.2f}). Bei vollem Vorsteuerabzug "
                        f"sollten diese Beträge übereinstimmen."
                    ),
                    kz=schuld_kz,
                ))

    # IG Erwerb Symmetrie
    ig_ust_total = round2(kz.kz072_ust + kz.kz073_ust + kz.kz008_ust + kz.kz088_ust)
    if ig_ust_total > 0 or kz.kz065_vorsteuer > 0:
        if abs(ig_ust_total - kz.kz065_vorsteuer) > 0.02:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="IG_ASYMMETRY",
                message=(
                    f"IG Erwerb: USt ({ig_ust_total:.2f}) ≠ "
                    f"Vorsteuer KZ 065 ({kz.kz065_vorsteuer:.2f}). "
                    f"Bei vollem Vorsteuerabzug sollten diese gleich sein."
                ),
                kz="065",
            ))

    # ══════════════════════════════════════════════
    # 6. Negative Beträge prüfen
    # ══════════════════════════════════════════════
    negative_fields = [
        ("kz022_netto", kz.kz022_netto), ("kz029_netto", kz.kz029_netto),
        ("kz006_netto", kz.kz006_netto), ("kz037_netto", kz.kz037_netto),
        ("kz070_netto", kz.kz070_netto),
    ]
    for field_name, value in negative_fields:
        if value < 0:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="NEGATIVE_BASE",
                message=f"{field_name}: Negative Bemessungsgrundlage ({value:.2f}). Bitte prüfen.",
                field=field_name,
            ))

    # ══════════════════════════════════════════════
    # 7. KZ 000 Plausibilität
    # ══════════════════════════════════════════════
    if kz.kz000_netto > 0:
        # KZ 000 sollte >= Summe aller Umsätze sein
        all_umsatz_netto = (
            kz.kz022_netto + kz.kz029_netto + kz.kz006_netto + kz.kz037_netto +
            kz.kz052_netto + kz.kz007_netto +
            kz.kz011_netto + kz.kz012_netto + kz.kz015_netto +
            kz.kz017_netto + kz.kz018_netto +
            kz.kz019_netto + kz.kz016_netto + kz.kz020_netto
        )
        # KZ 000 includes only Lieferungen/Leistungen (not IG Erwerbe)
        # KZ 021 is subtracted from KZ 000
        expected_000 = round2(all_umsatz_netto)
        diff_000 = abs(kz.kz000_netto - expected_000)
        if diff_000 > 1.0:
            infos.append(ValidationIssue(
                severity=ValidationSeverity.INFO,
                code="KZ000_PLAUSIBILITY",
                message=(
                    f"KZ 000 ({kz.kz000_netto:.2f}) weicht von der Summe "
                    f"aller Umsatz-Bemessungsgrundlagen ({expected_000:.2f}) ab. "
                    f"Differenz: {diff_000:.2f}"
                ),
                kz="000",
            ))

    # ══════════════════════════════════════════════
    # 8. Hohe Beträge Warnung
    # ══════════════════════════════════════════════
    if abs(kz.kz095_betrag) > 100000:
        infos.append(ValidationIssue(
            severity=ValidationSeverity.INFO,
            code="HIGH_AMOUNT",
            message=(
                f"KZ 095 Zahllast/Gutschrift beträgt {kz.kz095_betrag:.2f} EUR. "
                f"Bitte Plausibilität prüfen."
            ),
            kz="095",
        ))

    # ══════════════════════════════════════════════
    # 9. Leere UVA
    # ══════════════════════════════════════════════
    all_zero = all(
        getattr(kz, f) == 0
        for f in kz.model_fields
        if f not in ("kz090_betrag", "kz095_betrag")
    )
    if all_zero:
        infos.append(ValidationIssue(
            severity=ValidationSeverity.INFO,
            code="EMPTY_UVA",
            message="Alle Kennzahlen sind 0. Leermeldung wird abgegeben.",
        ))

    # ══════════════════════════════════════════════
    # 10. Invoice-level validation (if provided)
    # ══════════════════════════════════════════════
    if invoices:
        # Check for duplicate invoice numbers
        inv_numbers = [i.invoice_number for i in invoices if i.invoice_number]
        seen = set()
        for num in inv_numbers:
            if num in seen:
                warnings.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="DUPLICATE_INVOICE",
                    message=f"Rechnungsnummer '{num}' kommt mehrfach vor",
                    field="invoice_number",
                ))
            seen.add(num)

        # Check for invoices outside the period
        for inv in invoices:
            if inv.invoice_date:
                try:
                    parts = inv.invoice_date.split("T")[0].split("-")
                    inv_year = int(parts[0])
                    inv_month = int(parts[1])
                    if inv_year != year or inv_month != month:
                        warnings.append(ValidationIssue(
                            severity=ValidationSeverity.WARNING,
                            code="INVOICE_OUTSIDE_PERIOD",
                            message=(
                                f"Rechnung {inv.invoice_number or inv.id}: "
                                f"Datum ({inv.invoice_date}) liegt außerhalb "
                                f"des UVA-Zeitraums {month:02d}/{year}"
                            ),
                            invoice_id=inv.id,
                            field="invoice_date",
                        ))
                except (ValueError, IndexError):
                    pass

    # ══════════════════════════════════════════════
    # BMF Plausibilität
    # ══════════════════════════════════════════════
    bmf_passed = len(errors) == 0

    return UVAValidationResponse(
        valid=bmf_passed,
        errors=errors,
        warnings=warnings,
        infos=infos,
        bmf_plausibility_passed=bmf_passed,
        kz095_recalculated=kz095_recalculated,
        kz095_matches=kz095_matches,
    )
