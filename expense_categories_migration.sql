-- Expand invoice_category enum with travel agency categories
-- Run this in Supabase SQL Editor

-- Step 1: Add new values to the enum
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'fuel';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'payroll';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'government';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'rent';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'telecom';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'insurance';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'office';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE invoice_category ADD VALUE IF NOT EXISTS 'marketing';

-- Step 2: Seed expense_categories table with proper travel agency categories
-- (only inserts if category doesn't already exist by name_el)

INSERT INTO expense_categories (name, name_el, icon, color, is_operational, sort_order)
SELECT * FROM (VALUES
  ('Hotels', 'Ξενοδοχεία', 'Hotel', '#3b82f6', true, 1),
  ('Airlines', 'Αεροπορικά', 'Plane', '#6366f1', true, 2),
  ('Tolls', 'Διόδια', 'Navigation', '#f59e0b', true, 3),
  ('Fuel', 'Καύσιμα', 'Fuel', '#ef4444', true, 4),
  ('Passenger Transport', 'Μεταφορές Επιβατών', 'Bus', '#8b5cf6', true, 5),
  ('Payroll', 'Μισθοδοσία', 'Users', '#ec4899', true, 6),
  ('Government / Tax', 'Δημόσιο / ΦΠΑ / ΕΦΚΑ', 'Building', '#64748b', true, 7),
  ('Rent / Fixed', 'Ενοίκια / Πάγια', 'Building2', '#14b8a6', true, 8),
  ('Telecom', 'Τηλεπικοινωνίες', 'Phone', '#06b6d4', true, 9),
  ('Insurance', 'Ασφάλεια', 'Shield', '#10b981', true, 10),
  ('Office Supplies', 'Γραφική Ύλη / Εξοπλισμός', 'Package', '#f97316', true, 11),
  ('Maintenance', 'Συντήρηση', 'Wrench', '#a855f7', true, 12),
  ('Marketing', 'Διαφήμιση / Marketing', 'Megaphone', '#e11d48', true, 13),
  ('Other', 'Λοιπά', 'MoreHorizontal', '#94a3b8', true, 14)
) AS v(name, name_el, icon, color, is_operational, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories WHERE expense_categories.name_el = v.name_el
);
