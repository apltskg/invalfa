import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export interface CashFlowForecast {
    month: string;
    predicted_income: number;
    predicted_expenses: number;
    net_flow: number;
    confidence: number;
}

export interface SupplierAnalytics {
    id: string;
    name: string;
    total_spent: number;
    invoice_count: number;
    avg_payment_days: number;
    last_invoice_date: string | null;
    trend: 'up' | 'down' | 'stable';
    monthly_spending: Array<{ month: string; amount: number }>;
}

export interface CustomerScore {
    id: string;
    name: string;
    vat_number: string | null;
    total_invoiced: number;
    total_paid: number;
    pending_amount: number;
    avg_payment_days: number;
    on_time_percentage: number;
    score: number;  // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    risk_level: 'low' | 'medium' | 'high';
}

export interface DashboardStats {
    // Current period
    total_income: number;
    total_expenses: number;
    net_profit: number;
    profit_margin: number;

    // Receivables
    total_receivables: number;
    overdue_receivables: number;

    // Cash position
    bank_balance: number;

    // Counts
    pending_invoices: number;
    unmatched_transactions: number;
    active_packages: number;

    // Trends (vs previous period)
    income_trend: number;  // percentage change
    expense_trend: number;
    profit_trend: number;
}

/**
 * Get comprehensive dashboard statistics
 */
export async function getDashboardStats(startDate: string, endDate: string): Promise<DashboardStats> {
    // Previous period for comparison
    const currentStart = new Date(startDate);
    const currentEnd = new Date(endDate);
    const periodLength = currentEnd.getTime() - currentStart.getTime();
    const prevStart = new Date(currentStart.getTime() - periodLength);
    const prevEnd = new Date(currentEnd.getTime() - periodLength);

    // Fetch current period data
    const [
        { data: invoices },
        { data: prevInvoices },
        { data: transactions },
        { data: packages },
        { data: matches }
    ] = await Promise.all([
        supabase.from("invoices").select("*").gte("invoice_date", startDate).lte("invoice_date", endDate),
        supabase.from("invoices").select("*").gte("invoice_date", format(prevStart, 'yyyy-MM-dd')).lte("invoice_date", format(prevEnd, 'yyyy-MM-dd')),
        supabase.from("bank_transactions").select("*").gte("transaction_date", startDate).lte("transaction_date", endDate),
        supabase.from("packages").select("*").eq("status", "active"),
        supabase.from("invoice_transaction_matches").select("invoice_id")
    ]);

    const matchedInvoiceIds = new Set((matches || []).map(m => m.invoice_id));

    // Calculate current period stats
    const incomeInvoices = (invoices || []).filter(i => i.type === 'income');
    const expenseInvoices = (invoices || []).filter(i => i.type === 'expense');

    const total_income = incomeInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const total_expenses = expenseInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const net_profit = total_income - total_expenses;
    const profit_margin = total_income > 0 ? (net_profit / total_income) * 100 : 0;

    // Previous period for trends
    const prev_income = (prevInvoices || []).filter(i => i.type === 'income').reduce((sum, i) => sum + (i.amount || 0), 0);
    const prev_expenses = (prevInvoices || []).filter(i => i.type === 'expense').reduce((sum, i) => sum + (i.amount || 0), 0);
    const prev_profit = prev_income - prev_expenses;

    // Receivables
    const unpaidIncome = incomeInvoices.filter(i => !matchedInvoiceIds.has(i.id));
    const total_receivables = unpaidIncome.reduce((sum, i) => sum + (i.amount || 0), 0);

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdue_receivables = unpaidIncome
        .filter(i => i.invoice_date && new Date(i.invoice_date) < thirtyDaysAgo)
        .reduce((sum, i) => sum + (i.amount || 0), 0);

    // Bank balance
    const bank_balance = (transactions || []).reduce((sum, t) => sum + t.amount, 0);

    // Unmatched transactions
    const unmatched_transactions = (transactions || []).filter(t => !t.match_status || t.match_status !== 'matched').length;

    return {
        total_income,
        total_expenses,
        net_profit,
        profit_margin,
        total_receivables,
        overdue_receivables,
        bank_balance,
        pending_invoices: unpaidIncome.length,
        unmatched_transactions,
        active_packages: (packages || []).length,
        income_trend: prev_income > 0 ? ((total_income - prev_income) / prev_income) * 100 : 0,
        expense_trend: prev_expenses > 0 ? ((total_expenses - prev_expenses) / prev_expenses) * 100 : 0,
        profit_trend: prev_profit !== 0 ? ((net_profit - prev_profit) / Math.abs(prev_profit)) * 100 : 0,
    };
}

/**
 * Get supplier analytics with spending trends
 */
export async function getSupplierAnalytics(): Promise<SupplierAnalytics[]> {
    const sixMonthsAgo = subMonths(new Date(), 6);

    const { data: invoices } = await supabase
        .from("invoices")
        .select(`
      id, amount, invoice_date, merchant, supplier_id,
      suppliers (id, name)
    `)
        .eq("type", "expense")
        .gte("invoice_date", format(sixMonthsAgo, 'yyyy-MM-dd'))
        .order("invoice_date", { ascending: false });

    // Get payment matches
    const { data: matches } = await supabase
        .from("invoice_transaction_matches")
        .select("invoice_id, matched_at, bank_transactions(transaction_date)");

    const matchMap = new Map((matches || []).map(m => [
        m.invoice_id,
        { matched_at: m.matched_at, txn_date: (m.bank_transactions as any)?.transaction_date }
    ]));

    // Group by supplier
    const supplierMap = new Map<string, {
        invoices: any[];
        name: string;
        id: string;
    }>();

    for (const inv of invoices || []) {
        const supplier = inv.suppliers as any;
        const key = inv.supplier_id || inv.merchant || "Άγνωστος";
        const name = supplier?.name || inv.merchant || "Άγνωστος";

        if (!supplierMap.has(key)) {
            supplierMap.set(key, { invoices: [], name, id: key });
        }
        supplierMap.get(key)!.invoices.push(inv);
    }

    // Calculate analytics for each supplier
    const analytics: SupplierAnalytics[] = [];

    for (const [id, data] of supplierMap) {
        const total_spent = data.invoices.reduce((sum, i) => sum + (i.amount || 0), 0);
        const invoice_count = data.invoices.length;

        // Calculate average payment days
        let totalPaymentDays = 0;
        let paidCount = 0;

        for (const inv of data.invoices) {
            const match = matchMap.get(inv.id);
            if (match && inv.invoice_date) {
                const invDate = new Date(inv.invoice_date);
                const payDate = new Date(match.txn_date || match.matched_at);
                const days = Math.floor((payDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
                if (days >= 0) {
                    totalPaymentDays += days;
                    paidCount++;
                }
            }
        }

        const avg_payment_days = paidCount > 0 ? Math.round(totalPaymentDays / paidCount) : 0;

        // Monthly spending
        const monthlySpending = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
            const month = format(subMonths(new Date(), i), 'yyyy-MM');
            monthlySpending.set(month, 0);
        }

        for (const inv of data.invoices) {
            if (inv.invoice_date) {
                const month = format(new Date(inv.invoice_date), 'yyyy-MM');
                if (monthlySpending.has(month)) {
                    monthlySpending.set(month, (monthlySpending.get(month) || 0) + (inv.amount || 0));
                }
            }
        }

        const monthly_spending = Array.from(monthlySpending.entries()).map(([month, amount]) => ({ month, amount }));

        // Trend calculation
        const recentMonths = monthly_spending.slice(-3);
        const olderMonths = monthly_spending.slice(0, 3);
        const recentAvg = recentMonths.reduce((sum, m) => sum + m.amount, 0) / 3;
        const olderAvg = olderMonths.reduce((sum, m) => sum + m.amount, 0) / 3;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentAvg > olderAvg * 1.1) trend = 'up';
        else if (recentAvg < olderAvg * 0.9) trend = 'down';

        const sortedDates = data.invoices
            .filter(i => i.invoice_date)
            .map(i => new Date(i.invoice_date!))
            .sort((a, b) => b.getTime() - a.getTime());

        analytics.push({
            id,
            name: data.name,
            total_spent,
            invoice_count,
            avg_payment_days,
            last_invoice_date: sortedDates[0]?.toISOString() || null,
            trend,
            monthly_spending,
        });
    }

    return analytics.sort((a, b) => b.total_spent - a.total_spent);
}

/**
 * Get customer payment reliability scores
 */
export async function getCustomerScores(): Promise<CustomerScore[]> {
    const { data: invoices } = await supabase
        .from("invoices")
        .select(`
      id, amount, invoice_date, merchant, customer_id,
      customers (id, name, vat_number)
    `)
        .eq("type", "income")
        .order("invoice_date", { ascending: false });

    // Get payment matches
    const { data: matches } = await supabase
        .from("invoice_transaction_matches")
        .select("invoice_id, matched_at, bank_transactions(transaction_date)");

    const matchMap = new Map((matches || []).map(m => [
        m.invoice_id,
        { matched_at: m.matched_at, txn_date: (m.bank_transactions as any)?.transaction_date }
    ]));

    // Group by customer
    const customerMap = new Map<string, {
        invoices: any[];
        name: string;
        id: string;
        vat_number: string | null;
    }>();

    for (const inv of invoices || []) {
        const customer = inv.customers as any;
        const key = inv.customer_id || inv.merchant || "Άγνωστος";
        const name = customer?.name || inv.merchant || "Άγνωστος";
        const vat = customer?.vat_number || null;

        if (!customerMap.has(key)) {
            customerMap.set(key, { invoices: [], name, id: key, vat_number: vat });
        }
        customerMap.get(key)!.invoices.push(inv);
    }

    // Calculate scores
    const scores: CustomerScore[] = [];

    for (const [id, data] of customerMap) {
        const total_invoiced = data.invoices.reduce((sum, i) => sum + (i.amount || 0), 0);

        let total_paid = 0;
        let totalPaymentDays = 0;
        let paidCount = 0;
        let onTimeCount = 0;

        for (const inv of data.invoices) {
            const match = matchMap.get(inv.id);
            if (match) {
                total_paid += inv.amount || 0;

                if (inv.invoice_date) {
                    const invDate = new Date(inv.invoice_date);
                    const payDate = new Date(match.txn_date || match.matched_at);
                    const days = Math.floor((payDate.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (days >= 0) {
                        totalPaymentDays += days;
                        paidCount++;
                        if (days <= 30) onTimeCount++;
                    }
                }
            }
        }

        const pending_amount = total_invoiced - total_paid;
        const avg_payment_days = paidCount > 0 ? Math.round(totalPaymentDays / paidCount) : 0;
        const on_time_percentage = paidCount > 0 ? Math.round((onTimeCount / paidCount) * 100) : 0;

        // Calculate score (0-100)
        let score = 50;  // Base score

        // Payment rate factor (up to 30 points)
        const paymentRate = total_invoiced > 0 ? (total_paid / total_invoiced) : 0;
        score += paymentRate * 30;

        // On-time factor (up to 20 points)
        score += (on_time_percentage / 100) * 20;

        // Average payment days factor (up to 20 points, degrades after 30 days)
        if (avg_payment_days <= 15) score += 20;
        else if (avg_payment_days <= 30) score += 15;
        else if (avg_payment_days <= 60) score += 5;
        else score -= 10;

        // Volume bonus (up to 10 points for repeat customers)
        if (data.invoices.length >= 10) score += 10;
        else if (data.invoices.length >= 5) score += 5;

        // Ensure 0-100 range
        score = Math.max(0, Math.min(100, Math.round(score)));

        // Determine grade
        let grade: 'A' | 'B' | 'C' | 'D' | 'F';
        if (score >= 90) grade = 'A';
        else if (score >= 75) grade = 'B';
        else if (score >= 60) grade = 'C';
        else if (score >= 40) grade = 'D';
        else grade = 'F';

        // Risk level
        let risk_level: 'low' | 'medium' | 'high';
        if (score >= 75) risk_level = 'low';
        else if (score >= 50) risk_level = 'medium';
        else risk_level = 'high';

        scores.push({
            id,
            name: data.name,
            vat_number: data.vat_number,
            total_invoiced,
            total_paid,
            pending_amount,
            avg_payment_days,
            on_time_percentage,
            score,
            grade,
            risk_level,
        });
    }

    return scores.sort((a, b) => b.total_invoiced - a.total_invoiced);
}

/**
 * Generate cash flow forecast based on historical data
 */
export async function getCashFlowForecast(months: number = 3): Promise<CashFlowForecast[]> {
    // Get historical data for the past 6 months
    const sixMonthsAgo = subMonths(new Date(), 6);

    const { data: invoices } = await supabase
        .from("invoices")
        .select("type, amount, invoice_date")
        .gte("invoice_date", format(sixMonthsAgo, 'yyyy-MM-dd'));

    // Aggregate by month
    const monthlyData = new Map<string, { income: number; expenses: number }>();

    for (let i = 5; i >= 0; i--) {
        const month = format(subMonths(new Date(), i), 'yyyy-MM');
        monthlyData.set(month, { income: 0, expenses: 0 });
    }

    for (const inv of invoices || []) {
        if (inv.invoice_date) {
            const month = format(new Date(inv.invoice_date), 'yyyy-MM');
            if (monthlyData.has(month)) {
                const data = monthlyData.get(month)!;
                if (inv.type === 'income') {
                    data.income += inv.amount || 0;
                } else {
                    data.expenses += inv.amount || 0;
                }
            }
        }
    }

    // Calculate averages and trends
    const monthlyArray = Array.from(monthlyData.entries());
    const avgIncome = monthlyArray.reduce((sum, [, d]) => sum + d.income, 0) / monthlyArray.length;
    const avgExpenses = monthlyArray.reduce((sum, [, d]) => sum + d.expenses, 0) / monthlyArray.length;

    // Simple linear trend
    const recentMonths = monthlyArray.slice(-3);
    const olderMonths = monthlyArray.slice(0, 3);
    const recentIncomeAvg = recentMonths.reduce((sum, [, d]) => sum + d.income, 0) / 3;
    const olderIncomeAvg = olderMonths.reduce((sum, [, d]) => sum + d.income, 0) / 3;
    const incomeTrend = olderIncomeAvg > 0 ? (recentIncomeAvg - olderIncomeAvg) / olderIncomeAvg : 0;

    const recentExpenseAvg = recentMonths.reduce((sum, [, d]) => sum + d.expenses, 0) / 3;
    const olderExpenseAvg = olderMonths.reduce((sum, [, d]) => sum + d.expenses, 0) / 3;
    const expenseTrend = olderExpenseAvg > 0 ? (recentExpenseAvg - olderExpenseAvg) / olderExpenseAvg : 0;

    // Generate forecast
    const forecasts: CashFlowForecast[] = [];

    for (let i = 1; i <= months; i++) {
        const forecastMonth = format(subMonths(new Date(), -i), 'yyyy-MM');

        // Apply trend to averages
        const trendMultiplier = 1 + (incomeTrend * i * 0.5);  // Dampen trend
        const expenseTrendMultiplier = 1 + (expenseTrend * i * 0.5);

        const predicted_income = Math.max(0, avgIncome * trendMultiplier);
        const predicted_expenses = Math.max(0, avgExpenses * expenseTrendMultiplier);
        const net_flow = predicted_income - predicted_expenses;

        // Confidence decreases further out
        const confidence = Math.max(30, 90 - (i * 15));

        forecasts.push({
            month: forecastMonth,
            predicted_income,
            predicted_expenses,
            net_flow,
            confidence,
        });
    }

    return forecasts;
}
