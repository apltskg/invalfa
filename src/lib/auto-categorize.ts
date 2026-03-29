import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-categorization engine
 * 
 * Priority order:
 * 1. Supplier history (if this supplier was categorized before, reuse)
 * 2. AI-extracted category → expense_categories table mapping
 * 3. Keyword-based fallback from merchant name
 */

// Map AI category names to expense_categories.name values
const AI_TO_DB_CATEGORY: Record<string, string> = {
  airline: 'Airline',
  hotel: 'Hotel',
  tolls: 'Tolls',
  fuel: 'Fuel',
  transport: 'Transport',
  payroll: 'Payroll',
  government: 'Government',
  rent: 'Rent',
  telecom: 'Telecom',
  insurance: 'Insurance',
  office: 'Office',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  other: 'Other',
};

// Keyword patterns for fallback categorization
const KEYWORD_PATTERNS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['aegean', 'sky express', 'ryanair', 'olympic', 'αεροπ', 'flight', 'πτήση'], category: 'airline' },
  { keywords: ['hotel', 'ξενοδοχ', 'booking.com', 'airbnb', 'accommodation', 'διαμονή'], category: 'hotel' },
  { keywords: ['shell', 'bp', 'eko', 'καύσιμα', 'βενζίνη', 'diesel', 'fuel', 'πετρέλαιο'], category: 'fuel' },
  { keywords: ['cosmote', 'vodafone', 'wind', 'ote', 'τηλεπικοιν', 'internet'], category: 'telecom' },
  { keywords: ['ενοίκιο', 'μίσθωμα', 'rent', 'lease'], category: 'rent' },
  { keywords: ['ασφάλ', 'insurance', 'interamerican', 'εθνική ασφ'], category: 'insurance' },
  { keywords: ['google ads', 'facebook', 'meta ads', 'διαφήμ', 'marketing'], category: 'marketing' },
  { keywords: ['attiki odos', 'αττική οδός', 'egnatia', 'διόδια', 'toll', 'e-pass'], category: 'tolls' },
  { keywords: ['ktel', 'ferry', 'blue star', 'taxi', 'μεταφορ', 'bus'], category: 'transport' },
  { keywords: ['εφκα', 'efka', 'μισθοδοσία', 'payroll', 'salary'], category: 'payroll' },
  { keywords: ['εφορία', 'φπα', 'ενφια', 'tax', 'δημόσιο', 'government'], category: 'government' },
  { keywords: ['plaisio', 'public', 'γραφική ύλη', 'office', 'stationery'], category: 'office' },
  { keywords: ['συντήρηση', 'repair', 'service', 'maintenance'], category: 'maintenance' },
];

let categoryCache: Map<string, string> | null = null;

/** Load expense_categories and build name→id map */
async function loadCategoryMap(): Promise<Map<string, string>> {
  if (categoryCache) return categoryCache;
  
  const { data } = await supabase
    .from('expense_categories')
    .select('id, name, name_el');
  
  const map = new Map<string, string>();
  for (const cat of data || []) {
    map.set(cat.name.toLowerCase(), cat.id);
    map.set(cat.name_el.toLowerCase(), cat.id);
  }
  categoryCache = map;
  return map;
}

/** Invalidate cache when categories change */
export function invalidateCategoryCache() {
  categoryCache = null;
}

/**
 * Look up supplier's most-used category from previous invoices
 */
async function getSupplierHistoryCategory(supplierId: string | null, taxId: string | null): Promise<string | null> {
  if (!supplierId && !taxId) return null;

  // Try by supplier_id first
  if (supplierId) {
    const { data } = await supabase
      .from('invoices')
      .select('expense_category_id')
      .eq('supplier_id', supplierId)
      .not('expense_category_id', 'is', null)
      .limit(5);
    
    if (data && data.length > 0) {
      // Return most frequent category
      const counts = new Map<string, number>();
      for (const inv of data) {
        const id = inv.expense_category_id!;
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }

  // Try by tax_id in extracted_data
  if (taxId && taxId.length === 9) {
    const { data } = await supabase
      .from('invoices')
      .select('expense_category_id, extracted_data')
      .not('expense_category_id', 'is', null)
      .limit(100);
    
    if (data) {
      const matching = data.filter(inv => {
        const ext = (inv.extracted_data as any)?.extracted || inv.extracted_data;
        return ext?.tax_id === taxId;
      });
      if (matching.length > 0) {
        const counts = new Map<string, number>();
        for (const inv of matching) {
          const id = inv.expense_category_id!;
          counts.set(id, (counts.get(id) || 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      }
    }
  }

  return null;
}

/**
 * Detect category from merchant name using keywords
 */
function detectCategoryFromKeywords(merchantName: string): string | null {
  const normalized = merchantName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const pattern of KEYWORD_PATTERNS) {
    if (pattern.keywords.some(kw => normalized.includes(kw))) {
      return pattern.category;
    }
  }
  return null;
}

/**
 * Main auto-categorize function
 * Returns expense_category_id or null
 */
export async function autoCategorize(params: {
  aiCategory?: string | null;
  merchantName?: string | null;
  supplierId?: string | null;
  taxId?: string | null;
}): Promise<{ categoryId: string | null; source: 'supplier_history' | 'ai_extraction' | 'keyword_match' | 'none' }> {
  const catMap = await loadCategoryMap();

  // 1. Supplier history (highest priority - user's own pattern)
  const historyCategory = await getSupplierHistoryCategory(params.supplierId, params.taxId);
  if (historyCategory) {
    return { categoryId: historyCategory, source: 'supplier_history' };
  }

  // 2. AI-extracted category
  if (params.aiCategory && params.aiCategory !== 'other') {
    const dbName = AI_TO_DB_CATEGORY[params.aiCategory];
    if (dbName) {
      const catId = catMap.get(dbName.toLowerCase());
      if (catId) {
        return { categoryId: catId, source: 'ai_extraction' };
      }
    }
  }

  // 3. Keyword-based detection from merchant name
  if (params.merchantName) {
    const kwCategory = detectCategoryFromKeywords(params.merchantName);
    if (kwCategory) {
      const dbName = AI_TO_DB_CATEGORY[kwCategory];
      if (dbName) {
        const catId = catMap.get(dbName.toLowerCase());
        if (catId) {
          return { categoryId: catId, source: 'keyword_match' };
        }
      }
    }
  }

  return { categoryId: null, source: 'none' };
}
