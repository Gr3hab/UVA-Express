"""
BMF-konformer XML-Export · Formular U 30 (2026)
════════════════════════════════════════════════

Generiert FinanzOnline-konformes XML für die
Umsatzsteuervoranmeldung gemäß BMF XML-Struktur.

Inkl. XSD-Schema-Validierung und fachlich lesbare Fehlermeldungen.

Referenz: BMF Softwarehersteller-Dokumentation
https://www.bmf.gv.at/services/finanzonline/informationen-fuer-softwarehersteller/
"""

import logging
import re
from typing import List, Optional
from datetime import datetime
from io import BytesIO
from models import (
    KZValues, XMLExportRequest, XMLExportResponse,
    ValidationIssue, ValidationSeverity,
)

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# Inline XSD Schema (BMF-angelehnt, U30 Erklaerung)
# ═══════════════════════════════════════════════════════════════════

UVA_XSD = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="ERKLAERUNGENPAKET">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="INFO_DATEN" type="InfoDatenType"/>
        <xs:element name="ERKLAERUNG" type="ErklaerungType"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>

  <xs:complexType name="InfoDatenType">
    <xs:sequence>
      <xs:element name="ART" type="xs:string"/>
      <xs:element name="FASESSION_ID" type="xs:string"/>
      <xs:element name="STEUERNUMMER" type="xs:string"/>
      <xs:element name="ZEITRAUM" type="xs:string"/>
      <xs:element name="ERSTELLUNGSDATUM" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="ErklaerungType">
    <xs:sequence>
      <xs:element name="SATZNR" type="xs:string"/>
      <xs:element name="ALLGEMEINE_DATEN" type="AllgemeineDatenType"/>
      <xs:element name="UNTERNEHMENSDATEN" type="UnternehmensDatenType" minOccurs="0"/>
      <xs:element name="KENNZAHLEN" type="KennzahlenType"/>
    </xs:sequence>
    <xs:attribute name="art" type="xs:string" use="required"/>
  </xs:complexType>

  <xs:complexType name="AllgemeineDatenType">
    <xs:sequence>
      <xs:element name="ANBRINGEN" type="xs:string"/>
      <xs:element name="ZEITRAUM" type="ZeitraumType"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="ZeitraumType">
    <xs:sequence>
      <xs:element name="JAHR" type="xs:string"/>
      <xs:element name="MONAT" type="xs:string"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="UnternehmensDatenType">
    <xs:sequence>
      <xs:element name="BEZEICHNUNG" type="xs:string" minOccurs="0"/>
      <xs:element name="STRASSE" type="xs:string" minOccurs="0"/>
      <xs:element name="PLZ" type="xs:string" minOccurs="0"/>
      <xs:element name="ORT" type="xs:string" minOccurs="0"/>
    </xs:sequence>
  </xs:complexType>

  <xs:complexType name="KennzahlenType">
    <xs:all>
      <xs:element name="KZ000" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ001" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ021" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ022_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ022_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ029_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ029_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ006_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ006_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ037_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ037_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ052_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ052_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ007_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ007_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ011" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ012" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ015" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ017" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ018" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ019" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ016" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ020" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ056" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ057" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ048" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ044" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ032" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ070" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ071" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ072_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ072_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ073_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ073_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ008_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ008_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ088_BMGL" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ088_STEUER" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ076" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ077" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ060" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ061" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ083" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ065" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ066" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ082" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ087" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ089" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ064" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ062" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ063" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ067" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ090" type="xs:decimal" minOccurs="0"/>
      <xs:element name="KZ095" type="xs:decimal" minOccurs="0"/>
    </xs:all>
  </xs:complexType>
</xs:schema>"""


def _validate_xml_against_xsd(xml_content: str) -> List[ValidationIssue]:
    """Validate generated XML against XSD schema."""
    issues = []
    try:
        from lxml import etree
        schema_doc = etree.parse(BytesIO(UVA_XSD.encode("utf-8")))
        schema = etree.XMLSchema(schema_doc)
        xml_doc = etree.parse(BytesIO(xml_content.encode("utf-8")))

        if not schema.validate(xml_doc):
            for error in schema.error_log:
                # Map XSD errors to human-readable German messages
                msg = str(error.message)
                readable = _translate_xsd_error(msg, error.line)
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="XSD_VALIDATION_ERROR",
                    message=readable,
                    field=f"line_{error.line}",
                ))
    except ImportError:
        # lxml not available - do basic XML well-formedness check
        try:
            import xml.etree.ElementTree as ET
            ET.fromstring(xml_content)
        except ET.ParseError as e:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="XML_PARSE_ERROR",
                message=f"XML ist nicht wohlgeformt: {str(e)}",
            ))
        if not issues:
            # Basic structural check without lxml
            issues.extend(_basic_structure_check(xml_content))
    except Exception as e:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.WARNING,
            code="XSD_CHECK_FAILED",
            message=f"XSD-Validierung konnte nicht durchgeführt werden: {type(e).__name__}",
        ))
    return issues


def _translate_xsd_error(msg: str, line: int) -> str:
    """Translate XSD error to human-readable German."""
    if "element is not expected" in msg.lower():
        return f"Zeile {line}: Unerwartetes XML-Element. Bitte Struktur prüfen."
    if "not valid" in msg.lower():
        return f"Zeile {line}: Ungültiger Wert – {msg}"
    if "missing" in msg.lower():
        return f"Zeile {line}: Pflichtfeld fehlt – {msg}"
    return f"Zeile {line}: {msg}"


def _basic_structure_check(xml_content: str) -> List[ValidationIssue]:
    """Basic structure check without lxml."""
    issues = []
    import xml.etree.ElementTree as ET
    root = ET.fromstring(xml_content)

    # Check root element
    if root.tag != "ERKLAERUNGENPAKET":
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="XML_ROOT_INVALID",
            message=f"Root-Element ist '{root.tag}', erwartet 'ERKLAERUNGENPAKET'",
        ))
        return issues

    # Check INFO_DATEN
    info = root.find("INFO_DATEN")
    if info is None:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="XML_MISSING_INFO",
            message="Pflichtblock 'INFO_DATEN' fehlt im XML",
        ))
    else:
        for required in ["ART", "STEUERNUMMER", "ZEITRAUM"]:
            el = info.find(required)
            if el is None or not (el.text or "").strip():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code=f"XML_MISSING_{required}",
                    message=f"Pflichtfeld '{required}' in INFO_DATEN fehlt oder ist leer",
                ))

    # Check ERKLAERUNG
    erkl = root.find("ERKLAERUNG")
    if erkl is None:
        issues.append(ValidationIssue(
            severity=ValidationSeverity.ERROR,
            code="XML_MISSING_ERKLAERUNG",
            message="Pflichtblock 'ERKLAERUNG' fehlt",
        ))
    else:
        art = erkl.get("art")
        if art != "U30":
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="XML_WRONG_ART",
                message=f"Erklärungsart ist '{art}', erwartet 'U30'",
            ))
        kz_block = erkl.find("KENNZAHLEN")
        if kz_block is None:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                code="XML_MISSING_KZ",
                message="KENNZAHLEN-Block fehlt in der Erklärung",
            ))
        else:
            # Check KZ095 is present (Pflichtfeld)
            kz095 = kz_block.find("KZ095")
            if kz095 is None:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    code="XML_MISSING_KZ095",
                    message="Pflicht-Kennzahl KZ095 (Vorauszahlung/Überschuss) fehlt",
                ))
            # Check KZ000 is present
            kz000 = kz_block.find("KZ000")
            if kz000 is None:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    code="XML_MISSING_KZ000",
                    message="KZ000 (Gesamtbetrag Lieferungen) fehlt – Leermeldung?",
                ))

    return issues

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
