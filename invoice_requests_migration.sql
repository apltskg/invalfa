-- ============================================================
-- invoice_requests table migration
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_requests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    status               TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','done','rejected')),
    lang                 TEXT NOT NULL DEFAULT 'el' CHECK (lang IN ('el','en')),

    -- Requester details
    full_name            TEXT NOT NULL,
    company_name         TEXT,
    vat_number           TEXT NOT NULL,
    tax_office           TEXT,
    address              TEXT,
    email                TEXT NOT NULL,
    phone                TEXT,

    -- Payment details
    bank_transaction_ref TEXT,
    amount               NUMERIC(12,2),
    service_description  TEXT NOT NULL,
    notes                TEXT
);

-- Allow unauthenticated inserts (public form submissions)
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit invoice request"   ON invoice_requests;
DROP POLICY IF EXISTS "Authorized users can view requests"  ON invoice_requests;
DROP POLICY IF EXISTS "Authorized users can update requests" ON invoice_requests;

CREATE POLICY "Anyone can submit invoice request"
ON invoice_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authorized users can view requests"
ON invoice_requests FOR SELECT
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized users can update requests"
ON invoice_requests FOR UPDATE
USING (is_authorized_user(auth.uid()));

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_invoice_requests_status     ON invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_created_at ON invoice_requests(created_at DESC);
