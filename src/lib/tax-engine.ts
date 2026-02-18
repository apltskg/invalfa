
export interface TaxContext {
    year: number;
    entityType: 'freelancer' | 'company';
}

export interface FinancialSummary {
    incomeNet: number;
    incomeVat: number;
    expenseNet: number;
    expenseVat: number;
}

export interface TaxLiability {
    vatPayable: number;
    incomeTax: number;
    tradeTax: number;
    advanceTax: number;
    totalLiability: number;
    netProfit: number;
    netProfitAfterTax: number;
}

/**
 * Calculates Greek tax liability based on financial summary.
 * Models:
 * - VAT (Balance)
 * - Income Tax (22% flat for companies, scaled for freelancers)
 * - Trade Tax (Télos Epitidevmatos)
 * - Advance Tax (Prokatavoli Phorou - usually 50-80% of current tax)
 */
export function calculateTaxLiability(financials: FinancialSummary, context: TaxContext): TaxLiability {
    const { incomeNet, incomeVat, expenseNet, expenseVat } = financials;

    // 1. VAT Balance
    const vatBalance = incomeVat - expenseVat;

    // 2. Net Profit
    const netProfit = incomeNet - expenseNet;

    // 3. Income Tax
    let incomeTax = 0;
    if (context.entityType === 'company') {
        // 22% Company Tax Rate (Greece 2024-2025)
        incomeTax = Math.max(0, netProfit * 0.22);
    } else {
        // Freelancer Scale (2024)
        if (netProfit <= 10000) {
            incomeTax = Math.max(0, netProfit * 0.09);
        } else if (netProfit <= 20000) {
            incomeTax = 900 + (netProfit - 10000) * 0.22;
        } else if (netProfit <= 30000) {
            incomeTax = 900 + 2200 + (netProfit - 20000) * 0.28;
        } else if (netProfit <= 40000) {
            incomeTax = 900 + 2200 + 2800 + (netProfit - 30000) * 0.36;
        } else {
            incomeTax = 900 + 2200 + 2800 + 3600 + (netProfit - 40000) * 0.44;
        }
    }

    // 4. Trade Tax (Télos Epitidevmatos)
    const tradeTax = context.entityType === 'company' ? 1000 : 650;

    // 5. Advance Tax (Next Year Prepayment) - Simplified 50% for first years, 80% later. Using 80% conservative.
    // Only applies if Income Tax > 0
    const advanceTax = incomeTax > 0 ? incomeTax * 0.8 : 0;

    // Total Liability (Cash needed)
    // VAT (if positive) + Income Tax + Trade Tax + Advance Tax
    // Note: Advance Tax is cash out, but credited next year. We calculate "Cash owed to gov".
    const totalLiability = (vatBalance > 0 ? vatBalance : 0) + incomeTax + tradeTax + advanceTax;

    return {
        vatPayable: vatBalance,
        incomeTax,
        tradeTax,
        advanceTax,
        totalLiability,
        netProfit,
        netProfitAfterTax: netProfit - incomeTax - tradeTax // Advance tax is strictly cash flow, not expense
    };
}
