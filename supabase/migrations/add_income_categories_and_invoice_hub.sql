-- ============================================================
-- Income Categories (mirrors expense_categories structure)
-- ============================================================
CREATE TABLE IF NOT EXISTS income_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_el       text NOT NULL,
  icon          text,
  color         text,
  description   text,
  sort_order    integer DEFAULT 0,
  is_default    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE income_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read income_categories"
  ON income_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage income_categories"
  ON income_categories FOR ALL TO authenticated USING (true);

-- Add FK column to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS income_category_id uuid REFERENCES income_categories(id) ON DELETE SET NULL;

-- Seed default income categories
INSERT INTO income_categories (name, name_el, icon, color, sort_order, is_default) VALUES
  ('Package Income',    'Έσοδα Φακέλου',      'Package',     '#10b981', 1, true ),
  ('Accommodation',    'Διαμονή',             'Hotel',       '#3b82f6', 2, false),
  ('Flights',          'Αεροπορικά',          'Plane',       '#8b5cf6', 3, false),
  ('Transport',        'Μεταφορές',           'Car',         '#f59e0b', 4, false),
  ('Tours',            'Εκδρομές',            'Map',         '#ec4899', 5, false),
  ('Insurance',        'Ασφαλίσεις',          'Shield',      '#6366f1', 6, false),
  ('Other',            'Άλλα',                'MoreHorizontal','#64748b', 7, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Invoice Hub: hub_shares — invoice sent from company to customer
-- ============================================================
CREATE TABLE IF NOT EXISTS hub_shares (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_email   text NOT NULL,
  customer_name    text,
  message          text,
  access_token     text UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email_sent_at    timestamptz,
  viewed_at        timestamptz,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','sent','viewed','acknowledged')),
  created_at       timestamptz DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id)
);

ALTER TABLE hub_shares ENABLE ROW LEVEL SECURITY;

-- Only authenticated internal users can manage shares
CREATE POLICY "Auth users manage hub_shares"
  ON hub_shares FOR ALL TO authenticated USING (true);

-- Public (customer) can read their own share via token — handled in Edge Function
-- Index for token lookups
CREATE INDEX IF NOT EXISTS hub_shares_token_idx ON hub_shares(access_token);
CREATE INDEX IF NOT EXISTS hub_shares_invoice_idx ON hub_shares(invoice_id);
CREATE INDEX IF NOT EXISTS hub_shares_customer_email_idx ON hub_shares(customer_email);
