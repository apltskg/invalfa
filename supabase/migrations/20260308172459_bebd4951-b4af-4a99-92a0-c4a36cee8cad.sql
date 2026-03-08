
-- Audit trail for invoice matching actions
CREATE TABLE public.invoice_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_list_item_id UUID REFERENCES public.invoice_list_items(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'match', 'unmatch', 'create_income', 'link_folder', 'auto_match'
    old_status TEXT,
    new_status TEXT,
    matched_record_id UUID,
    matched_record_type TEXT, -- 'income', 'folder'
    user_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.invoice_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view audit_log" ON public.invoice_audit_log
    FOR SELECT USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can insert audit_log" ON public.invoice_audit_log
    FOR INSERT WITH CHECK (is_authorized_user(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_audit_log_item_id ON public.invoice_audit_log(invoice_list_item_id);
CREATE INDEX idx_audit_log_created_at ON public.invoice_audit_log(created_at DESC);
