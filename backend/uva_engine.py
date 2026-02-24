"""
UVA-Berechnungsengine · Formular U 30 (2026) · Österreichisches UStG 1994
═══════════════════════════════════════════════════════════════════════════

100% automatische, robuste Engine für die Umsatzsteuervoranmeldung.
Alle Kennzahlen (KZ) gemäß offiziellem BMF-Formular.

Steuersätze: 20%, 10%, 13%, 19% (Jungholz/Mittelberg), 7%, 5%
Behandlungen: Normal, Export, IG-Lieferung, IG-Erwerb, Reverse Charge,
              Bauleistungen, Schrott, Einfuhr, Grundstück, Kleinunternehmer

RKSV-Belege werden mitverarbeitet und in der Berechnung berücksichtigt.
"""

import logging
from typing import List, Dict, Tuple, Optional
from models import (
    InvoiceData, InvoiceType, TaxTreatment, KZValues,
    UVACalculationRequest, UVACalculationResponse, UVASummary,
    InvoiceProcessingDetail, ValidationIssue, ValidationSeverity,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# Rate → KZ Mapping
# ═══════════════════════════════════════════════════════════════════

# Steuerpflichtige Umsätze (Ausgang normal)
RATE_TO_KZ: Dict[int, str] = {
    20: "022",
    10: "029",
    13: "006",
    19: "037",
    7: "007",
    5: "007",  # Historisch, mapped zu 007
}

# IG Erwerbe (Eingang IG)
IG_RATE_TO_KZ: Dict[int, str] = {
    20: "072",
    10: "073",
    13: "008",
    19: "088",
}

# Reverse Charge treatment → (Steuerschuld KZ, Vorsteuer KZ)
RC_TREATMENT_MAP: Dict[str, Tuple[str, str]] = {
    "reverse_charge_19_1":     ("057_ust", "066_vorsteuer"),
    "reverse_charge_19_1a":    ("048_ust", "082_vorsteuer"),  # Bauleistungen
    "reverse_charge_19_1b":    ("044_ust", "087_vorsteuer"),  # Sicherungseigentum
    "reverse_charge_19_1d":    ("032_ust", "089_vorsteuer"),  # Schrott
    "reverse_charge_19_1_3_4": ("057_ust", "066_vorsteuer"),  # §19 Abs1 3.+4. Satz
}


def round2(v: float) -> float:
    """Austrian Cent-rounding (kaufmännisches Runden)."""
    return round(v * 100) / 100


def _compute_vat(net: float, rate: float) -> float:
    """Compute VAT from net and rate with proper rounding."""
    if rate <= 0 or net == 0:
        return 0.0
    return round2(net * rate / 100)


def _validate_invoice_consistency(
    inv: InvoiceData, idx: int
) -> List[ValidationIssue]:
    """Validate a single invoice for data consistency."""
    warnings: List[ValidationIssue] = []
    net = inv.net_amount or 0
    vat = inv.vat_amount or 0
    gross = inv.gross_amount or 0
    rate = inv.vat_rate or 0
    inv_id = inv.id
    inv_nr = inv.invoice_number or inv.id

    # Zero amount check
    if net == 0 and gross == 0:
        warnings.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="ZERO_AMOUNT",
            message=f"Rechnung {inv_nr}: Netto- und Bruttobetrag sind 0",
            invoice_id=inv_id,
        ))

    # VAT consistency check (within 2% tolerance)
    if inv.tax_treatment == TaxTreatment.NORMAL and rate > 0 and net > 0:
        expected_vat = round2(net * rate / 100)
        diff = abs(expected_vat - vat)
        tolerance = max(0.02 * abs(expected_vat), 0.01)
        if diff > tolerance:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="VAT_MISMATCH",
                message=(
                    f"Rechnung {inv_nr}: USt-Betrag ({vat:.2f}) weicht vom "
                    f"erwarteten Wert ({expected_vat:.2f}) bei {rate}% ab. "
                    f"Differenz: {diff:.2f}"
                ),
                invoice_id=inv_id,
                field="vat_amount",
            ))

    # Gross = Net + VAT check
    if net > 0 and vat >= 0 and gross > 0:
        expected_gross = round2(net + vat)
        if abs(expected_gross - gross) > 0.02:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="GROSS_MISMATCH",
                message=(
                    f"Rechnung {inv_nr}: Brutto ({gross:.2f}) ≠ "
                    f"Netto ({net:.2f}) + USt ({vat:.2f}) = {expected_gross:.2f}"
                ),
                invoice_id=inv_id,
                field="gross_amount",
            ))

    # Tax treatment plausibility
    if inv.tax_treatment in (
        TaxTreatment.IG_ERWERB,
        TaxTreatment.REVERSE_CHARGE_19_1,
        TaxTreatment.REVERSE_CHARGE_19_1A,
        TaxTreatment.REVERSE_CHARGE_19_1B,
        TaxTreatment.REVERSE_CHARGE_19_1D,
        TaxTreatment.REVERSE_CHARGE_19_1_3_4,
        TaxTreatment.EINFUHR,
        TaxTreatment.EUST_ABGABENKONTO,
    ) and inv.invoice_type == InvoiceType.AUSGANG:
        warnings.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="TREATMENT_TYPE_CONFLICT",
            message=(
                f"Rechnung {inv_nr}: Steuerliche Behandlung '{inv.tax_treatment.value}' "
                f"ist typischerweise für Eingangsrechnungen, nicht Ausgangsrechnungen"
            ),
            invoice_id=inv_id,
            field="tax_treatment",
        ))

    # Export/IG-Lieferung should be Ausgang
    if inv.tax_treatment in (
        TaxTreatment.EXPORT,
        TaxTreatment.IG_LIEFERUNG,
        TaxTreatment.LOHNVEREDELUNG,
        TaxTreatment.FAHRZEUG_OHNE_UID,
    ) and inv.invoice_type == InvoiceType.EINGANG:
        warnings.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="TREATMENT_TYPE_CONFLICT",
            message=(
                f"Rechnung {inv_nr}: Steuerliche Behandlung '{inv.tax_treatment.value}' "
                f"ist typischerweise für Ausgangsrechnungen, nicht Eingangsrechnungen"
            ),
            invoice_id=inv_id,
            field="tax_treatment",
        ))

    # Date validation
    if inv.invoice_date:
        try:
            from datetime import date as dt_date
            parts = inv.invoice_date.split("T")[0].split("-")
            dt_date(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="INVALID_DATE",
                message=f"Rechnung {inv_nr}: Ungültiges Datum '{inv.invoice_date}'",
                invoice_id=inv_id,
                field="invoice_date",
            ))

    # RKSV plausibility
    if inv.rksv_receipt:
        if not inv.rksv_kassenid:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="RKSV_MISSING_KASSENID",
                message=f"Rechnung {inv_nr}: RKSV-Beleg ohne Kassen-ID",
                invoice_id=inv_id,
                field="rksv_kassenid",
            ))
        if not inv.rksv_belegnr:
            warnings.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                code="RKSV_MISSING_BELEGNR",
                message=f"Rechnung {inv_nr}: RKSV-Beleg ohne Belegnummer",
                invoice_id=inv_id,
                field="rksv_belegnr",
            ))

    return warnings


def calculate_uva(request: UVACalculationRequest) -> UVACalculationResponse:
    """
    Core UVA calculation engine.
    
    Maps all invoices to the correct Kennzahlen according to
    Austrian UStG 1994 and Formular U 30 (2026).
    """
    year = request.year
    month = request.month
    invoices = request.invoices

    # Initialize all KZ accumulators
    kz: Dict[str, float] = {}
    for field_name in KZValues.model_fields:
        kz[field_name.replace("kz", "").lstrip("0") if field_name.startswith("kz") else field_name] = 0.0

    # Use simplified keys for accumulation
    acc: Dict[str, float] = {
        # Kopfdaten
        "000_netto": 0, "001_netto": 0, "021_netto": 0,
        # Abschnitt 1
        "022_netto": 0, "022_ust": 0,
        "029_netto": 0, "029_ust": 0,
        "006_netto": 0, "006_ust": 0,
        "037_netto": 0, "037_ust": 0,
        "052_netto": 0, "052_ust": 0,
        "007_netto": 0, "007_ust": 0,
        # Abschnitt 2
        "011_netto": 0, "012_netto": 0, "015_netto": 0,
        "017_netto": 0, "018_netto": 0,
        # Abschnitt 3
        "019_netto": 0, "016_netto": 0, "020_netto": 0,
        # Abschnitt 4
        "056_ust": 0, "057_ust": 0, "048_ust": 0,
        "044_ust": 0, "032_ust": 0,
        # Abschnitt 5
        "070_netto": 0, "071_netto": 0,
        "072_netto": 0, "072_ust": 0,
        "073_netto": 0, "073_ust": 0,
        "008_netto": 0, "008_ust": 0,
        "088_netto": 0, "088_ust": 0,
        "076_netto": 0, "077_netto": 0,
        # Abschnitt 6
        "060_vorsteuer": 0,
        "061_vorsteuer": 0, "083_vorsteuer": 0,
        "065_vorsteuer": 0, "066_vorsteuer": 0,
        "082_vorsteuer": 0, "087_vorsteuer": 0,
        "089_vorsteuer": 0, "064_vorsteuer": 0,
        "062_vorsteuer": 0, "063_vorsteuer": 0,
        "067_vorsteuer": 0,
    }

    # Counters
    ausgang_count = 0
    eingang_count = 0
    ig_count = 0
    rc_count = 0
    export_count = 0
    rksv_count = 0
    skipped_count = 0

    all_warnings: List[ValidationIssue] = []
    processing_details: List[InvoiceProcessingDetail] = []

    # ──────────────────────────────────────────────
    # Process each invoice
    # ──────────────────────────────────────────────
    for idx, inv in enumerate(invoices):
        net = round2(inv.net_amount or 0)
        vat = round2(inv.vat_amount or 0)
        gross = round2(inv.gross_amount or 0)
        rate = int(inv.vat_rate or 20)
        inv_type = inv.invoice_type
        treatment = inv.tax_treatment

        # Validate invoice
        inv_warnings = _validate_invoice_consistency(inv, idx)
        all_warnings.extend(inv_warnings)

        # Skip zero-amount invoices
        if net == 0 and gross == 0:
            skipped_count += 1
            continue

        # RKSV count
        if inv.rksv_receipt:
            rksv_count += 1

        # Track which KZ codes this invoice maps to
        mapped_kz: List[str] = []

        # ══════════════════════════════════════════
        # AUSGANGSRECHNUNGEN (Verkauf / Sales)
        # ══════════════════════════════════════════
        if inv_type == InvoiceType.AUSGANG:
            ausgang_count += 1

            # KZ 000: Gesamtbetrag Lieferungen/Leistungen
            acc["000_netto"] += net
            mapped_kz.append("KZ000")

            # ── Steuerfreie MIT Vorsteuerabzug (Abschnitt 2) ──
            if treatment == TaxTreatment.EXPORT:
                acc["011_netto"] += net
                mapped_kz.append("KZ011")
                export_count += 1

            elif treatment == TaxTreatment.IG_LIEFERUNG:
                acc["017_netto"] += net
                mapped_kz.append("KZ017")
                # IG Lieferung → KZ 021 (Steuerschuld geht auf Empfänger über)
                acc["021_netto"] += net
                mapped_kz.append("KZ021")

            elif treatment == TaxTreatment.LOHNVEREDELUNG:
                acc["012_netto"] += net
                mapped_kz.append("KZ012")

            elif treatment == TaxTreatment.DREIECKSGESCHAEFT:
                # Dreiecksgeschäft = Sonderfall IG Lieferung
                acc["017_netto"] += net
                mapped_kz.append("KZ017")
                acc["021_netto"] += net
                mapped_kz.append("KZ021")

            elif treatment == TaxTreatment.FAHRZEUG_OHNE_UID:
                acc["018_netto"] += net
                mapped_kz.append("KZ018")

            # ── Steuerfreie OHNE Vorsteuerabzug (Abschnitt 3) ──
            elif treatment == TaxTreatment.GRUNDSTUECK:
                acc["019_netto"] += net
                mapped_kz.append("KZ019")

            elif treatment == TaxTreatment.KLEINUNTERNEHMER:
                acc["016_netto"] += net
                mapped_kz.append("KZ016")

            elif treatment == TaxTreatment.STEUERBEFREIT_SONSTIGE:
                acc["020_netto"] += net
                mapped_kz.append("KZ020")

            # ── Normal steuerpflichtige Umsätze (Abschnitt 1) ──
            else:
                rate_kz = RATE_TO_KZ.get(rate, "022")
                acc[f"{rate_kz}_netto"] += net
                acc[f"{rate_kz}_ust"] += vat
                mapped_kz.append(f"KZ{rate_kz}")

            # KZ 021: RC transfers (Steuerschuld geht auf Empfänger)
            if treatment.value.startswith("reverse_charge"):
                acc["021_netto"] += net
                mapped_kz.append("KZ021")

        # ══════════════════════════════════════════
        # EINGANGSRECHNUNGEN (Einkauf / Purchases)
        # ══════════════════════════════════════════
        elif inv_type == InvoiceType.EINGANG:
            eingang_count += 1

            # ── IG Erwerbe (Abschnitt 5) ──
            if treatment == TaxTreatment.IG_ERWERB:
                ig_count += 1
                ig_kz = IG_RATE_TO_KZ.get(rate, "072")

                # Bemessungsgrundlage + USt in IG-Abschnitt
                acc[f"{ig_kz}_netto"] += net
                acc[f"{ig_kz}_ust"] += vat
                mapped_kz.append(f"KZ{ig_kz}")

                # KZ 070: Gesamtbetrag IG Erwerbe
                acc["070_netto"] += net
                mapped_kz.append("KZ070")

                # Vorsteuer aus IG Erwerb (symmetrisch)
                acc["065_vorsteuer"] += vat
                mapped_kz.append("KZ065")

            # ── Reverse Charge (Abschnitt 4 + 6) ──
            elif treatment.value in RC_TREATMENT_MAP:
                rc_count += 1
                schuld_kz, vorsteuer_kz = RC_TREATMENT_MAP[treatment.value]

                # Steuerschuld-Seite
                acc[schuld_kz] += vat
                mapped_kz.append(f"KZ{schuld_kz.split('_')[0]}")

                # Vorsteuer-Seite (symmetrisch)
                acc[vorsteuer_kz] += vat
                mapped_kz.append(f"KZ{vorsteuer_kz.split('_')[0]}")

            # ── Einfuhr (Import aus Drittland) ──
            elif treatment == TaxTreatment.EINFUHR:
                # EUSt entrichtet (§12 Abs1 Z2 lit a)
                acc["061_vorsteuer"] += vat
                mapped_kz.append("KZ061")

            elif treatment == TaxTreatment.EUST_ABGABENKONTO:
                # EUSt auf Abgabenkonto (§12 Abs1 Z2 lit b)
                acc["083_vorsteuer"] += vat
                mapped_kz.append("KZ083")

            # ── Normaler inländischer Einkauf ──
            else:
                # Standard Vorsteuer aus inländischen Rechnungen
                acc["060_vorsteuer"] += vat
                mapped_kz.append("KZ060")

        # Record processing detail
        processing_details.append(InvoiceProcessingDetail(
            invoice_id=inv.id,
            invoice_number=inv.invoice_number,
            mapped_to_kz=mapped_kz,
            net_amount=net,
            vat_amount=vat,
            tax_treatment=treatment.value,
            invoice_type=inv_type.value,
        ))

    # ──────────────────────────────────────────────
    # Calculate section totals
    # ──────────────────────────────────────────────

    # Abschnitt 1: Summe USt aus steuerpflichtigen Umsätzen
    summe_ust = round2(
        acc["022_ust"] + acc["029_ust"] + acc["006_ust"] +
        acc["037_ust"] + acc["052_ust"] + acc["007_ust"]
    )

    # Abschnitt 4: Summe Steuerschuld (RC / kraft Rechnungslegung)
    summe_steuerschuld = round2(
        acc["056_ust"] + acc["057_ust"] + acc["048_ust"] +
        acc["044_ust"] + acc["032_ust"]
    )

    # Abschnitt 5: Summe IG Erwerbe USt
    summe_ig_ust = round2(
        acc["072_ust"] + acc["073_ust"] + acc["008_ust"] + acc["088_ust"]
    )

    # Gesamt-USt (Zahllast-Seite)
    gesamt_ust = round2(summe_ust + summe_steuerschuld + summe_ig_ust)

    # KZ 090: Gesamtbetrag der abziehbaren Vorsteuer
    kz090 = round2(
        acc["060_vorsteuer"] + acc["061_vorsteuer"] + acc["083_vorsteuer"] +
        acc["065_vorsteuer"] + acc["066_vorsteuer"] + acc["082_vorsteuer"] +
        acc["087_vorsteuer"] + acc["089_vorsteuer"] + acc["064_vorsteuer"] -
        abs(acc["062_vorsteuer"]) +  # nicht abzugsfähig (subtrahiert)
        acc["063_vorsteuer"] + acc["067_vorsteuer"]
    )

    # Sonstige Berichtigungen
    sonstige = round2(request.sonstige_berichtigungen or 0)

    # KZ 095: Vorauszahlung (Zahllast) / Überschuss (Gutschrift)
    # Positiv = Zahllast (zu zahlen), Negativ = Gutschrift
    kz095 = round2(gesamt_ust - kz090 + sonstige)

    # Due date: 15. des zweitfolgenden Monats (§21 Abs1 UStG)
    due_month = month + 2
    due_year = year
    if due_month > 12:
        due_month -= 12
        due_year += 1
    due_date = f"{due_year}-{str(due_month).zfill(2)}-15"

    # ──────────────────────────────────────────────
    # Build KZValues
    # ──────────────────────────────────────────────
    kz_values = KZValues(
        # Kopfdaten
        kz000_netto=round2(acc["000_netto"]),
        kz001_netto=round2(acc["001_netto"]),
        kz021_netto=round2(acc["021_netto"]),
        # Abschnitt 1
        kz022_netto=round2(acc["022_netto"]), kz022_ust=round2(acc["022_ust"]),
        kz029_netto=round2(acc["029_netto"]), kz029_ust=round2(acc["029_ust"]),
        kz006_netto=round2(acc["006_netto"]), kz006_ust=round2(acc["006_ust"]),
        kz037_netto=round2(acc["037_netto"]), kz037_ust=round2(acc["037_ust"]),
        kz052_netto=round2(acc["052_netto"]), kz052_ust=round2(acc["052_ust"]),
        kz007_netto=round2(acc["007_netto"]), kz007_ust=round2(acc["007_ust"]),
        # Abschnitt 2
        kz011_netto=round2(acc["011_netto"]),
        kz012_netto=round2(acc["012_netto"]),
        kz015_netto=round2(acc["015_netto"]),
        kz017_netto=round2(acc["017_netto"]),
        kz018_netto=round2(acc["018_netto"]),
        # Abschnitt 3
        kz019_netto=round2(acc["019_netto"]),
        kz016_netto=round2(acc["016_netto"]),
        kz020_netto=round2(acc["020_netto"]),
        # Abschnitt 4
        kz056_ust=round2(acc["056_ust"]),
        kz057_ust=round2(acc["057_ust"]),
        kz048_ust=round2(acc["048_ust"]),
        kz044_ust=round2(acc["044_ust"]),
        kz032_ust=round2(acc["032_ust"]),
        # Abschnitt 5
        kz070_netto=round2(acc["070_netto"]),
        kz071_netto=round2(acc["071_netto"]),
        kz072_netto=round2(acc["072_netto"]), kz072_ust=round2(acc["072_ust"]),
        kz073_netto=round2(acc["073_netto"]), kz073_ust=round2(acc["073_ust"]),
        kz008_netto=round2(acc["008_netto"]), kz008_ust=round2(acc["008_ust"]),
        kz088_netto=round2(acc["088_netto"]), kz088_ust=round2(acc["088_ust"]),
        kz076_netto=round2(acc["076_netto"]),
        kz077_netto=round2(acc["077_netto"]),
        # Abschnitt 6
        kz060_vorsteuer=round2(acc["060_vorsteuer"]),
        kz061_vorsteuer=round2(acc["061_vorsteuer"]),
        kz083_vorsteuer=round2(acc["083_vorsteuer"]),
        kz065_vorsteuer=round2(acc["065_vorsteuer"]),
        kz066_vorsteuer=round2(acc["066_vorsteuer"]),
        kz082_vorsteuer=round2(acc["082_vorsteuer"]),
        kz087_vorsteuer=round2(acc["087_vorsteuer"]),
        kz089_vorsteuer=round2(acc["089_vorsteuer"]),
        kz064_vorsteuer=round2(acc["064_vorsteuer"]),
        kz062_vorsteuer=round2(acc["062_vorsteuer"]),
        kz063_vorsteuer=round2(acc["063_vorsteuer"]),
        kz067_vorsteuer=round2(acc["067_vorsteuer"]),
        # Ergebnis
        kz090_betrag=kz090,
        kz095_betrag=kz095,
    )

    summary = UVASummary(
        invoice_count=len(invoices),
        ausgang_count=ausgang_count,
        eingang_count=eingang_count,
        ig_count=ig_count,
        rc_count=rc_count,
        export_count=export_count,
        rksv_count=rksv_count,
        skipped_count=skipped_count,
        summe_ust=summe_ust,
        summe_steuerschuld=summe_steuerschuld,
        summe_ig_ust=summe_ig_ust,
        gesamt_ust=gesamt_ust,
        summe_vorsteuer=kz090,
        zahllast=kz095,
        due_date=due_date,
    )

    return UVACalculationResponse(
        success=True,
        kz_values=kz_values,
        summary=summary,
        warnings=all_warnings,
        processing_details=processing_details,
    )
