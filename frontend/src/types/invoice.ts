export type InvoiceType = 'eingang' | 'ausgang';
export type TaxTreatment = 
  | 'normal' 
  | 'export' 
  | 'ig_lieferung' 
  | 'lohnveredelung'
  | 'dreiecksgeschaeft'
  | 'fahrzeug_ohne_uid'
  | 'ig_erwerb' 
  | 'reverse_charge_19_1' 
  | 'reverse_charge_19_1a' 
  | 'reverse_charge_19_1b' 
  | 'reverse_charge_19_1d'
  | 'reverse_charge_19_1_3_4'
  | 'einfuhr'
  | 'eust_abgabenkonto'
  | 'grundstueck' 
  | 'kleinunternehmer' 
  | 'steuerbefreit_sonstige';

export interface Invoice {
  id: string;
  user_id: string;
  file_path: string | null;
  file_name: string | null;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  net_amount: number | null;
  vat_rate: number | null;
  vat_amount: number | null;
  gross_amount: number | null;
  currency: string;
  vat_category: string;
  description: string | null;
  ocr_raw_text: string | null;
  ocr_status: 'pending' | 'processing' | 'completed' | 'error';
  ocr_confidence: number | null;
  invoice_type: InvoiceType;
  tax_treatment: TaxTreatment;
  reverse_charge: boolean;
  ig_erwerb: boolean;
  export_delivery: boolean;
  ig_lieferung: boolean;
  created_at: string;
  updated_at: string;
}

export interface UVAPeriod {
  id: string;
  user_id: string;
  period_year: number;
  period_month: number;
  status: 'draft' | 'calculated' | 'submitted';
  // Abschnitt 1: Steuerpflichtige Umsätze
  kz022_netto: number; kz022_ust: number;
  kz029_netto: number; kz029_ust: number;
  kz006_netto: number; kz006_ust: number;
  kz037_netto: number; kz037_ust: number;
  kz052_netto: number; kz052_ust: number;
  kz007_netto: number; kz007_ust: number;
  // Abschnitt 2
  kz011_netto: number; kz012_netto: number; kz015_netto: number;
  kz017_netto: number; kz018_netto: number;
  // Abschnitt 3
  kz019_netto: number; kz016_netto: number; kz020_netto: number;
  // Abschnitt 4
  kz056_ust: number; kz057_ust: number; kz048_ust: number;
  kz044_ust: number; kz032_ust: number;
  // Abschnitt 5
  kz070_netto: number; kz071_netto: number;
  kz072_netto: number; kz072_ust: number;
  kz073_netto: number; kz073_ust: number;
  kz008_netto: number; kz008_ust: number;
  kz088_netto: number; kz088_ust: number;
  kz076_netto: number; kz077_netto: number;
  // Abschnitt 6
  kz060_vorsteuer: number;
  kz061_vorsteuer: number; kz083_vorsteuer: number;
  kz065_vorsteuer: number; kz066_vorsteuer: number;
  kz082_vorsteuer: number; kz087_vorsteuer: number;
  kz089_vorsteuer: number; kz064_vorsteuer: number;
  kz062_vorsteuer: number; kz063_vorsteuer: number;
  kz067_vorsteuer: number;
  // Abschnitt 7
  kz090_betrag: number;
  // Ergebnis
  kz095_betrag: number;
  zahllast: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
