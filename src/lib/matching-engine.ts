/**
 * Smart Transaction Matching Engine
 * 
 * Matches bank transactions to invoices/records based on:
 * - Amount (exact or ±2% tolerance for bank fees)
 * - Date proximity (±7 days from invoice date)
 * - Description keywords matching vendor/client name
 */

export interface MatchableRecord {
  id: string;
  type: 'invoice' | 'income' | 'expense';
  amount: number | null;
  date: string | null;
  vendor_or_client: string | null;
  invoice_number?: string | null;
  description?: string | null;
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
}

// Normalize Greek text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zα-ω0-9\s]/g, '') // Keep only letters and numbers
    .trim();
}

// Calculate text similarity using word overlap
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(normalizeText(text2).split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Calculate date proximity score (1 = same day, 0 = 7+ days apart)
function calculateDateScore(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 1;
  if (diffDays <= 3) return 0.9;
  if (diffDays <= 5) return 0.7;
  if (diffDays <= 7) return 0.5;
  if (diffDays <= 14) return 0.3;
  return 0;
}

// Calculate amount match score (1 = exact, 0.9 = within 2%, 0 = >5% diff)
function calculateAmountScore(txnAmount: number, recordAmount: number): number {
  const txnAbs = Math.abs(txnAmount);
  const recAbs = Math.abs(recordAmount);
  
  if (txnAbs === recAbs) return 1;
  
  const diff = Math.abs(txnAbs - recAbs);
  const percentDiff = diff / Math.max(txnAbs, recAbs);
  
  if (percentDiff <= 0.02) return 0.95; // Within 2% (bank fees)
  if (percentDiff <= 0.05) return 0.7;  // Within 5%
  if (percentDiff <= 0.10) return 0.3;  // Within 10%
  return 0;
}

/**
 * Find matching suggestions for a transaction
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
    let totalScore = 0;
    let weightSum = 0;
    
    // Amount matching (weight: 40%)
    const amountScore = calculateAmountScore(transaction.amount, record.amount);
    if (amountScore > 0) {
      totalScore += amountScore * 0.4;
      weightSum += 0.4;
      
      if (amountScore === 1) {
        reasons.push('Ακριβές ποσό');
      } else if (amountScore >= 0.95) {
        reasons.push('Ποσό ±2% (τραπεζικά έξοδα)');
      } else if (amountScore >= 0.7) {
        reasons.push('Ποσό ±5%');
      }
    } else {
      // If amount is way off, skip this record
      continue;
    }
    
    // Date matching (weight: 35%)
    if (record.date) {
      const dateScore = calculateDateScore(transaction.transaction_date, record.date);
      if (dateScore > 0) {
        totalScore += dateScore * 0.35;
        weightSum += 0.35;
        
        const diffDays = Math.abs(
          (new Date(transaction.transaction_date).getTime() - new Date(record.date).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        if (diffDays <= 1) {
          reasons.push('Ίδια ημερομηνία');
        } else if (diffDays <= 3) {
          reasons.push(`Ημ/νία: +${Math.round(diffDays)} ημέρες`);
        } else if (diffDays <= 7) {
          reasons.push(`Ημ/νία: +${Math.round(diffDays)} ημέρες`);
        }
      }
    }
    
    // Text/vendor matching (weight: 25%)
    const vendorName = record.vendor_or_client || '';
    const description = record.description || '';
    const combinedRecordText = `${vendorName} ${description}`;
    
    if (combinedRecordText.trim()) {
      const textScore = calculateTextSimilarity(transaction.description, combinedRecordText);
      if (textScore > 0) {
        totalScore += textScore * 0.25;
        weightSum += 0.25;
        
        if (textScore >= 0.5) {
          reasons.push('Αντιστοίχιση ονόματος');
        } else if (textScore >= 0.3) {
          reasons.push('Μερική αντιστοίχιση');
        }
      }
    }
    
    // Normalize score
    const finalScore = weightSum > 0 ? totalScore / weightSum : 0;
    
    // Only include if score is above threshold
    if (finalScore >= 0.5) {
      let confidenceLevel: 'high' | 'medium' | 'low';
      if (finalScore >= 0.9) {
        confidenceLevel = 'high';
      } else if (finalScore >= 0.7) {
        confidenceLevel = 'medium';
      } else {
        confidenceLevel = 'low';
      }
      
      suggestions.push({
        recordId: record.id,
        recordType: record.type,
        confidence: finalScore,
        confidenceLevel,
        reasons,
        record,
      });
    }
  }
  
  // Sort by confidence and return top N
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);
}

/**
 * Get confidence level styling
 */
export function getConfidenceStyles(level: 'high' | 'medium' | 'low'): {
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (level) {
    case 'high':
      return {
        bgClass: 'bg-green-50 dark:bg-green-950/30',
        textClass: 'text-green-700 dark:text-green-400',
        borderClass: 'border-green-200 dark:border-green-800',
      };
    case 'medium':
      return {
        bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
        textClass: 'text-yellow-700 dark:text-yellow-400',
        borderClass: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'low':
      return {
        bgClass: 'bg-orange-50 dark:bg-orange-950/30',
        textClass: 'text-orange-700 dark:text-orange-400',
        borderClass: 'border-orange-200 dark:border-orange-800',
      };
  }
}
