import { supabase } from "@/integrations/supabase/client";

export interface DuplicateCheck {
    isDuplicate: boolean;
    isPotential: boolean;
    duplicateId?: string;
    reason?: string;
    existingMerchant?: string;
    existingAmount?: number;
    existingDate?: string;
}

/**
 * Check if an invoice is a duplicate before saving.
 * 
 * Checks:
 * 1. Exact duplicate: same invoice_number + same merchant/supplier
 * 2. Potential duplicate: same amount ± 0.01 + same date ± 1 day + similar merchant
 */
export async function checkDuplicateInvoice({
    invoiceNumber,
    merchant,
    amount,
    date,
    type,
    excludeId,
}: {
    invoiceNumber?: string | null;
    merchant?: string | null;
    amount?: number | null;
    date?: string | null;
    type: "income" | "expense";
    excludeId?: string; // Exclude this ID (for editing existing)
}): Promise<DuplicateCheck> {
    try {
        // 1. Check exact invoice number duplicate
        if (invoiceNumber && invoiceNumber.trim()) {
            let query = supabase
                .from("invoices")
                .select("id, merchant, amount, invoice_date")
                .eq("type", type)
                .not("extracted_data", "is", null);

            if (excludeId) {
                query = query.neq("id", excludeId);
            }

            const { data: allInvoices } = await query.limit(500);

            if (allInvoices) {
                const normalizedNumber = invoiceNumber.trim().toLowerCase();
                const match = allInvoices.find((inv: any) => {
                    const extracted = inv.extracted_data as any;
                    const existingNumber = (extracted?.invoice_number || "").toString().trim().toLowerCase();
                    return existingNumber === normalizedNumber;
                });

                if (match) {
                    return {
                        isDuplicate: true,
                        isPotential: false,
                        duplicateId: match.id,
                        reason: `Ίδιος αριθμός τιμολογίου "${invoiceNumber}"`,
                        existingMerchant: match.merchant || undefined,
                        existingAmount: match.amount || undefined,
                        existingDate: match.invoice_date || undefined,
                    };
                }
            }
        }

        // 2. Check potential duplicate: same amount + similar date + similar merchant
        if (amount && amount > 0 && date) {
            const dateObj = new Date(date);
            const dayBefore = new Date(dateObj);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayAfter = new Date(dateObj);
            dayAfter.setDate(dayAfter.getDate() + 1);

            let query = supabase
                .from("invoices")
                .select("id, merchant, amount, invoice_date")
                .eq("type", type)
                .gte("invoice_date", dayBefore.toISOString().split("T")[0])
                .lte("invoice_date", dayAfter.toISOString().split("T")[0])
                .gte("amount", amount - 0.02)
                .lte("amount", amount + 0.02);

            if (excludeId) {
                query = query.neq("id", excludeId);
            }

            const { data: potentialDupes } = await query;

            if (potentialDupes && potentialDupes.length > 0) {
                // Check if merchant name is similar
                const normalizedMerchant = (merchant || "").toLowerCase().trim();

                for (const dupe of potentialDupes) {
                    const existingMerchant = (dupe.merchant || "").toLowerCase().trim();

                    // Exact merchant match or one contains the other
                    const merchantMatch =
                        normalizedMerchant === existingMerchant ||
                        (normalizedMerchant.length > 3 && existingMerchant.includes(normalizedMerchant)) ||
                        (existingMerchant.length > 3 && normalizedMerchant.includes(existingMerchant));

                    if (merchantMatch || !normalizedMerchant) {
                        return {
                            isDuplicate: false,
                            isPotential: true,
                            duplicateId: dupe.id,
                            reason: merchantMatch
                                ? `Ίδιο ποσό (€${amount.toFixed(2)}) + ίδιος προμηθευτής + κοντινή ημ/νια`
                                : `Ίδιο ποσό (€${amount.toFixed(2)}) + κοντινή ημερομηνία`,
                            existingMerchant: dupe.merchant || undefined,
                            existingAmount: dupe.amount || undefined,
                            existingDate: dupe.invoice_date || undefined,
                        };
                    }
                }
            }
        }

        return { isDuplicate: false, isPotential: false };
    } catch (error) {
        console.error("Duplicate check error:", error);
        return { isDuplicate: false, isPotential: false };
    }
}

/**
 * Batch check: find all potential duplicates in a list of invoices.
 * Returns a map of invoice ID → duplicate info.
 */
export async function findAllDuplicates(
    type: "income" | "expense"
): Promise<Map<string, { duplicateOfId: string; reason: string }>> {
    const duplicates = new Map<string, { duplicateOfId: string; reason: string }>();

    try {
        const { data: invoices } = await supabase
            .from("invoices")
            .select("id, merchant, amount, invoice_date, extracted_data")
            .eq("type", type)
            .order("invoice_date", { ascending: true });

        if (!invoices || invoices.length < 2) return duplicates;

        // Check each pair for duplicates
        for (let i = 0; i < invoices.length; i++) {
            for (let j = i + 1; j < invoices.length; j++) {
                const a = invoices[i];
                const b = invoices[j];

                // Check invoice number match
                const aNum = ((a.extracted_data as any)?.invoice_number || "").toString().trim().toLowerCase();
                const bNum = ((b.extracted_data as any)?.invoice_number || "").toString().trim().toLowerCase();

                if (aNum && bNum && aNum === bNum) {
                    duplicates.set(b.id, {
                        duplicateOfId: a.id,
                        reason: `Ίδιος αρ. τιμολογίου "${aNum}"`,
                    });
                    continue;
                }

                // Check amount + date + merchant match
                if (a.amount && b.amount && Math.abs(a.amount - b.amount) < 0.02) {
                    if (a.invoice_date && b.invoice_date) {
                        const dayDiff = Math.abs(
                            (new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        if (dayDiff <= 1) {
                            const aMerchant = (a.merchant || "").toLowerCase();
                            const bMerchant = (b.merchant || "").toLowerCase();
                            if (
                                aMerchant === bMerchant ||
                                (aMerchant.length > 3 && bMerchant.includes(aMerchant)) ||
                                (bMerchant.length > 3 && aMerchant.includes(bMerchant))
                            ) {
                                duplicates.set(b.id, {
                                    duplicateOfId: a.id,
                                    reason: `Πιθανό διπλότυπο (€${b.amount.toFixed(2)}, ${b.merchant})`,
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("findAllDuplicates error:", error);
    }

    return duplicates;
}
