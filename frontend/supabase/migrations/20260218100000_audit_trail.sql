-- ═══════════════════════════════════════════════════════════════
-- Audit Trail für UVA Express – Compliance & RKSV
-- ═══════════════════════════════════════════════════════════════

-- Audit Log table for all compliance-relevant actions
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own audit entries
CREATE POLICY "Users can view own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert audit entries (edge functions)
CREATE POLICY "Service can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Add RKSV-relevant fields to invoices if not exist
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rksv_receipt BOOLEAN DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rksv_kassenid TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rksv_belegnr TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS rksv_qr_data TEXT;

-- Add sonstige_berichtigungen as a separate manual adjustment field
ALTER TABLE public.uva_periods ADD COLUMN IF NOT EXISTS sonstige_berichtigungen NUMERIC(12,2) DEFAULT 0;

-- Track which invoices were included in each UVA calculation
ALTER TABLE public.uva_periods ADD COLUMN IF NOT EXISTS included_invoice_ids UUID[] DEFAULT '{}';
ALTER TABLE public.uva_periods ADD COLUMN IF NOT EXISTS calculation_warnings TEXT[] DEFAULT '{}';
