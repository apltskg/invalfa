-- Add expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_el TEXT NOT NULL, -- Greek name
  icon TEXT, -- Lucide icon name
  color TEXT, -- Hex color for UI
  is_operational BOOLEAN DEFAULT false, -- True for operational expenses (tolls, petrol, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default operational categories
INSERT INTO expense_categories (name, name_el, icon, color, is_operational) VALUES
('Tolls', 'Διόδια', 'navigation', '#3b82f6', true),
('Petrol', 'Βενζίνη', 'fuel', '#ef4444', true),
('Personal Use', 'Προσωπική Χρήση', 'user', '#8b5cf6', true),
('Services', 'Υπηρεσίες', 'wrench', '#f59e0b', true),
('Tire Changes', 'Αλλαγή Ελαστικών', 'circle-dot', '#6366f1', true),
('Workshops', 'Συνεργεία', 'hammer', '#ec4899', true),
('Other', 'Άλλα', 'more-horizontal', '#64748b', true);

-- Add category_id to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES expense_categories(id);

-- Create shareable links table for magic links
CREATE TABLE IF NOT EXISTS shareable_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  proforma_id UUID REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_linked_entity CHECK (
    (proforma_id IS NOT NULL AND package_id IS NULL) OR
    (proforma_id IS NULL AND package_id IS NOT NULL)
  )
);

CREATE INDEX idx_shareable_token ON shareable_links(token);
