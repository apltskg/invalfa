import { supabase } from "@/integrations/supabase/client";
import { TaxLiability } from "./tax-engine";

/**
 * AI-powered accountant advisor using Lovable AI (Gemini 3 Flash).
 * Sends the financial context to the backend and gets real AI analysis.
 */
export async function askAccountant(prompt: string, liability: TaxLiability): Promise<string> {
  try {
    const response = await supabase.functions.invoke('ai-advisor', {
      body: {
        prompt,
        context: {
          vatPayable: liability.vatPayable,
          incomeTax: liability.incomeTax,
          tradeTax: liability.tradeTax,
          totalLiability: liability.totalLiability,
          netProfit: liability.netProfit,
          netProfitAfterTax: liability.netProfitAfterTax,
          totalIncome: (liability as any).totalIncome,
          totalExpenses: (liability as any).totalExpenses,
        },
      },
    });

    if (response.error) {
      console.error('AI Advisor error:', response.error);
      return 'Δεν ήταν δυνατή η σύνδεση με τον AI λογιστή. Δοκιμάστε ξανά.';
    }

    return (response.data as any)?.answer || 'Δεν λήφθηκε απάντηση.';
  } catch (error) {
    console.error('AI Advisor error:', error);
    return 'Σφάλμα επικοινωνίας. Δοκιμάστε ξανά αργότερα.';
  }
}
