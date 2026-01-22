-- Complete database schema updates

-- 1. Add expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_el TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_operational BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO expense_categories (name, name_el, icon, color, is_operational) VALUES
('Tolls', 'Διόδια', 'navigation', '#3b82f6', true),
('Petrol', 'Βενζίνη', 'fuel', '#ef4444', true),
('Personal Use', 'Προσωπική Χρήση', 'user', '#8b5cf6', true),
('Services', 'Υπηρεσίες', 'wrench', '#f59e0b', true),
('Tire Changes', 'Αλλαγή Ελαστικών', 'circle-dot', '#6366f1', true),
('Workshops', 'Συνεργεία', 'hammer', '#ec4899', true),
('Passenger Transport', 'Μεταφορές Επιβατών', 'bus', '#10b981', false),
('Other', 'Άλλα', 'more-horizontal', '#64748b', true)
ON CONFLICT DO NOTHING;

-- 2. Add category reference to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES expense_categories(id);

-- 3. Create shareable links for magic links (2 month expiration)
CREATE TABLE IF NOT EXISTS shareable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  proforma_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  month_year TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 months'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_linked_entity CHECK (
    (proforma_id IS NOT NULL AND package_id IS NULL AND month_year IS NULL) OR
    (proforma_id IS NULL AND package_id IS NOT NULL AND month_year IS NULL) OR
    (proforma_id IS NULL AND package_id IS NULL AND month_year IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_shareable_token ON shareable_links(token);
CREATE INDEX IF NOT EXISTS idx_shareable_expires ON shareable_links(expires_at);

-- 4. Comments/feedback system for magic links
CREATE TABLE IF NOT EXISTS invoice_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shareable_link_id UUID REFERENCES shareable_links(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  is_doubt BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_link ON invoice_comments(shareable_link_id);
CREATE INDEX IF NOT EXISTS idx_comments_unread ON invoice_comments(is_read) WHERE is_read = false;

-- 5. Notification system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'comment', 'doubt', 'view'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, created_at) WHERE is_read = false;

-- 6. Add customer_id to packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- 7. Ensure customers table exists
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  vat_number TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Add updated_at trigger for customers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
