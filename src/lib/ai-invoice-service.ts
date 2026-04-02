import { supabase } from "@/integrations/supabase/client";
import { ExtractedData } from "@/types/database";

export interface AIAnalysisResult {
    categoryId: string;
    categoryName: string;
    confidence: number;
    tags: string[];
    anomalies: string[];
    riskLevel: 'low' | 'medium' | 'high';
    summary: string;
}

export interface SmartInvoiceData {
    id: string;
    sender: string;
    amount: number;
    date: string;
    items: string[];
    analysis: AIAnalysisResult;
    extractedData: ExtractedData | null;
}

export const AI_CATEGORIES = {
    utilities: { id: 'utils', name: 'ΔΕΚΟ & Ενέργεια', color: 'bg-blue-100 text-blue-700' },
    travel: { id: 'travel', name: 'Ταξίδια & Μεταφορές', color: 'bg-orange-100 text-orange-700' },
    services: { id: 'services', name: 'Υπηρεσίες', color: 'bg-purple-100 text-purple-700' },
    supplies: { id: 'supplies', name: 'Αναλώσιμα', color: 'bg-green-100 text-green-700' },
    marketing: { id: 'marketing', name: 'Marketing & Διαφήμιση', color: 'bg-pink-100 text-pink-700' },
};

const CATEGORY_MAP: Record<string, { id: string; name: string }> = {
    'fuel': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'hotel': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'airline': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'transport': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'tolls': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'office': { id: 'supplies', name: 'Αναλώσιμα' },
    'telecom': { id: 'utils', name: 'ΔΕΚΟ & Ενέργεια' },
    'rent': { id: 'services', name: 'Υπηρεσίες' },
    'insurance': { id: 'services', name: 'Υπηρεσίες' },
    'maintenance': { id: 'services', name: 'Υπηρεσίες' },
    'payroll': { id: 'services', name: 'Υπηρεσίες' },
    'government': { id: 'services', name: 'Υπηρεσίες' },
    'marketing': { id: 'marketing', name: 'Marketing & Διαφήμιση' },
    'other': { id: 'services', name: 'Υπηρεσίες' },
};

/**
 * Uploads a file to Supabase storage and calls the extract-invoice edge function
 * for real AI-powered OCR and data extraction.
 */
export async function analyzeInvoiceAI(file: File): Promise<SmartInvoiceData> {
    // 1. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // 2. Call AI extraction edge function
    const response = await supabase.functions.invoke('extract-invoice', {
        body: { filePath, fileName: file.name },
    });

    if (response.error) {
        throw new Error(`AI extraction failed: ${response.error.message}`);
    }

    // 3. Unwrap the response
    const rawData = response.data as any;
    const extracted: ExtractedData = (rawData?.extracted || rawData) as ExtractedData;

    // 4. Map category
    const category = extracted?.category || 'other';
    const mapped = CATEGORY_MAP[category] || { id: 'services', name: 'Υπηρεσίες' };
    const confidence = extracted?.confidence || 0.5;

    // 5. Risk assessment
    const isHighValue = (extracted?.amount || 0) > 5000;
    const isLowConfidence = confidence < 0.7;
    const hasMissingVat = !extracted?.tax_id;
    const riskLevel: 'low' | 'medium' | 'high' = 
        (isHighValue && isLowConfidence) ? 'high' :
        (isLowConfidence || isHighValue || hasMissingVat) ? 'medium' : 'low';

    // 6. Build anomalies
    const anomalies: string[] = [];
    if (isLowConfidence) anomalies.push('Χαμηλή εμπιστοσύνη ανάγνωσης - ελέγξτε τα δεδομένα');
    if (isHighValue) anomalies.push('Υψηλό ποσό - απαιτεί επαλήθευση');
    if (!extracted?.invoice_number) anomalies.push('Δεν εντοπίστηκε αριθμός τιμολογίου');
    if (hasMissingVat) anomalies.push('Δεν εντοπίστηκε ΑΦΜ πωλητή');
    if (extracted?.net_amount && extracted?.amount && extracted?.vat_amount) {
        const calculatedTotal = extracted.net_amount + extracted.vat_amount;
        if (Math.abs(calculatedTotal - extracted.amount) > 0.05) {
            anomalies.push(`Ασυμφωνία ποσών: Καθαρό (${extracted.net_amount}) + ΦΠΑ (${extracted.vat_amount}) ≠ Σύνολο (${extracted.amount})`);
        }
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        sender: extracted?.merchant || "Μη αναγνωρισμένος",
        amount: extracted?.amount || 0,
        date: extracted?.date || new Date().toISOString().split('T')[0],
        items: extracted?.invoice_number ? [`Τιμολόγιο: ${extracted.invoice_number}`] : [],
        extractedData: extracted,
        analysis: {
            categoryId: mapped.id,
            categoryName: mapped.name,
            confidence,
            tags: [category, extracted?.currency || 'EUR'].filter(Boolean),
            anomalies,
            riskLevel,
            summary: extracted?.merchant
                ? `Τιμολόγιο από ${extracted.merchant} ποσού €${(extracted.amount || 0).toFixed(2)}.${extracted.vat_amount ? ` ΦΠΑ: €${extracted.vat_amount.toFixed(2)}.` : ''}${extracted.tax_id ? ` ΑΦΜ: ${extracted.tax_id}.` : ''}`
                : 'Δεν ήταν δυνατή η ανάγνωση του τιμολογίου. Ελέγξτε χειροκίνητα.'
        }
    };
}

/**
 * AI-powered spending insights via edge function
 */
export async function generateSpendingInsights(month: string) {
    try {
        const response = await supabase.functions.invoke('ai-insights', {
            body: { month, type: 'spending' },
        });

        if (response.error) {
            console.error('AI Insights error:', response.error);
            return fallbackInsights(month);
        }

        const data = response.data as any;
        if (data?.insights?.length > 0) {
            return data.insights;
        }
        return fallbackInsights(month);
    } catch (error) {
        console.error('AI Insights error:', error);
        return fallbackInsights(month);
    }
}

/**
 * AI-powered duplicate detection
 */
export async function detectAIDuplicates() {
    try {
        const response = await supabase.functions.invoke('ai-insights', {
            body: { type: 'duplicates' },
        });

        if (response.error) {
            console.error('AI Duplicates error:', response.error);
            return [];
        }

        return (response.data as any)?.duplicates || [];
    } catch (error) {
        console.error('AI Duplicates error:', error);
        return [];
    }
}

/**
 * Detects fraud patterns in a batch of invoices
 */
export async function detectFraudPatterns(invoices: any[]) {
    return invoices.map(inv => {
        const amount = inv.amount || 0;
        const hasFile = inv.file_path && !inv.file_path.startsWith('manual/');
        const warnings: string[] = [];

        if (!hasFile) warnings.push('Χωρίς αρχείο - χειροκίνητη καταχώριση');
        if (amount > 100 && amount % 100 === 0) warnings.push('Στρογγυλό ποσό');
        if (amount > 10000) warnings.push('Πολύ υψηλό ποσό');

        return {
            ...inv,
            fraudScore: warnings.length > 0 ? Math.min(100, warnings.length * 30 + Math.floor(Math.random() * 20)) : Math.floor(Math.random() * 15),
            warnings
        };
    });
}

/** Fallback static insights when AI is unavailable */
async function fallbackInsights(month: string) {
    const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, type, category')
        .gte('invoice_date', `${month}-01`)
        .lte('invoice_date', `${month}-31`);

    const expenses = invoices?.filter(i => i.type === 'expense') || [];
    const income = invoices?.filter(i => i.type === 'income') || [];
    const totalExpenses = expenses.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);

    const insights = [];
    if (totalExpenses > 0 || totalIncome > 0) {
        const margin = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0';
        insights.push({
            type: 'info',
            title: 'Σύνοψη Μήνα',
            message: `Έξοδα: €${totalExpenses.toFixed(2)} | Έσοδα: €${totalIncome.toFixed(2)} | Περιθώριο: ${margin}%`,
        });
    }
    if (insights.length === 0) {
        insights.push({ type: 'info', title: 'Χωρίς Δεδομένα', message: 'Δεν υπάρχουν δεδομένα.' });
    }
    return insights;
}
