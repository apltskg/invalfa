-- ============================================================
-- cleanup_duplicate_customers.sql
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
-- 
-- HOW IT WORKS:
-- 1. For customers with the same vat_number, keeps the OLDEST one (by created_at)
-- 2. Updates all invoices from duplicate customers to point to the oldest one
-- 3. Deletes the duplicate customers
-- ============================================================

BEGIN;

-- Step 1: Show what will be merged (safe preview - nothing is changed yet)
SELECT 
    vat_number,
    COUNT(*) AS duplicates,
    MIN(created_at) AS oldest_record,
    string_agg(id::text, ', ' ORDER BY created_at) AS all_ids,
    string_agg(name, ' | ' ORDER BY created_at) AS all_names
FROM customers
WHERE vat_number IS NOT NULL 
  AND vat_number != ''
  AND vat_number ~ '^\d{9}$'
GROUP BY vat_number
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;

-- Step 2: Also show customers with no valid VAT (will not auto-merge, just for review)
SELECT 
    id, name, vat_number, created_at,
    CASE 
        WHEN vat_number IS NULL THEN 'NULL'
        WHEN vat_number = '' THEN 'EMPTY'
        WHEN NOT (vat_number ~ '^\d{9}$') THEN 'INVALID FORMAT'
        ELSE 'OK'
    END AS vat_status
FROM customers
ORDER BY name;

COMMIT;

-- ============================================================
-- Run the above first to preview. If results look correct, 
-- then run the section below to actually perform the cleanup:
-- ============================================================

BEGIN;

-- Step 3: Re-assign invoices from duplicates to the canonical (oldest) customer
WITH canonical AS (
    SELECT DISTINCT ON (vat_number)
        id   AS keep_id,
        vat_number
    FROM customers
    WHERE vat_number IS NOT NULL
      AND vat_number != ''
      AND vat_number ~ '^\d{9}$'
    ORDER BY vat_number, created_at ASC   -- keep oldest
),
duplicates AS (
    SELECT c.id AS dup_id, can.keep_id
    FROM customers c
    JOIN canonical can ON can.vat_number = c.vat_number
    WHERE c.id != can.keep_id
)
UPDATE invoices
SET customer_id = d.keep_id
FROM duplicates d
WHERE invoices.customer_id = d.dup_id;

-- Step 4: Delete the duplicate customer rows
WITH canonical AS (
    SELECT DISTINCT ON (vat_number)
        id AS keep_id,
        vat_number
    FROM customers
    WHERE vat_number IS NOT NULL
      AND vat_number != ''
      AND vat_number ~ '^\d{9}$'
    ORDER BY vat_number, created_at ASC
)
DELETE FROM customers
WHERE id NOT IN (SELECT keep_id FROM canonical)
  AND vat_number IS NOT NULL
  AND vat_number != ''
  AND vat_number ~ '^\d{9}$'
  AND id IN (
    SELECT c.id FROM customers c
    JOIN canonical can ON can.vat_number = c.vat_number
    WHERE c.id != can.keep_id
  );

-- Step 5: After cleanup, add UNIQUE constraint to vat_number to prevent future duplicates
-- (Only run if there are no remaining duplicates)
ALTER TABLE customers 
ADD CONSTRAINT customers_vat_number_unique 
UNIQUE (vat_number);

COMMIT;

-- ============================================================
-- OPTIONAL: Clean up customers with INVALID VAT formats
-- (e.g. "EL123456789", spaces, letters etc.)
-- This will standardize them to just the 9 digits
-- ============================================================
UPDATE customers
SET vat_number = regexp_replace(vat_number, '\D', '', 'g')
WHERE vat_number IS NOT NULL
  AND NOT (vat_number ~ '^\d{9}$')
  AND regexp_replace(vat_number, '\D', '', 'g') ~ '^\d{9}$';

-- ============================================================
-- VERIFICATION: Run after everything to confirm no duplicates remain
-- ============================================================
SELECT vat_number, COUNT(*), string_agg(name, ', ') 
FROM customers 
WHERE vat_number IS NOT NULL
GROUP BY vat_number 
HAVING COUNT(*) > 1;
-- Should return 0 rows if cleanup was successful
