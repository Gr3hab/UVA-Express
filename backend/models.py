"""
Pydantic Models for UVA Express – Go-live V1
Formular U 30 (2026) · Österreichisches UStG 1994

All models for:
- Invoice data input
- UVA calculation request/response
- All Kennzahlen (KZ codes)
- Validation results
- XML export
- RKSV data validation
- Submission pipeline
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from enum import Enum
from datetime import date, datetime
import uuid


# ═══════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════

class InvoiceType(str, Enum):
    EINGANG = "eingang"
    AUSGANG = "ausgang"


class TaxTreatment(str, Enum):
    NORMAL = "normal"
    EXPORT = "export"
    IG_LIEFERUNG = "ig_lieferung"
    LOHNVEREDELUNG = "lohnveredelung"
    DREIECKSGESCHAEFT = "dreiecksgeschaeft"
    FAHRZEUG_OHNE_UID = "fahrzeug_ohne_uid"
    IG_ERWERB = "ig_erwerb"
    REVERSE_CHARGE_19_1 = "reverse_charge_19_1"
    REVERSE_CHARGE_19_1A = "reverse_charge_19_1a"
    REVERSE_CHARGE_19_1B = "reverse_charge_19_1b"
    REVERSE_CHARGE_19_1D = "reverse_charge_19_1d"
    REVERSE_CHARGE_19_1_3_4 = "reverse_charge_19_1_3_4"
    EINFUHR = "einfuhr"
    EUST_ABGABENKONTO = "eust_abgabenkonto"
    GRUNDSTUECK = "grundstueck"
    KLEINUNTERNEHMER = "kleinunternehmer"
    STEUERBEFREIT_SONSTIGE = "steuerbefreit_sonstige"


class SubmissionStatus(str, Enum):
    ENTWURF = "entwurf"
    BERECHNET = "berechnet"
    VALIDIERT = "validiert"
    FREIGEGEBEN = "freigegeben"
    EINGEREICHT = "eingereicht"
    BESTAETIGT = "bestaetigt"
    FEHLER = "fehler"


class ValidationSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


# Austrian VAT rates (UStG 1994)
VALID_VAT_RATES = [0, 5, 7, 10, 13, 19, 20]


# ═══════════════════════════════════════════════════════════════════
# Invoice Data
# ═══════════════════════════════════════════════════════════════════

class InvoiceData(BaseModel):
    """Single invoice for UVA calculation input."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None  # YYYY-MM-DD
    vendor_name: Optional[str] = None
    net_amount: float = 0.0
    vat_rate: float = 20.0
    vat_amount: float = 0.0
    gross_amount: float = 0.0
    invoice_type: InvoiceType = InvoiceType.EINGANG
    tax_treatment: TaxTreatment = TaxTreatment.NORMAL
    reverse_charge: bool = False
    ig_erwerb: bool = False
    ig_lieferung: bool = False
    export_delivery: bool = False
    currency: str = "EUR"
    description: Optional[str] = None
    # RKSV fields
    rksv_receipt: bool = False
    rksv_kassenid: Optional[str] = None
    rksv_belegnr: Optional[str] = None
    rksv_qr_data: Optional[str] = None

    @field_validator("vat_rate")
    @classmethod
    def validate_vat_rate(cls, v: float) -> float:
        if v < 0 or v > 100:
            raise ValueError(f"USt-Satz muss zwischen 0 und 100 liegen, erhalten: {v}")
        return v


# ═══════════════════════════════════════════════════════════════════
# Kennzahlen (KZ) Values – Complete U30 Form 2026
# ═══════════════════════════════════════════════════════════════════

class KZValues(BaseModel):
    """All Kennzahlen from official U30 form 2026."""

    # Kopfdaten
    kz000_netto: float = 0.0   # Gesamtbetrag Lieferungen/Leistungen
    kz001_netto: float = 0.0   # Eigenverbrauch
    kz021_netto: float = 0.0   # Abzüglich RC-Umsätze

    # Abschnitt 1: Steuerpflichtige Umsätze (Bemessungsgrundlage + USt)
    kz022_netto: float = 0.0   # 20% Normalsteuersatz
    kz022_ust: float = 0.0
    kz029_netto: float = 0.0   # 10% ermäßigt
    kz029_ust: float = 0.0
    kz006_netto: float = 0.0   # 13% ermäßigt
    kz006_ust: float = 0.0
    kz037_netto: float = 0.0   # 19% Jungholz/Mittelberg
    kz037_ust: float = 0.0
    kz052_netto: float = 0.0   # 10% Zusatzsteuer pauschaliert
    kz052_ust: float = 0.0
    kz007_netto: float = 0.0   # 7% Zusatzsteuer land-/forstwirtsch.
    kz007_ust: float = 0.0

    # Abschnitt 2: Steuerfreie Umsätze MIT Vorsteuerabzug
    kz011_netto: float = 0.0   # Ausfuhrlieferungen §6 Abs1 Z1 iVm §7
    kz012_netto: float = 0.0   # Lohnveredelung §6 Abs1 Z1 iVm §8
    kz015_netto: float = 0.0   # Seeschifffahrt, Luftfahrt, Diplomaten
    kz017_netto: float = 0.0   # IG Lieferungen Art.6 Abs1 BMR
    kz018_netto: float = 0.0   # Fahrzeuglieferungen ohne UID

    # Abschnitt 3: Steuerfreie Umsätze OHNE Vorsteuerabzug
    kz019_netto: float = 0.0   # Grundstücksumsätze §6 Abs1 Z9 lit a
    kz016_netto: float = 0.0   # Kleinunternehmer §6 Abs1 Z27
    kz020_netto: float = 0.0   # Übrige steuerfreie Umsätze

    # Abschnitt 4: Steuerschuld kraft Rechnungslegung / Reverse Charge
    kz056_ust: float = 0.0     # §11 Abs12/14, §16 Abs2, Art7 Abs4
    kz057_ust: float = 0.0     # §19 Abs1 2.Satz, 1c, 1e, Art25 Abs5
    kz048_ust: float = 0.0     # §19 Abs1a Bauleistungen
    kz044_ust: float = 0.0     # §19 Abs1b Sicherungseigentum
    kz032_ust: float = 0.0     # §19 Abs1d Schrott, Laptops, Gas, Metalle

    # Abschnitt 5: Innergemeinschaftliche Erwerbe
    kz070_netto: float = 0.0   # Gesamtbetrag IG Erwerbe
    kz071_netto: float = 0.0   # Steuerfrei Art6 Abs2
    kz072_netto: float = 0.0   # 20% IG Erwerbe
    kz072_ust: float = 0.0
    kz073_netto: float = 0.0   # 10% IG Erwerbe
    kz073_ust: float = 0.0
    kz008_netto: float = 0.0   # 13% IG Erwerbe
    kz008_ust: float = 0.0
    kz088_netto: float = 0.0   # 19% IG Erwerbe
    kz088_ust: float = 0.0
    kz076_netto: float = 0.0   # Nicht zu versteuern Art3 Abs8
    kz077_netto: float = 0.0   # Nicht zu versteuern Art3 Abs8 + Art25 Abs2

    # Abschnitt 6: Abziehbare Vorsteuer
    kz060_vorsteuer: float = 0.0  # Gesamtbetrag Vorsteuern (inländisch)
    kz061_vorsteuer: float = 0.0  # EUSt entrichtet §12 Abs1 Z2 lit a
    kz083_vorsteuer: float = 0.0  # EUSt Abgabenkonto §12 Abs1 Z2 lit b
    kz065_vorsteuer: float = 0.0  # Vorsteuern IG Erwerbe
    kz066_vorsteuer: float = 0.0  # Vorsteuern §19 Abs1, 1c, 1e
    kz082_vorsteuer: float = 0.0  # Vorsteuern §19 Abs1a (Bauleistungen)
    kz087_vorsteuer: float = 0.0  # Vorsteuern §19 Abs1b (Sicherungseigentum)
    kz089_vorsteuer: float = 0.0  # Vorsteuern §19 Abs1d (Schrott)
    kz064_vorsteuer: float = 0.0  # Vorsteuern IG Fahrzeuge Art2
    kz062_vorsteuer: float = 0.0  # Nicht abzugsfähig §12 Abs3 iVm 4,5
    kz063_vorsteuer: float = 0.0  # Berichtigung §12 Abs10,11
    kz067_vorsteuer: float = 0.0  # Berichtigung §16

    # Abschnitt 7: Sonstige Berichtigungen
    kz090_betrag: float = 0.0     # Gesamtbetrag abziehbare Vorsteuer

    # Ergebnis
    kz095_betrag: float = 0.0     # Vorauszahlung/Überschuss


# ═══════════════════════════════════════════════════════════════════
# UVA Calculation Request / Response
# ═══════════════════════════════════════════════════════════════════

class UVACalculationRequest(BaseModel):
    """Request to calculate UVA from invoices."""
    invoices: List[InvoiceData]
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    sonstige_berichtigungen: float = 0.0  # Manual adjustments


class InvoiceProcessingDetail(BaseModel):
    """Detail about how an invoice was processed."""
    invoice_id: str
    invoice_number: Optional[str] = None
    mapped_to_kz: List[str]
    net_amount: float
    vat_amount: float
    tax_treatment: str
    invoice_type: str


class UVASummary(BaseModel):
    """Summary of UVA calculation."""
    invoice_count: int = 0
    ausgang_count: int = 0
    eingang_count: int = 0
    ig_count: int = 0
    rc_count: int = 0
    export_count: int = 0
    rksv_count: int = 0
    skipped_count: int = 0
    summe_ust: float = 0.0
    summe_steuerschuld: float = 0.0
    summe_ig_ust: float = 0.0
    gesamt_ust: float = 0.0
    summe_vorsteuer: float = 0.0
    zahllast: float = 0.0
    due_date: Optional[str] = None


class ValidationIssue(BaseModel):
    """A single validation issue."""
    severity: ValidationSeverity
    code: str
    message: str
    field: Optional[str] = None
    invoice_id: Optional[str] = None
    kz: Optional[str] = None


class UVACalculationResponse(BaseModel):
    """Response from UVA calculation."""
    success: bool = True
    kz_values: KZValues
    summary: UVASummary
    warnings: List[ValidationIssue] = []
    processing_details: List[InvoiceProcessingDetail] = []
    calculation_timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════════════════════════════
# UVA Validation
# ═══════════════════════════════════════════════════════════════════

class UVAValidationRequest(BaseModel):
    """Request to validate UVA KZ values."""
    kz_values: KZValues
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    invoices: Optional[List[InvoiceData]] = None  # Optional for deep validation


class UVAValidationResponse(BaseModel):
    """Response from UVA validation."""
    valid: bool
    errors: List[ValidationIssue] = []
    warnings: List[ValidationIssue] = []
    infos: List[ValidationIssue] = []
    bmf_plausibility_passed: bool = False
    kz095_recalculated: float = 0.0
    kz095_matches: bool = True


# ═══════════════════════════════════════════════════════════════════
# XML Export
# ═══════════════════════════════════════════════════════════════════

class XMLExportRequest(BaseModel):
    """Request to generate BMF-compliant XML."""
    kz_values: KZValues
    steuernummer: str = Field(..., min_length=1, max_length=20)
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    unternehmen_name: Optional[str] = None
    unternehmen_strasse: Optional[str] = None
    unternehmen_plz: Optional[str] = None
    unternehmen_ort: Optional[str] = None

    @field_validator("steuernummer")
    @classmethod
    def validate_steuernummer(cls, v: str) -> str:
        import re
        cleaned = re.sub(r'[^a-zA-Z0-9/\-]', '', v)
        if not cleaned:
            raise ValueError("Ungültige Steuernummer")
        return cleaned


class XMLExportResponse(BaseModel):
    """Response from XML export."""
    success: bool
    xml_content: str
    filename: str
    validation_passed: bool = True
    validation_issues: List[ValidationIssue] = []


# ═══════════════════════════════════════════════════════════════════
# RKSV Validation
# ═══════════════════════════════════════════════════════════════════

class RKSVData(BaseModel):
    """RKSV receipt data for validation."""
    rksv_kassenid: Optional[str] = None
    rksv_belegnr: Optional[str] = None
    rksv_qr_data: Optional[str] = None
    rksv_receipt: bool = False
    betrag: Optional[float] = None
    datum: Optional[str] = None  # YYYY-MM-DD


class RKSVValidationRequest(BaseModel):
    """Request to validate RKSV data."""
    receipts: List[RKSVData]


class RKSVValidationResponse(BaseModel):
    """Response from RKSV validation."""
    valid: bool
    total_receipts: int
    valid_receipts: int
    invalid_receipts: int
    issues: List[ValidationIssue] = []


# ═══════════════════════════════════════════════════════════════════
# Submission Pipeline
# ═══════════════════════════════════════════════════════════════════

class SubmissionChecklistItem(BaseModel):
    """Single checklist item for submission."""
    label: str
    passed: bool
    severity: ValidationSeverity = ValidationSeverity.ERROR
    details: Optional[str] = None


class SubmissionPrepareRequest(BaseModel):
    """Request to prepare UVA submission."""
    kz_values: KZValues
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    steuernummer: str
    invoices: Optional[List[InvoiceData]] = None


class SubmissionPrepareResponse(BaseModel):
    """Response from submission preparation."""
    ready: bool
    current_status: SubmissionStatus
    next_status: Optional[SubmissionStatus] = None
    checklist: List[SubmissionChecklistItem] = []
    blocking_issues: int = 0
    warnings: int = 0
    xml_preview: Optional[str] = None
    due_date: Optional[str] = None


class SubmissionConfirmRequest(BaseModel):
    """Confirm manual submission."""
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)
    confirmation_note: Optional[str] = None
    finanzonline_reference: Optional[str] = None  # Manual ref number


class SubmissionConfirmResponse(BaseModel):
    """Response after confirming submission."""
    success: bool
    new_status: SubmissionStatus
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    message: str


# ═══════════════════════════════════════════════════════════════════
# Audit Trail
# ═══════════════════════════════════════════════════════════════════

class AuditEntry(BaseModel):
    """Audit log entry."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Dict[str, Any] = {}
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ═══════════════════════════════════════════════════════════════════
# KZ Info (Reference Data)
# ═══════════════════════════════════════════════════════════════════

class KZInfo(BaseModel):
    """Information about a single Kennzahl."""
    kz: str
    label: str
    section: str
    paragraph: Optional[str] = None
    has_netto: bool = False
    has_ust: bool = False
    has_vorsteuer: bool = False
    has_betrag: bool = False
    rate: Optional[float] = None
