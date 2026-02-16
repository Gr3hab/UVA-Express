
-- Add invoice_type to distinguish between purchase (Eingangsrechnung) and sales (Ausgangsrechnung)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'eingang';

-- Add reverse_charge flag for §19 UStG cases
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS reverse_charge boolean NOT NULL DEFAULT false;

-- Add ig_erwerb flag for innergemeinschaftliche Erwerbe
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ig_erwerb boolean NOT NULL DEFAULT false;

-- Add export_delivery flag for Ausfuhrlieferungen
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS export_delivery boolean NOT NULL DEFAULT false;

-- Add ig_lieferung flag for innergemeinschaftliche Lieferungen  
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS ig_lieferung boolean NOT NULL DEFAULT false;

-- Add specific tax treatment category for precise KZ mapping
-- Values: 'normal', 'export', 'ig_lieferung', 'ig_erwerb', 'reverse_charge_19_1', 
--          'reverse_charge_19_1a', 'reverse_charge_19_1b', 'reverse_charge_19_1d',
--          'grundstueck', 'kleinunternehmer', 'steuerbefreit_sonstige'
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_treatment text NOT NULL DEFAULT 'normal';
