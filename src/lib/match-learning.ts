import { supabase } from "@/integrations/supabase/client";

/**
 * Match Learning Engine
 * 
 * Learns from confirmed matches to improve future matching accuracy.
 * Builds a pattern database of: description keywords → merchant/supplier mappings
 */

export interface LearnedPattern {
  descriptionKeywords: string[];
  merchantName: string;
  supplierId: string | null;
  customerId: string | null;
  taxId: string | null;
  categoryType: string;
  matchCount: number;
}

/**
 * Build learned patterns from confirmed matches in the database
 */
export async function buildLearnedPatterns(): Promise<LearnedPattern[]> {
  // Fetch confirmed matches with transaction + invoice details
  const { data: matches } = await supabase
    .from('invoice_transaction_matches')
    .select('transaction_id, invoice_id, status')
    .eq('status', 'confirmed')
    .limit(500);

  if (!matches || matches.length === 0) return [];

  // Batch-fetch transactions and invoices
  const txnIds = matches.map(m => m.transaction_id);
  const invIds = matches.map(m => m.invoice_id);

  const [{ data: transactions }, { data: invoices }] = await Promise.all([
    supabase.from('bank_transactions').select('id, description, amount').in('id', txnIds),
    supabase.from('invoices').select('id, merchant, supplier_id, customer_id, type, extracted_data').in('id', invIds),
  ]);

  if (!transactions || !invoices) return [];

  const txnMap = new Map(transactions.map(t => [t.id, t]));
  const invMap = new Map(invoices.map(i => [i.id, i]));

  // Build patterns: group by merchant name
  const patternMap = new Map<string, LearnedPattern>();

  for (const match of matches) {
    const txn = txnMap.get(match.transaction_id);
    const inv = invMap.get(match.invoice_id);
    if (!txn || !inv) continue;

    const merchantKey = (inv.merchant || '').toLowerCase().trim();
    if (!merchantKey) continue;

    const extracted = (inv.extracted_data as any)?.extracted || inv.extracted_data;

    const existing = patternMap.get(merchantKey);
    if (existing) {
      // Add new keywords from this transaction's description
      const words = extractSignificantWords(txn.description);
      for (const w of words) {
        if (!existing.descriptionKeywords.includes(w)) {
          existing.descriptionKeywords.push(w);
        }
      }
      existing.matchCount++;
    } else {
      patternMap.set(merchantKey, {
        descriptionKeywords: extractSignificantWords(txn.description),
        merchantName: inv.merchant || '',
        supplierId: inv.supplier_id,
        customerId: inv.customer_id,
        taxId: extracted?.tax_id || null,
        categoryType: inv.type || 'expense',
        matchCount: 1,
      });
    }
  }

  return [...patternMap.values()].sort((a, b) => b.matchCount - a.matchCount);
}

/**
 * Extract significant words from a bank description (skip common/short words)
 */
function extractSignificantWords(description: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'of', 'with',
    'και', 'η', 'ο', 'το', 'τα', 'τον', 'την', 'στο', 'στη', 'στα',
    'απο', 'για', 'με', 'σε', 'eur', 'euro', 'payment', 'πληρωμη',
    'transfer', 'credit', 'debit', 'card',
  ]);

  return description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zα-ω0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Score a transaction description against learned patterns
 * Returns bonus confidence points (0-20) and matched merchant
 */
export function scoreWithLearnedPatterns(
  description: string,
  patterns: LearnedPattern[]
): { bonus: number; matchedMerchant: string | null; reason: string | null } {
  if (patterns.length === 0) return { bonus: 0, matchedMerchant: null, reason: null };

  const descWords = new Set(extractSignificantWords(description));
  if (descWords.size === 0) return { bonus: 0, matchedMerchant: null, reason: null };

  let bestScore = 0;
  let bestPattern: LearnedPattern | null = null;

  for (const pattern of patterns) {
    if (pattern.descriptionKeywords.length === 0) continue;

    // Count how many learned keywords match
    const matchedKeywords = pattern.descriptionKeywords.filter(kw => descWords.has(kw));
    const overlap = matchedKeywords.length / Math.min(pattern.descriptionKeywords.length, descWords.size);

    // Weight by how many times this pattern was confirmed
    const historyBoost = Math.min(pattern.matchCount / 5, 1); // cap at 5 confirmations
    const score = overlap * 0.7 + historyBoost * 0.3;

    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  if (!bestPattern) return { bonus: 0, matchedMerchant: null, reason: null };

  // Convert to bonus points (max 20)
  const bonus = Math.round(bestScore * 20);
  return {
    bonus,
    matchedMerchant: bestPattern.merchantName,
    reason: `Ιστορικό: ${bestPattern.merchantName} (${bestPattern.matchCount}x)`,
  };
}
