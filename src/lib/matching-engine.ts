/**
 * Smart Transaction Matching Engine v2
 * 
 * Matches bank transactions to invoices/records based on:
 * - Amount (exact or ±2% tolerance for bank fees)
 * - Date proximity (±14 days with decay)
 * - Description keywords matching vendor/client name (n-gram + alias matching)
 * - VAT number matching from extracted data
 * - Invoice number matching in bank description
 * - Same-package bonus
 * - Supplier/Customer name database lookup
 */

export interface MatchableRecord {
  id: string;
  type: 'invoice' | 'income' | 'expense';
  amount: number | null;
  date: string | null;
  vendor_or_client: string | null;
  invoice_number?: string | null;
  description?: string | null;
  tax_id?: string | null;
  buyer_vat?: string | null;
  package_id?: string | null;
  supplier_id?: string | null;
  customer_id?: string | null;
}

export interface MatchSuggestion {
  recordId: string;
  recordType: 'invoice' | 'income' | 'expense';
  confidence: number; // 0-1
  confidenceLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  record: MatchableRecord;
}

export interface TransactionForMatching {
  id: string;
  amount: number;
  transaction_date: string;
  description: string;
  package_id?: string | null;
}

// ── Greek-specific aliases for common merchants ────────────────────────
const MERCHANT_ALIASES: Record<string, string[]> = {
  'aegean': ['αεροπορια αιγαιου', 'aegean airlines', 'a3'],
  'olympic': ['ολυμπιακη', 'olympic air'],
  'cosmote': ['κοσμοτε', 'ote', 'cosmote', 'γερμανος'],
  'vodafone': ['βονταφον', 'vodafone'],
  'wind': ['wind hellas'],
  'dei': ['δεη', 'dei', 'δημοσια επιχειρηση ηλεκτρισμου'],
  'efka': ['εφκα', 'efka', 'ika'],
  'shell': ['shell hellas'],
  'bp': ['bp hellas'],
  'eko': ['ελινοιλ', 'eko', 'hellenic petroleum'],
  'attiki odos': ['αττικη οδος', 'attiki odos'],
  'blue star': ['blue star ferries', 'attica group'],
  'minoan': ['μινωικες γραμμες', 'minoan lines'],
  'anek': ['ανεκ', 'anek lines'],
  'booking': ['booking.com', 'bookingcom'],
  'airbnb': ['airbnb', 'airbnb ireland'],
};

// ── Text normalization ────────────────────────────────────────────────
function normalizeGreekText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (tonos)
    .replace(/ς/g, 'σ') // Normalize final sigma
    .replace(/[^a-zα-ω0-9\s]/g, '') // Keep only letters and numbers
    .replace(/\s+/g, ' ')
    .trim();
}

// ── N-gram based text similarity (better for partial matches) ─────────
function generateNgrams(text: string, n: number = 3): Set<string> {
  const normalized = normalizeGreekText(text);
  const ngrams = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n));
  }
  return ngrams;
}

function ngramSimilarity(text1: string, text2: string): number {
  const ngrams1 = generateNgrams(text1);
  const ngrams2 = generateNgrams(text2);
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0;
  
  const intersection = new Set([...ngrams1].filter(n => ngrams2.has(n)));
  const union = new Set([...ngrams1, ...ngrams2]);
  
  return intersection.size / union.size;
}

// ── Word overlap similarity (kept for exact word matches) ─────────────
function wordOverlapSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeGreekText(text1).split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(normalizeGreekText(text2).split(/\s+/).filter(w => w.length > 2));
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// ── Alias-aware text similarity ───────────────────────────────────────
function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeGreekText(text1);
  const norm2 = normalizeGreekText(text2);
  
  // Direct containment check (very strong signal)
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;
  
  // Check merchant aliases
  for (const [key, aliases] of Object.entries(MERCHANT_ALIASES)) {
    const allNames = [key, ...aliases];
    const text1HasAlias = allNames.some(a => norm1.includes(a));
    const text2HasAlias = allNames.some(a => norm2.includes(a));
    if (text1HasAlias && text2HasAlias) return 0.9;
  }
  
  // Combine n-gram and word overlap (weighted average)
  const ngramScore = ngramSimilarity(text1, text2);
  const wordScore = wordOverlapSimilarity(text1, text2);
  
  return Math.max(ngramScore * 0.6 + wordScore * 0.4, ngramScore, wordScore);
}

// ── Date proximity score ──────────────────────────────────────────────
function calculateDateScore(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 1;
  if (diffDays <= 1) return 0.95;
  if (diffDays <= 3) return 0.9;
  if (diffDays <= 5) return 0.75;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 14) return 0.35;
  if (diffDays <= 30) return 0.15;
  return 0;
}

// ── Amount match score ────────────────────────────────────────────────
function calculateAmountScore(txnAmount: number, recordAmount: number): number {
  const txnAbs = Math.abs(txnAmount);
  const recAbs = Math.abs(recordAmount);
  
  if (txnAbs === 0 && recAbs === 0) return 0;
  if (Math.abs(txnAbs - recAbs) < 0.01) return 1; // Exact match
  
  const percentDiff = Math.abs(txnAbs - recAbs) / Math.max(txnAbs, recAbs);
  
  if (percentDiff <= 0.005) return 0.98; // Rounding difference
  if (percentDiff <= 0.02) return 0.92;  // Bank fees ±2%
  if (percentDiff <= 0.05) return 0.65;  // ±5%
  if (percentDiff <= 0.10) return 0.3;   // ±10%
  return 0;
}

// ── VAT number matching ───────────────────────────────────────────────
function checkVatInDescription(description: string, taxId?: string | null, buyerVat?: string | null): { score: number; reason: string } | null {
  if (!description) return null;
  const descClean = description.replace(/\s/g, '').toLowerCase();
  
  if (taxId && taxId.length === 9 && descClean.includes(taxId)) {
    return { score: 0.95, reason: 'ΑΦΜ πωλητή στην περιγραφή τράπεζας' };
  }
  if (buyerVat && buyerVat.length === 9 && descClean.includes(buyerVat)) {
    return { score: 0.85, reason: 'ΑΦΜ αγοραστή στην περιγραφή τράπεζας' };
  }
  return null;
}

// ── Invoice number in description ─────────────────────────────────────
function checkInvoiceNumberInDescription(description: string, invoiceNumber?: string | null): { score: number; reason: string } | null {
  if (!invoiceNumber || invoiceNumber.length < 3 || !description) return null;
  const descClean = description.replace(/\s/g, '').toLowerCase();
  const invClean = invoiceNumber.replace(/\s/g, '').toLowerCase();
  
  if (descClean.includes(invClean)) {
    return { score: 0.9, reason: 'Αρ. τιμολογίου στην περιγραφή τράπεζας' };
  }
  return null;
}

/**
 * Find matching suggestions for a transaction (v2 — enhanced)
 */
export function findMatchSuggestions(
  transaction: TransactionForMatching,
  records: MatchableRecord[],
  maxSuggestions: number = 5
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = [];
  
  for (const record of records) {
    if (!record.amount) continue;
    
    const reasons: string[] = [];
    const scores: { weight: number; score: number }[] = [];
    
    // ── 1. Amount matching (weight: 35%) ──────────────────────────────
    const amountScore = calculateAmountScore(transaction.amount, record.amount);
    if (amountScore === 0) continue; // Skip if amount is totally off
    
    scores.push({ weight: 0.35, score: amountScore });
    if (amountScore === 1) reasons.push('Ακριβές ποσό');
    else if (amountScore >= 0.92) reasons.push('Ποσό ±2% (τραπ. έξοδα)');
    else if (amountScore >= 0.65) reasons.push('Ποσό ±5%');
    else reasons.push('Ποσό ~±10%');
    
    // ── 2. Date matching (weight: 25%) ────────────────────────────────
    if (record.date) {
      const dateScore = calculateDateScore(transaction.transaction_date, record.date);
      if (dateScore > 0) {
        scores.push({ weight: 0.25, score: dateScore });
        const diffDays = Math.abs(
          (new Date(transaction.transaction_date).getTime() - new Date(record.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 1) reasons.push('Ίδια ημερομηνία');
        else if (diffDays <= 7) reasons.push(`Ημ/νία: ±${Math.round(diffDays)} ημ.`);
        else reasons.push(`Ημ/νία: ±${Math.round(diffDays)} ημ.`);
      }
    }
    
    // ── 3. Text/vendor matching (weight: 20%) ─────────────────────────
    const vendorName = record.vendor_or_client || '';
    const recordDesc = record.description || '';
    const combinedRecordText = `${vendorName} ${recordDesc}`.trim();
    
    if (combinedRecordText) {
      const textScore = calculateTextSimilarity(transaction.description, combinedRecordText);
      if (textScore > 0.1) {
        scores.push({ weight: 0.20, score: textScore });
        if (textScore >= 0.7) reasons.push('Ταίριασμα ονόματος');
        else if (textScore >= 0.4) reasons.push('Μερική αντιστοίχ. ονόματος');
      }
    }
    
    // ── 4. VAT number matching (weight: 15% bonus) ────────────────────
    const vatMatch = checkVatInDescription(transaction.description, record.tax_id, record.buyer_vat);
    if (vatMatch) {
      scores.push({ weight: 0.15, score: vatMatch.score });
      reasons.push(vatMatch.reason);
    }
    
    // ── 5. Invoice number in description (weight: 10% bonus) ──────────
    const invNumMatch = checkInvoiceNumberInDescription(transaction.description, record.invoice_number);
    if (invNumMatch) {
      scores.push({ weight: 0.10, score: invNumMatch.score });
      reasons.push(invNumMatch.reason);
    }
    
    // ── 6. Same package bonus (weight: 5%) ────────────────────────────
    if (transaction.package_id && record.package_id && transaction.package_id === record.package_id) {
      scores.push({ weight: 0.05, score: 1 });
      reasons.push('Ίδιος φάκελος');
    }
    
    // ── Calculate weighted score ──────────────────────────────────────
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedSum = scores.reduce((sum, s) => sum + s.weight * s.score, 0);
    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Boost: if we have VAT or invoice number match, ensure minimum score
    const hasStrongSignal = vatMatch || invNumMatch;
    const adjustedScore = hasStrongSignal ? Math.max(finalScore, 0.7) : finalScore;
    
    if (adjustedScore >= 0.45) {
      let confidenceLevel: 'high' | 'medium' | 'low';
      if (adjustedScore >= 0.85) confidenceLevel = 'high';
      else if (adjustedScore >= 0.65) confidenceLevel = 'medium';
      else confidenceLevel = 'low';
      
      suggestions.push({
        recordId: record.id,
        recordType: record.type,
        confidence: adjustedScore,
        confidenceLevel,
        reasons,
        record,
      });
    }
  }
  
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);
}

/**
 * Get confidence level styling (using semantic tokens)
 */
export function getConfidenceStyles(level: 'high' | 'medium' | 'low'): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (level) {
    case 'high':
      return {
        bgClass: 'bg-emerald-500/10',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-500/30',
      };
    case 'medium':
      return {
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-500/30',
      };
    case 'low':
      return {
        bgClass: 'bg-orange-500/10',
        textClass: 'text-orange-700 dark:text-orange-400',
        borderClass: 'border-orange-500/30',
      };
  }
}
