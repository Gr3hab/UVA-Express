
-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_path TEXT,
  file_name TEXT,
  vendor_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  net_amount NUMERIC(12,2),
  vat_rate NUMERIC(5,2),
  vat_amount NUMERIC(12,2),
  gross_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'EUR',
  vat_category TEXT DEFAULT '20%',
  description TEXT,
  ocr_raw_text TEXT,
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'error')),
  ocr_confidence NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);

-- UVA periods table
CREATE TABLE public.uva_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'submitted')),
  kz000_netto NUMERIC(12,2) DEFAULT 0,
  kz000_ust NUMERIC(12,2) DEFAULT 0,
  kz001_netto NUMERIC(12,2) DEFAULT 0,
  kz001_ust NUMERIC(12,2) DEFAULT 0,
  kz006_netto NUMERIC(12,2) DEFAULT 0,
  kz006_ust NUMERIC(12,2) DEFAULT 0,
  kz021_netto NUMERIC(12,2) DEFAULT 0,
  kz021_ust NUMERIC(12,2) DEFAULT 0,
  kz060_vorsteuer NUMERIC(12,2) DEFAULT 0,
  zahllast NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_year, period_month)
);

ALTER TABLE public.uva_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own UVA" ON public.uva_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own UVA" ON public.uva_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own UVA" ON public.uva_periods FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_uva_periods_updated_at BEFORE UPDATE ON public.uva_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

CREATE POLICY "Users can upload own invoices" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own invoices" ON storage.objects FOR SELECT USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own invoices" ON storage.objects FOR DELETE USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);
