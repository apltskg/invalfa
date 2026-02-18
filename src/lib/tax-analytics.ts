
import { supabase } from "@/integrations/supabase/client";
import { FinancialSummary } from "./tax-engine";

export async function getFinancialSummary(year: number): Promise<FinancialSummary> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Fetch invoices
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('type, amount, extracted_data')
        .gte('invoice_date', startDate)
        .lte('invoice_date', endDate);

    if (error) {
        console.error("Error fetching financials:", error);
        throw error;
    }

    let incomeNet = 0;
    let incomeVat = 0;
    let expenseNet = 0;
    let expenseVat = 0;

    invoices?.forEach(inv => {
        // Attempt to extract VAT
        // Handle both formats: { vat_amount } (new) or { extracted: { vat_amount } } (legacy)
        const fileData = inv.extracted_data as any;
        const vat = fileData?.vat_amount ?? fileData?.extracted?.vat_amount ?? 0;
        const total = inv.amount || 0;

        // If VAT is 0, maybe it's 0. Or maybe we calculate it by default 24%?
        // Safer to rely on extracted data. If 0, assume 0.

        // Net = Total - VAT
        const net = total - vat;

        if (inv.type === 'income') {
            incomeNet += net;
            incomeVat += vat;
        } else {
            expenseNet += net;
            expenseVat += vat;
        }
    });

    return { incomeNet, incomeVat, expenseNet, expenseVat };
}
