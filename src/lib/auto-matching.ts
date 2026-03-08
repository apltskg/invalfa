import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoMatchResult {
    totalProcessed: number;
    matched: number;
    suggested: number;
    failed: number;
    autoLinkedSuppliers: number;
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
    supplier_id: string | null;
    customer_id: string | null;
    extracted_data: any;
}

interface InvoiceListItem {
    id: string;
    invoice_number: string | null;
    client_name: string | null;
    client_vat: string | null;
    invoice_date: string | null;
    net_amount: number | null;
    total_amount: number | null;
    match_status: string | null;
}

interface Supplier {
    id: string;
    name: string;
    vat_number: string | null;
}

interface Customer {
    id: string;
    name: string;
    vat_number: string | null;
}

// ── Greek text normalization ──────────────────────────────────────────
function normalizeGreek(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ς/g, 'σ')
        .replace(/[^a-zα-ω0-9\s]/g, '')
        .trim();
}

function stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    const s1 = normalizeGreek(str1);
    const s2 = normalizeGreek(str2);
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.85;

    // N-gram similarity
    const ngrams = (text: string, n = 3) => {
        const set = new Set<string>();
        for (let i = 0; i <= text.length - n; i++) set.add(text.substring(i, i + n));
        return set;
    };
    const ng1 = ngrams(s1);
    const ng2 = ngrams(s2);
    if (ng1.size === 0 || ng2.size === 0) return 0;
    const intersection = [...ng1].filter(n => ng2.has(n)).length;
    const union = new Set([...ng1, ...ng2]).size;
    return intersection / union;
}

function calculateMatchConfidence(
    txn: Transaction,
    inv: Invoice,
    supplierMap: Map<string, Supplier>,
    customerMap: Map<string, Customer>
): { confidence: number; reasons: string[] } {
    const reasons: string[] = [];
    let confidence = 0;

    // 1. Amount match (up to 50%)
    if (inv.amount && txn.amount) {
        const amountDiff = Math.abs(Math.abs(txn.amount) - inv.amount);
        const percentDiff = amountDiff / Math.max(Math.abs(txn.amount), inv.amount);
        if (amountDiff < 0.01) { confidence += 50; reasons.push("Ακριβές ποσό"); }
        else if (percentDiff < 0.01) { confidence += 45; reasons.push("Ποσό ~99%"); }
        else if (percentDiff < 0.02) { confidence += 38; reasons.push("Ποσό ±2%"); }
        else if (percentDiff < 0.05) { confidence += 28; reasons.push("Ποσό ±5%"); }
    }

    // 2. Date proximity (up to 25%)
    if (inv.invoice_date && txn.transaction_date) {
        const daysDiff = Math.abs(
            (new Date(txn.transaction_date).getTime() - new Date(inv.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysDiff <= 1) { confidence += 25; reasons.push("Ίδια ημ/νία"); }
        else if (daysDiff <= 3) { confidence += 22; reasons.push("Ημ/νία ±3 ημ."); }
        else if (daysDiff <= 7) { confidence += 18; reasons.push("Ημ/νία ±7 ημ."); }
        else if (daysDiff <= 14) { confidence += 12; reasons.push("Ημ/νία ±14 ημ."); }
        else if (daysDiff <= 30) { confidence += 6; reasons.push("Ημ/νία ±30 ημ."); }
    }

    // 3. Description/Merchant match (up to 15%)
    const merchantName = inv.merchant
        || (inv.supplier_id && supplierMap.get(inv.supplier_id)?.name)
        || (inv.customer_id && customerMap.get(inv.customer_id)?.name)
        || '';
    if (txn.description && merchantName) {
        const similarity = stringSimilarity(txn.description, merchantName);
        if (similarity > 0.7) { confidence += 15; reasons.push("Ταίριασμα ονόματος"); }
        else if (similarity > 0.4) { confidence += 10; reasons.push("Μερικό ταίριασμα"); }
        else if (similarity > 0.2) { confidence += 5; reasons.push("Αδύναμο ταίριασμα"); }
    }

    // 4. Same package bonus (up to 10%)
    if (txn.package_id && inv.package_id && txn.package_id === inv.package_id) {
        confidence += 10;
        reasons.push("Ίδιος φάκελος");
    }

    // 5. VAT/ΑΦΜ-based matching (bonus up to 20%)
    const extracted = inv.extracted_data?.extracted || inv.extracted_data;
    const descLower = (txn.description || "").replace(/\s/g, "").toLowerCase();
    
    // Check supplier VAT from extracted data AND from supplier record
    const supplierVat = extracted?.tax_id || (inv.supplier_id && supplierMap.get(inv.supplier_id)?.vat_number);
    const customerVat = extracted?.buyer_vat || (inv.customer_id && customerMap.get(inv.customer_id)?.vat_number);
    
    if (supplierVat && String(supplierVat).length === 9 && descLower.includes(String(supplierVat))) {
        confidence += 20;
        reasons.push("ΑΦΜ προμηθευτή στην περιγραφή");
    } else if (customerVat && String(customerVat).length === 9 && descLower.includes(String(customerVat))) {
        confidence += 15;
        reasons.push("ΑΦΜ πελάτη στην περιγραφή");
    }

    // 6. Invoice number in bank description (bonus up to 12%)
    const invoiceNum = (extracted?.invoice_number || "").toString().trim();
    if (invoiceNum.length >= 3 && descLower.includes(invoiceNum.toLowerCase().replace(/\s/g, ""))) {
        confidence += 12;
        reasons.push("Αρ. τιμολογίου στην περιγραφή");
    }

    return { confidence, reasons };
}

/**
 * Auto-link invoices to suppliers/customers by VAT number
 */
async function autoLinkByVat(invoices: Invoice[], suppliers: Supplier[], customers: Customer[]): Promise<number> {
    let linked = 0;
    const updates: { id: string; supplier_id?: string; customer_id?: string }[] = [];

    for (const inv of invoices) {
        const extracted = inv.extracted_data?.extracted || inv.extracted_data;
        if (!extracted) continue;

        // Link expense invoices to suppliers by tax_id
        if (inv.type === 'expense' && !inv.supplier_id && extracted.tax_id) {
            const vatClean = String(extracted.tax_id).replace(/\D/g, '');
            if (vatClean.length === 9) {
                const match = suppliers.find(s => s.vat_number && s.vat_number.replace(/\D/g, '') === vatClean);
                if (match) {
                    updates.push({ id: inv.id, supplier_id: match.id });
                    linked++;
                }
            }
        }

        // Link income invoices to customers by buyer_vat
        if (inv.type === 'income' && !inv.customer_id && extracted.buyer_vat) {
            const vatClean = String(extracted.buyer_vat).replace(/\D/g, '');
            if (vatClean.length === 9) {
                const match = customers.find(c => c.vat_number && c.vat_number.replace(/\D/g, '') === vatClean);
                if (match) {
                    updates.push({ id: inv.id, customer_id: match.id });
                    linked++;
                }
            }
        }
    }

    // Batch update
    for (const upd of updates) {
        if (upd.supplier_id) {
            await supabase.from("invoices").update({ supplier_id: upd.supplier_id }).eq("id", upd.id);
        }
        if (upd.customer_id) {
            await supabase.from("invoices").update({ customer_id: upd.customer_id }).eq("id", upd.id);
        }
    }

    return linked;
}

/**
 * Run automatic matching for all unmatched transactions (v2 — enhanced)
 */
export async function runAutoMatching(
    options: {
        minConfidence?: number;
        dryRun?: boolean;
        packageId?: string;
    } = {}
): Promise<AutoMatchResult> {
    const { minConfidence = 75, dryRun = false, packageId } = options;

    const result: AutoMatchResult = {
        totalProcessed: 0, matched: 0, suggested: 0, failed: 0, autoLinkedSuppliers: 0, matches: [],
    };

    try {
        // 1. Fetch all data in parallel
        let txnQuery = supabase.from("bank_transactions").select("id, transaction_date, description, amount, package_id");
        if (packageId) txnQuery = txnQuery.eq("package_id", packageId);

        const [
            { data: transactions },
            { data: existingMatches },
            { data: invoices },
            { data: invoiceMatches },
            { data: suppliers },
            { data: customers },
            { data: invoiceListItems },
        ] = await Promise.all([
            txnQuery,
            supabase.from("invoice_transaction_matches").select("transaction_id"),
            supabase.from("invoices").select("id, amount, invoice_date, merchant, type, package_id, supplier_id, customer_id, extracted_data"),
            supabase.from("invoice_transaction_matches").select("invoice_id"),
            supabase.from("suppliers").select("id, name, vat_number"),
            supabase.from("customers").select("id, name, vat_number"),
            supabase.from("invoice_list_items").select("id, invoice_number, client_name, client_vat, invoice_date, net_amount, total_amount, match_status").neq("match_status", "matched"),
        ]);

        if (!transactions || transactions.length === 0) return result;

        const matchedTxnIds = new Set((existingMatches || []).map(m => m.transaction_id));
        const unmatchedTxns = transactions.filter(t => !matchedTxnIds.has(t.id));
        result.totalProcessed = unmatchedTxns.length;
        if (unmatchedTxns.length === 0) return result;

        if (!invoices || invoices.length === 0) return result;

        // 2. Auto-link invoices to suppliers/customers by VAT
        const autoLinked = await autoLinkByVat(
            invoices as Invoice[],
            (suppliers || []) as Supplier[],
            (customers || []) as Customer[]
        );
        result.autoLinkedSuppliers = autoLinked;

        const matchedInvIds = new Set((invoiceMatches || []).map(m => m.invoice_id));
        const unmatchedInvoices = invoices.filter(i => !matchedInvIds.has(i.id));

        const supplierMap = new Map((suppliers || []).map(s => [s.id, s as Supplier]));
        const customerMap = new Map((customers || []).map(c => [c.id, c as Customer]));

        // Build invoice list items as pseudo-invoices for matching
        const listItemInvoices: Invoice[] = (invoiceListItems || []).map((item: InvoiceListItem) => ({
            id: item.id,
            amount: item.total_amount || item.net_amount,
            invoice_date: item.invoice_date,
            merchant: item.client_name,
            type: 'income' as const,
            package_id: null,
            supplier_id: null,
            customer_id: null,
            extracted_data: {
                invoice_number: item.invoice_number,
                buyer_vat: item.client_vat,
            },
        }));

        // Combine all matchable records
        const allMatchable = [...unmatchedInvoices, ...listItemInvoices];

        // 3. Find matches
        const matchesToCreate: Array<{ invoice_id: string; transaction_id: string; status: string }> = [];
        const txnStatusUpdates: Array<{ id: string; status: string; record_id: string; record_type: string }> = [];

        for (const txn of unmatchedTxns) {
            let bestMatch: { invoice: Invoice; confidence: number; reasons: string[]; isListItem: boolean } | null = null;
            const expectedType = txn.amount > 0 ? 'income' : 'expense';

            for (const inv of allMatchable) {
                if (inv.type !== expectedType) continue;
                const { confidence, reasons } = calculateMatchConfidence(txn, inv as Invoice, supplierMap, customerMap);
                if (confidence > (bestMatch?.confidence || 0)) {
                    const isListItem = listItemInvoices.some(li => li.id === inv.id);
                    bestMatch = { invoice: inv as Invoice, confidence, reasons, isListItem };
                }
            }

            if (bestMatch && bestMatch.confidence >= minConfidence) {
                if (!bestMatch.isListItem) {
                    matchesToCreate.push({
                        invoice_id: bestMatch.invoice.id,
                        transaction_id: txn.id,
                        status: "confirmed",
                    });
                }
                txnStatusUpdates.push({
                    id: txn.id,
                    status: 'matched',
                    record_id: bestMatch.invoice.id,
                    record_type: bestMatch.isListItem ? 'invoice_list' : 'invoice',
                });
                result.matches.push({
                    transactionId: txn.id,
                    invoiceId: bestMatch.invoice.id,
                    confidence: bestMatch.confidence,
                    reason: bestMatch.reasons.join(", "),
                });
                const invIndex = allMatchable.findIndex(i => i.id === bestMatch!.invoice.id);
                if (invIndex > -1) allMatchable.splice(invIndex, 1);
                result.matched++;
            } else if (bestMatch && bestMatch.confidence >= 45) {
                result.matches.push({
                    transactionId: txn.id,
                    invoiceId: bestMatch.invoice.id,
                    confidence: bestMatch.confidence,
                    reason: bestMatch.reasons.join(", ") + " (χαμηλή εμπιστοσύνη)",
                });
                result.suggested++;
            }
        }

        // 4. Create matches
        if (!dryRun && matchesToCreate.length > 0) {
            const { error: insertError } = await supabase
                .from("invoice_transaction_matches")
                .insert(matchesToCreate);

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

            const parts: string[] = [];
            if (result.matched > 0) parts.push(`${result.matched} ταιριάστηκαν`);
            if (result.suggested > 0) parts.push(`${result.suggested} προτάσεις`);
            if (result.autoLinkedSuppliers > 0) parts.push(`${result.autoLinkedSuppliers} συνδέσεις ΑΦΜ`);

            if (parts.length > 0) {
                toast.success(parts.join(" · "), { id: "auto-match" });
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
