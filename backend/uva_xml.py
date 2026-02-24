"""
BMF-konformer XML-Export · Formular U 30 (2026)
════════════════════════════════════════════════

Generiert FinanzOnline-konformes XML für die
Umsatzsteuervoranmeldung gemäß BMF XML-Struktur.

Referenz: BMF Softwarehersteller-Dokumentation
https://www.bmf.gv.at/services/finanzonline/informationen-fuer-softwarehersteller/
"""

import logging
import re
from typing import List, Optional
from datetime import datetime
from models import (
    KZValues, XMLExportRequest, XMLExportResponse,
    ValidationIssue, ValidationSeverity,
)

logger = logging.getLogger(__name__)


def xml_escape(val: str) -> str:
    """XML-safe value escaping."""
    return (
        val.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def fmt_amt(val: float) -> str:
    """Format amount for XML (2 decimal places, dot separator)."""
    return f"{(val or 0):.2f}"


def _validate_xml_input(request: XMLExportRequest) -> List[ValidationIssue]:
    """Pre-validate XML export input."""
    issues: List[ValidationIssue] = []

    # Steuernummer format
    stnr = request.steuernummer
    if not stnr or len(stnr) < 3:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="INVALID_STEUERNUMMER",
            message="Steuernummer ist zu kurz oder fehlt",
            field="steuernummer",
        ))

    # Austrian Steuernummer pattern: usually XX XXX/XXXX or similar
    cleaned = re.sub(r'[^0-9/]', '', stnr)
    if len(cleaned) < 5:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="STEUERNUMMER_FORMAT",
            message=(
                f"Steuernummer '{stnr}' hat ein ungewöhnliches Format. "
                f"Erwartet: z.B. '12 345/6789'"
            ),
            field="steuernummer",
        ))

    # Period check
    if request.year < 2020 or request.year > 2030:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="UNUSUAL_PERIOD",
            message=f"Ungewöhnliches Jahr: {request.year}",
            field="year",
        ))

    return issues


def build_uva_xml(request: XMLExportRequest) -> XMLExportResponse:
    """
    Generate BMF-compliant XML for UVA (Formular U30 2026).

    The XML structure follows the official BMF ERKLAERUNGENPAKET schema
    for electronic submission via FinanzOnline.
    """
    # Pre-validate
    validation_issues = _validate_xml_input(request)
    has_errors = any(i.severity == ValidationSeverity.ERROR for i in validation_issues)

    if has_errors:
        return XMLExportResponse(
            success=False,
            xml_content="",
            filename="",
            validation_passed=False,
            validation_issues=validation_issues,
        )

    kz = request.kz_values
    year = request.year
    month_str = str(request.month).zfill(2)
    stnr = xml_escape(request.steuernummer)
    now = datetime.utcnow().isoformat().split("T")[0]

    # Company info (optional)
    unternehmen_name = xml_escape(request.unternehmen_name or "")
    unternehmen_strasse = xml_escape(request.unternehmen_strasse or "")
    unternehmen_plz = xml_escape(request.unternehmen_plz or "")
    unternehmen_ort = xml_escape(request.unternehmen_ort or "")

    # Build XML
    # Note: Only include KZ values that are non-zero to keep XML clean
    # BMF accepts zero values but prefers minimal XML

    kz_lines: List[str] = []

    def add_kz(tag: str, value: float) -> None:
        """Add a KZ line only if value is non-zero."""
        kz_lines.append(f"      <{tag}>{fmt_amt(value)}</{tag}>")

    def add_kz_if_nonzero(tag: str, value: float) -> None:
        """Add a KZ line only if value is non-zero."""
        if abs(value) >= 0.005:
            kz_lines.append(f"      <{tag}>{fmt_amt(value)}</{tag}>")

    # ── Kopfdaten ──
    add_kz("KZ000", kz.kz000_netto)
    add_kz_if_nonzero("KZ001", kz.kz001_netto)
    add_kz_if_nonzero("KZ021", kz.kz021_netto)

    # ── Abschnitt 1: Steuerpflichtige Umsätze ──
    if abs(kz.kz022_netto) >= 0.005 or abs(kz.kz022_ust) >= 0.005:
        add_kz("KZ022_BMGL", kz.kz022_netto)
        add_kz("KZ022_STEUER", kz.kz022_ust)

    if abs(kz.kz029_netto) >= 0.005 or abs(kz.kz029_ust) >= 0.005:
        add_kz("KZ029_BMGL", kz.kz029_netto)
        add_kz("KZ029_STEUER", kz.kz029_ust)

    if abs(kz.kz006_netto) >= 0.005 or abs(kz.kz006_ust) >= 0.005:
        add_kz("KZ006_BMGL", kz.kz006_netto)
        add_kz("KZ006_STEUER", kz.kz006_ust)

    if abs(kz.kz037_netto) >= 0.005 or abs(kz.kz037_ust) >= 0.005:
        add_kz("KZ037_BMGL", kz.kz037_netto)
        add_kz("KZ037_STEUER", kz.kz037_ust)

    if abs(kz.kz052_netto) >= 0.005 or abs(kz.kz052_ust) >= 0.005:
        add_kz("KZ052_BMGL", kz.kz052_netto)
        add_kz("KZ052_STEUER", kz.kz052_ust)

    if abs(kz.kz007_netto) >= 0.005 or abs(kz.kz007_ust) >= 0.005:
        add_kz("KZ007_BMGL", kz.kz007_netto)
        add_kz("KZ007_STEUER", kz.kz007_ust)

    # ── Abschnitt 2: Steuerfrei MIT Vorsteuerabzug ──
    add_kz_if_nonzero("KZ011", kz.kz011_netto)
    add_kz_if_nonzero("KZ012", kz.kz012_netto)
    add_kz_if_nonzero("KZ015", kz.kz015_netto)
    add_kz_if_nonzero("KZ017", kz.kz017_netto)
    add_kz_if_nonzero("KZ018", kz.kz018_netto)

    # ── Abschnitt 3: Steuerfrei OHNE Vorsteuerabzug ──
    add_kz_if_nonzero("KZ019", kz.kz019_netto)
    add_kz_if_nonzero("KZ016", kz.kz016_netto)
    add_kz_if_nonzero("KZ020", kz.kz020_netto)

    # ── Abschnitt 4: Steuerschuld ──
    add_kz_if_nonzero("KZ056", kz.kz056_ust)
    add_kz_if_nonzero("KZ057", kz.kz057_ust)
    add_kz_if_nonzero("KZ048", kz.kz048_ust)
    add_kz_if_nonzero("KZ044", kz.kz044_ust)
    add_kz_if_nonzero("KZ032", kz.kz032_ust)

    # ── Abschnitt 5: IG Erwerbe ──
    add_kz_if_nonzero("KZ070", kz.kz070_netto)
    add_kz_if_nonzero("KZ071", kz.kz071_netto)

    if abs(kz.kz072_netto) >= 0.005 or abs(kz.kz072_ust) >= 0.005:
        add_kz("KZ072_BMGL", kz.kz072_netto)
        add_kz("KZ072_STEUER", kz.kz072_ust)

    if abs(kz.kz073_netto) >= 0.005 or abs(kz.kz073_ust) >= 0.005:
        add_kz("KZ073_BMGL", kz.kz073_netto)
        add_kz("KZ073_STEUER", kz.kz073_ust)

    if abs(kz.kz008_netto) >= 0.005 or abs(kz.kz008_ust) >= 0.005:
        add_kz("KZ008_BMGL", kz.kz008_netto)
        add_kz("KZ008_STEUER", kz.kz008_ust)

    if abs(kz.kz088_netto) >= 0.005 or abs(kz.kz088_ust) >= 0.005:
        add_kz("KZ088_BMGL", kz.kz088_netto)
        add_kz("KZ088_STEUER", kz.kz088_ust)

    add_kz_if_nonzero("KZ076", kz.kz076_netto)
    add_kz_if_nonzero("KZ077", kz.kz077_netto)

    # ── Abschnitt 6: Vorsteuern ──
    add_kz_if_nonzero("KZ060", kz.kz060_vorsteuer)
    add_kz_if_nonzero("KZ061", kz.kz061_vorsteuer)
    add_kz_if_nonzero("KZ083", kz.kz083_vorsteuer)
    add_kz_if_nonzero("KZ065", kz.kz065_vorsteuer)
    add_kz_if_nonzero("KZ066", kz.kz066_vorsteuer)
    add_kz_if_nonzero("KZ082", kz.kz082_vorsteuer)
    add_kz_if_nonzero("KZ087", kz.kz087_vorsteuer)
    add_kz_if_nonzero("KZ089", kz.kz089_vorsteuer)
    add_kz_if_nonzero("KZ064", kz.kz064_vorsteuer)
    add_kz_if_nonzero("KZ062", kz.kz062_vorsteuer)
    add_kz_if_nonzero("KZ063", kz.kz063_vorsteuer)
    add_kz_if_nonzero("KZ067", kz.kz067_vorsteuer)

    # ── Ergebnis ──
    add_kz("KZ090", kz.kz090_betrag)
    add_kz("KZ095", kz.kz095_betrag)

    kz_xml = "\n".join(kz_lines)

    # Company data section (optional)
    company_xml = ""
    if unternehmen_name:
        company_xml = f"""
    <UNTERNEHMENSDATEN>
      <BEZEICHNUNG>{unternehmen_name}</BEZEICHNUNG>
      {"<STRASSE>" + unternehmen_strasse + "</STRASSE>" if unternehmen_strasse else ""}
      {"<PLZ>" + unternehmen_plz + "</PLZ>" if unternehmen_plz else ""}
      {"<ORT>" + unternehmen_ort + "</ORT>" if unternehmen_ort else ""}
    </UNTERNEHMENSDATEN>"""

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<ERKLAERUNGENPAKET>
  <INFO_DATEN>
    <ART>UVA</ART>
    <FASESSION_ID>0</FASESSION_ID>
    <STEUERNUMMER>{stnr}</STEUERNUMMER>
    <ZEITRAUM>{year}-{month_str}</ZEITRAUM>
    <ERSTELLUNGSDATUM>{now}</ERSTELLUNGSDATUM>
  </INFO_DATEN>
  <ERKLAERUNG art="U30">
    <SATZNR>1</SATZNR>
    <ALLGEMEINE_DATEN>
      <ANBRINGEN>UVA</ANBRINGEN>
      <ZEITRAUM>
        <JAHR>{year}</JAHR>
        <MONAT>{month_str}</MONAT>
      </ZEITRAUM>
    </ALLGEMEINE_DATEN>{company_xml}
    <KENNZAHLEN>
{kz_xml}
    </KENNZAHLEN>
  </ERKLAERUNG>
</ERKLAERUNGENPAKET>"""

    filename = f"UVA_{year}_{month_str}.xml"

    return XMLExportResponse(
        success=True,
        xml_content=xml_content,
        filename=filename,
        validation_passed=not has_errors,
        validation_issues=validation_issues,
    )
