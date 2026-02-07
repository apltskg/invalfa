import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoMatchResult {
    totalProcessed: number;
    matched: number;
    suggested: number;
    failed: number;
    matches: Array<{
        transactionId: string;
        invoiceId: string;
        confidence: number;
        reason: string;
    }>;
}

interface Transaction {
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    package_id: string | null;
}

interface Invoice {
    id: string;
    amount: number | null;
    invoice_date: string | null;
    merchant: string | null;
    type: 'income' | 'expense';
    package_id: string | null;
    extracted_data: any;
}

/**
 * Calculate similarity between two strings (for vendor/merchant matching)
 */
function stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Check if one contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple word overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));

    return commonWords.length / Math.max(words1.length, words2.length);
}

/**
 * Calculate match confidence between a transaction and invoice
 */
function calculateMatchConfidence(
    txn: Transaction,
    inv: Invoice
): { confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    let confidence = 0;

    // 1. Amount match (most important - up to 50%)
    if (inv.amount && txn.amount) {
        const amountDiff = Math.abs(Math.abs(txn.amount) - inv.amount);
        const percentDiff = amountDiff / Math.max(Math.abs(txn.amount), inv.amount);

        if (amountDiff < 0.01) {
            confidence += 50;
            reasons.push("Ακριβές ποσό");
        } else if (percentDiff < 0.01) {
            confidence += 45;
            reasons.push("Ποσό ~99%");
        } else if (percentDiff < 0.05) {
            confidence += 30;
            reasons.push("Ποσό ~95%");
        }
    }

    // 2. Date proximity (up to 25%)
    if (inv.invoice_date && txn.transaction_date) {
        const invDate = new Date(inv.invoice_date);
        const txnDate = new Date(txn.transaction_date);
        const daysDiff = Math.abs((txnDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 3) {
            confidence += 25;
            reasons.push("Ημερομηνία ±3 ημέρες");
        } else if (daysDiff <= 7) {
            confidence += 20;
            reasons.push("Ημερομηνία ±7 ημέρες");
        } else if (daysDiff <= 30) {
            confidence += 10;
            reasons.push("Ημερομηνία ±30 ημέρες");
        }
    }

    // 3. Description/Merchant match (up to 15%)
    if (txn.description && inv.merchant) {
        const similarity = stringSimilarity(txn.description, inv.merchant);
        if (similarity > 0.7) {
            confidence += 15;
            reasons.push("Ταίριασμα ονόματος");
        } else if (similarity > 0.4) {
            confidence += 10;
            reasons.push("Μερικό ταίριασμα ονόματος");
        }
    }

    // 4. Same package (up to 10%)
    if (txn.package_id && inv.package_id && txn.package_id === inv.package_id) {
        confidence += 10;
        reasons.push("Ίδιος φάκελος");
    }

    return { confidence, reasons };
}

/**
 * Run automatic matching for all unmatched transactions
 */
export async function runAutoMatching(
    options: {
        minConfidence?: number;
        dryRun?: boolean;
        packageId?: string;
    } = {}
): Promise<AutoMatchResult> {
    const { minConfidence = 80, dryRun = false, packageId } = options;

    const result: AutoMatchResult = {
        totalProcessed: 0,
        matched: 0,
        suggested: 0,
        failed: 0,
        matches: [],
    };

    try {
        // 1. Fetch unmatched transactions
        let txnQuery = supabase
            .from("bank_transactions")
            .select("id, transaction_date, description, amount, package_id");

        if (packageId) {
            txnQuery = txnQuery.eq("package_id", packageId);
        }

        const { data: transactions, error: txnError } = await txnQuery;

        if (txnError) throw txnError;
        if (!transactions || transactions.length === 0) {
            return result;
        }

        // 2. Fetch existing matches to exclude already matched
        const { data: existingMatches } = await supabase
            .from("invoice_transaction_matches")
            .select("transaction_id");

        const matchedTxnIds = new Set((existingMatches || []).map(m => m.transaction_id));
        const unmatchedTxns = transactions.filter(t => !matchedTxnIds.has(t.id));

        result.totalProcessed = unmatchedTxns.length;

        if (unmatchedTxns.length === 0) {
            return result;
        }

        // 3. Fetch invoices for matching
        const { data: invoices, error: invError } = await supabase
            .from("invoices")
            .select("id, amount, invoice_date, merchant, type, package_id, extracted_data");

        if (invError) throw invError;
        if (!invoices || invoices.length === 0) {
            return result;
        }

        // 4. Fetch existing invoice matches to exclude
        const { data: invoiceMatches } = await supabase
            .from("invoice_transaction_matches")
            .select("invoice_id");

        const matchedInvIds = new Set((invoiceMatches || []).map(m => m.invoice_id));
        const unmatchedInvoices = invoices.filter(i => !matchedInvIds.has(i.id));

        // 5. Find matches
        const matchesToCreate: Array<{
            invoice_id: string;
            transaction_id: string;
            status: string;
            confidence: number;
            match_reason: string;
        }> = [];

        for (const txn of unmatchedTxns) {
            let bestMatch: { invoice: Invoice; confidence: number; reasons: string[] } | null = null;

            // Determine expected invoice type based on transaction amount
            const expectedType = txn.amount > 0 ? 'income' : 'expense';

            for (const inv of unmatchedInvoices) {
                // Only match income transactions with income invoices, etc.
                if (inv.type !== expectedType) continue;

                const { confidence, reasons } = calculateMatchConfidence(txn, inv as Invoice);

                if (confidence > (bestMatch?.confidence || 0)) {
                    bestMatch = { invoice: inv as Invoice, confidence, reasons };
                }
            }

            if (bestMatch && bestMatch.confidence >= minConfidence) {
                matchesToCreate.push({
                    invoice_id: bestMatch.invoice.id,
                    transaction_id: txn.id,
                    status: "confirmed",
                    confidence: bestMatch.confidence,
                    match_reason: bestMatch.reasons.join(", "),
                });

                result.matches.push({
                    transactionId: txn.id,
                    invoiceId: bestMatch.invoice.id,
                    confidence: bestMatch.confidence,
                    reason: bestMatch.reasons.join(", "),
                });

                // Remove from pool to avoid double-matching
                const invIndex = unmatchedInvoices.findIndex(i => i.id === bestMatch!.invoice.id);
                if (invIndex > -1) unmatchedInvoices.splice(invIndex, 1);

                result.matched++;
            } else if (bestMatch && bestMatch.confidence >= 50) {
                // Lower confidence - suggest but don't auto-confirm
                result.matches.push({
                    transactionId: txn.id,
                    invoiceId: bestMatch.invoice.id,
                    confidence: bestMatch.confidence,
                    reason: bestMatch.reasons.join(", ") + " (χαμηλή εμπιστοσύνη)",
                });
                result.suggested++;
            }
        }

        // 6. Create matches in database (if not dry run)
        if (!dryRun && matchesToCreate.length > 0) {
            const { error: insertError } = await supabase
                .from("invoice_transaction_matches")
                .insert(matchesToCreate.map(m => ({
                    invoice_id: m.invoice_id,
                    transaction_id: m.transaction_id,
                    status: m.status,
                })));

            if (insertError) {
                console.error("Error creating matches:", insertError);
                result.failed = matchesToCreate.length;
                result.matched = 0;
            }
        }

        return result;

    } catch (error) {
        console.error("Auto-matching error:", error);
        throw error;
    }
}

/**
 * Hook-friendly wrapper for auto-matching
 */
export function useAutoMatching() {
    const runMatching = async (options?: Parameters<typeof runAutoMatching>[0]) => {
        try {
            toast.loading("Αυτόματο ταίριασμα σε εξέλιξη...", { id: "auto-match" });

            const result = await runAutoMatching(options);

            if (result.matched > 0) {
                toast.success(
                    `Ταιριάστηκαν ${result.matched} συναλλαγές αυτόματα!`,
                    { id: "auto-match" }
                );
            } else if (result.suggested > 0) {
                toast.info(
                    `Βρέθηκαν ${result.suggested} πιθανές αντιστοιχίσεις για επισκόπηση.`,
                    { id: "auto-match" }
                );
            } else {
                toast.info("Δεν βρέθηκαν νέες αντιστοιχίσεις.", { id: "auto-match" });
            }

            return result;
        } catch (error) {
            toast.error("Σφάλμα στο αυτόματο ταίριασμα", { id: "auto-match" });
            throw error;
        }
    };

    return { runMatching };
}
