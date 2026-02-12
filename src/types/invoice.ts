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
  created_at: string;
  updated_at: string;
}

export interface UVAPeriod {
  id: string;
  user_id: string;
  period_year: number;
  period_month: number;
  status: 'draft' | 'calculated' | 'submitted';
  kz000_netto: number;
  kz000_ust: number;
  kz001_netto: number;
  kz001_ust: number;
  kz006_netto: number;
  kz006_ust: number;
  kz021_netto: number;
  kz021_ust: number;
  kz060_vorsteuer: number;
  zahllast: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
