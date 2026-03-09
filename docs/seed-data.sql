-- Seed Data for Demo/Development
-- Run this in Supabase SQL Editor to populate sample data

-- Sample Expense Categories
INSERT INTO expense_categories (name, name_el, icon, color, sort_order, is_default, is_operational) VALUES
  ('Tolls', 'Διόδια', '🛣️', '#3B82F6', 1, true, true),
  ('Fuel', 'Βενζίνη', '⛽', '#EF4444', 2, true, true),
  ('Personal Use', 'Προσωπική Χρήση', '👤', '#8B5CF6', 3, true, false),
  ('Services', 'Υπηρεσίες', '🔧', '#F59E0B', 4, true, true),
  ('Tire Changes', 'Αλλαγή Ελαστικών', '⭕', '#6B7280', 5, true, true),
  ('Workshops', 'Συνεργεία', '🔨', '#10B981', 6, true, true),
  ('Passenger Transport', 'Μεταφορές Επιβατών', '🚌', '#3B82F6', 7, true, true),
  ('Other', 'Άλλα', '➕', '#9CA3AF', 8, true, false)
ON CONFLICT DO NOTHING;

-- Sample Customers
INSERT INTO customers (name, email, phone, vat_number, address) VALUES
  ('Acme Travel Corp', 'info@acmetravel.com', '+30 210 1234567', '123456789', 'Athens, Greece'),
  ('Global Tours Ltd', 'contact@globaltours.com', '+30 210 9876543', '987654321', 'Thessaloniki, Greece'),
  ('Sunrise Holidays', 'hello@sunriseholidays.com', '+30 2810 555666', '456789123', 'Heraklion, Crete')
ON CONFLICT DO NOTHING;

-- Sample Suppliers
INSERT INTO suppliers (name, email, phone, vat_number, address) VALUES
  ('Olympic Airways', 'bookings@olympic.gr', '+30 210 1111111', '111222333', 'Athens Airport'),
  ('Athens Grand Hotel', 'reservations@athensgrand.gr', '+30 210 2222222', '222333444', 'Syntagma Square, Athens'),
  ('EuroRent Cars', 'fleet@eurorent.gr', '+30 210 3333333', '333444555', 'Piraeus, Greece'),
  ('Mediterranean Ferries', 'tickets@medferries.gr', '+30 210 4444444', '444555666', 'Piraeus Port')
ON CONFLICT DO NOTHING;

-- Sample Packages
INSERT INTO packages (client_name, start_date, end_date, status) VALUES
  ('Athens Weekend Getaway', '2025-04-15', '2025-04-18', 'active'),
  ('Santorini Luxury Tour', '2025-05-01', '2025-05-07', 'active'),
  ('Crete Family Adventure', '2025-06-10', '2025-06-17', 'active'),
  ('Rhodes Cultural Trip', '2025-03-01', '2025-03-05', 'completed')
ON CONFLICT DO NOTHING;

-- Sample Banks
INSERT INTO banks (name, name_el, brand_color, is_active) VALUES
  ('Eurobank', 'Eurobank', '#003366', true),
  ('Alpha Bank', 'Alpha Bank', '#002E6E', true),
  ('Piraeus Bank', 'Τράπεζα Πειραιώς', '#004B87', true),
  ('National Bank', 'Εθνική Τράπεζα', '#003D7C', true),
  ('Viva Wallet', 'Viva Wallet', '#FF6600', true),
  ('Wise', 'Wise', '#9FE870', true)
ON CONFLICT DO NOTHING;

-- Sample Agency Settings
INSERT INTO agency_settings (company_name, vat_number, email, phone, address)
VALUES ('Demo Travel Agency', '999888777', 'demo@travelagency.com', '+30 210 0000000', 'Demo Street 1, Athens')
ON CONFLICT DO NOTHING;