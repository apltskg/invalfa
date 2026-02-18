import { supabase } from "@/integrations/supabase/client";

export interface PaymentReminder {
    id: string;
    invoiceId: string;
    customerId: string | null;
    customerName: string;
    customerEmail: string | null;
    invoiceNumber: string | null;
    amount: number;
    invoiceDate: string;
    daysPastDue: number;
    packageName: string | null;
}

export interface ReminderStats {
    total: number;
    overdue30: number;
    overdue60: number;
    overdue90Plus: number;
    totalAmount: number;
}

/**
 * Get all unpaid income invoices that are past due
 */
export async function getOverdueInvoices(daysThreshold: number = 30): Promise<{
    reminders: PaymentReminder[];
    stats: ReminderStats;
}> {
    const today = new Date();
    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    // Fetch income invoices that are not matched (unpaid)
    const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
      id,
      amount,
      invoice_date,
      merchant,
      extracted_data,
      customer_id,
      package_id,
      customers (
        id,
        name,
        email
      ),
      packages (
        client_name
      )
    `)
        .eq("type", "income")
        .not("invoice_date", "is", null)
        .lte("invoice_date", thresholdDate.toISOString().split('T')[0])
        .order("invoice_date", { ascending: true });

    if (error) {
        console.error("Error fetching overdue invoices:", error);
        throw error;
    }

    // Get matched invoice IDs
    const { data: matches } = await supabase
        .from("invoice_transaction_matches")
        .select("invoice_id");

    const matchedIds = new Set((matches || []).map(m => m.invoice_id));

    // Filter to only unmatched (unpaid) invoices
    const unpaidInvoices = (invoices || []).filter(inv => !matchedIds.has(inv.id));

    const reminders: PaymentReminder[] = [];
    let overdue30 = 0, overdue60 = 0, overdue90Plus = 0;
    let totalAmount = 0;

    for (const inv of unpaidInvoices) {
        const invoiceDate = new Date(inv.invoice_date!);
        const daysPastDue = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

        const customer = inv.customers as any;
        const pkg = inv.packages as any;
        const rawExtracted = inv.extracted_data as any;
        const extractedData = rawExtracted?.extracted || rawExtracted;

        const reminder: PaymentReminder = {
            id: `reminder-${inv.id}`,
            invoiceId: inv.id,
            customerId: inv.customer_id,
            customerName: customer?.name || inv.merchant || extractedData?.merchant || "Άγνωστος πελάτης",
            customerEmail: customer?.email || null,
            invoiceNumber: extractedData?.invoice_number || null,
            amount: inv.amount || 0,
            invoiceDate: inv.invoice_date!,
            daysPastDue,
            packageName: pkg?.client_name || null,
        };

        reminders.push(reminder);
        totalAmount += reminder.amount;

        if (daysPastDue >= 90) {
            overdue90Plus++;
        } else if (daysPastDue >= 60) {
            overdue60++;
        } else {
            overdue30++;
        }
    }

    return {
        reminders,
        stats: {
            total: reminders.length,
            overdue30,
            overdue60,
            overdue90Plus,
            totalAmount,
        },
    };
}

/**
 * Create a notification for payment reminder
 */
export async function createPaymentReminderNotification(reminder: PaymentReminder): Promise<void> {
    const { error } = await supabase.from("notifications").insert({
        type: "warning",
        title: `Υπενθύμιση πληρωμής: ${reminder.customerName}`,
        message: `Το τιμολόγιο ${reminder.invoiceNumber || ''} με ποσό €${reminder.amount.toFixed(2)} είναι εκκρεμές ${reminder.daysPastDue} ημέρες.`,
        link_url: `/packages`,
    });

    if (error) {
        console.error("Error creating notification:", error);
    }
}

/**
 * Get aged receivables report data
 */
export async function getAgedReceivables(): Promise<{
    current: { count: number; amount: number };
    days30: { count: number; amount: number };
    days60: { count: number; amount: number };
    days90: { count: number; amount: number };
    days90Plus: { count: number; amount: number };
    total: { count: number; amount: number };
    byCustomer: Array<{
        customerId: string | null;
        customerName: string;
        current: number;
        days30: number;
        days60: number;
        days90: number;
        days90Plus: number;
        total: number;
    }>;
}> {
    const today = new Date();

    // Fetch all income invoices
    const { data: invoices } = await supabase
        .from("invoices")
        .select(`
      id,
      amount,
      invoice_date,
      merchant,
      customer_id,
      extracted_data,
      customers (name)
    `)
        .eq("type", "income")
        .not("invoice_date", "is", null);

    // Get matched invoice IDs
    const { data: matches } = await supabase
        .from("invoice_transaction_matches")
        .select("invoice_id");

    const matchedIds = new Set((matches || []).map(m => m.invoice_id));
    const unpaidInvoices = (invoices || []).filter(inv => !matchedIds.has(inv.id));

    const buckets = {
        current: { count: 0, amount: 0 },
        days30: { count: 0, amount: 0 },
        days60: { count: 0, amount: 0 },
        days90: { count: 0, amount: 0 },
        days90Plus: { count: 0, amount: 0 },
        total: { count: 0, amount: 0 },
    };

    const customerMap: Map<string, {
        customerId: string | null;
        customerName: string;
        current: number;
        days30: number;
        days60: number;
        days90: number;
        days90Plus: number;
        total: number;
    }> = new Map();

    for (const inv of unpaidInvoices) {
        const invoiceDate = new Date(inv.invoice_date!);
        const daysOld = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = inv.amount || 0;

        const customer = inv.customers as any;
        const rawExtracted = inv.extracted_data as any;
        const extractedData = rawExtracted?.extracted || rawExtracted;
        const customerName = customer?.name || inv.merchant || extractedData?.merchant || "Άγνωστος";
        const customerId = inv.customer_id || customerName;

        // Get or create customer entry
        if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
                customerId: inv.customer_id,
                customerName,
                current: 0,
                days30: 0,
                days60: 0,
                days90: 0,
                days90Plus: 0,
                total: 0,
            });
        }
        const customerEntry = customerMap.get(customerId)!;

        buckets.total.count++;
        buckets.total.amount += amount;
        customerEntry.total += amount;

        if (daysOld <= 0) {
            buckets.current.count++;
            buckets.current.amount += amount;
            customerEntry.current += amount;
        } else if (daysOld <= 30) {
            buckets.days30.count++;
            buckets.days30.amount += amount;
            customerEntry.days30 += amount;
        } else if (daysOld <= 60) {
            buckets.days60.count++;
            buckets.days60.amount += amount;
            customerEntry.days60 += amount;
        } else if (daysOld <= 90) {
            buckets.days90.count++;
            buckets.days90.amount += amount;
            customerEntry.days90 += amount;
        } else {
            buckets.days90Plus.count++;
            buckets.days90Plus.amount += amount;
            customerEntry.days90Plus += amount;
        }
    }

    return {
        ...buckets,
        byCustomer: Array.from(customerMap.values()).sort((a, b) => b.total - a.total),
    };
}
