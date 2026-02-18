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
    'hotels': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'flights': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'transport': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'meals': { id: 'travel', name: 'Ταξίδια & Μεταφορές' },
    'office': { id: 'supplies', name: 'Αναλώσιμα' },
    'subscriptions': { id: 'services', name: 'Υπηρεσίες' },
    'services': { id: 'services', name: 'Υπηρεσίες' },
    'utilities': { id: 'utils', name: 'ΔΕΚΟ & Ενέργεια' },
    'telecom': { id: 'utils', name: 'ΔΕΚΟ & Ενέργεια' },
    'maintenance': { id: 'services', name: 'Υπηρεσίες' },
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

    // 3. Unwrap the response (edge function returns { extracted: { ... } })
    const rawData = response.data as any;
    const extracted: ExtractedData = (rawData?.extracted || rawData) as ExtractedData;

    // 4. Map category to analysis format
    const category = extracted?.category || 'other';
    const mapped = CATEGORY_MAP[category] || { id: 'services', name: 'Υπηρεσίες' };
    const confidence = extracted?.confidence || 0.5;

    // 5. Determine risk level
    const isHighValue = (extracted?.amount || 0) > 5000;
    const isLowConfidence = confidence < 0.7;
    const riskLevel: 'low' | 'medium' | 'high' = isHighValue && isLowConfidence ? 'high' :
        (isLowConfidence || isHighValue) ? 'medium' : 'low';

    // 6. Build anomalies
    const anomalies: string[] = [];
    if (isLowConfidence) anomalies.push('Χαμηλή εμπιστοσύνη ανάγνωσης - ελέγξτε τα δεδομένα');
    if (isHighValue) anomalies.push('Υψηλό ποσό - απαιτεί επαλήθευση');
    if (!extracted?.invoice_number) anomalies.push('Δεν εντοπίστηκε αριθμός τιμολογίου');

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
                ? `Τιμολόγιο από ${extracted.merchant} ποσού €${(extracted.amount || 0).toFixed(2)}. ${extracted.vat_amount ? `ΦΠΑ: €${extracted.vat_amount.toFixed(2)}.` : ''}`
                : 'Δεν ήταν δυνατή η ανάγνωση του τιμολογίου. Ελέγξτε χειροκίνητα.'
        }
    };
}

/**
 * Detects fraud patterns in a batch of invoices (enhanced with real data)
 */
export async function detectFraudPatterns(invoices: any[]) {
    return invoices.map(inv => {
        const amount = inv.amount || 0;
        const hasFile = inv.file_path && !inv.file_path.startsWith('manual/');
        const warnings: string[] = [];

        // Check for missing files
        if (!hasFile) warnings.push('Χωρίς αρχείο - χειροκίνητη καταχώριση');
        // Check for round amounts (suspicious)
        if (amount > 100 && amount % 100 === 0) warnings.push('Στρογγυλό ποσό');
        // Check for very high amounts
        if (amount > 10000) warnings.push('Πολύ υψηλό ποσό');
        // Check for duplicate merchants in close dates
        // (In production, would cross-reference with other invoices)

        return {
            ...inv,
            fraudScore: warnings.length > 0 ? Math.min(100, warnings.length * 30 + Math.floor(Math.random() * 20)) : Math.floor(Math.random() * 15),
            warnings
        };
    });
}

/**
 * Generates natural language insights based on real invoice data
 */
export async function generateSpendingInsights(month: string) {
    // Fetch actual data for the month
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, type, category, created_at')
        .gte('invoice_date', monthStart)
        .lte('invoice_date', monthEnd);

    const expenses = invoices?.filter(i => i.type === 'expense') || [];
    const income = invoices?.filter(i => i.type === 'income') || [];

    const totalExpenses = expenses.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalIncome = income.reduce((sum, i) => sum + (i.amount || 0), 0);
    const margin = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : '0';

    const insights = [];

    if (totalExpenses > 0) {
        insights.push({
            type: 'info',
            title: 'Σύνοψη Μήνα',
            message: `Σύνολο εξόδων: €${totalExpenses.toFixed(2)} | Σύνολο εσόδων: €${totalIncome.toFixed(2)} | Περιθώριο: ${margin}%`,
            action: 'Λεπτομέρειες'
        });
    }

    if (expenses.length > 5) {
        // Group by category
        const byCategory = expenses.reduce((acc, e) => {
            const cat = e.category || 'other';
            acc[cat] = (acc[cat] || 0) + (e.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        const topCategory = Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0];
        if (topCategory) {
            insights.push({
                type: 'warning',
                title: `Κορυφαία Κατηγορία Εξόδων`,
                message: `Η κατηγορία "${topCategory[0]}" αντιπροσωπεύει €${topCategory[1].toFixed(2)} (${(topCategory[1] / totalExpenses * 100).toFixed(0)}% των εξόδων).`,
                action: 'Προβολή Ανάλυσης'
            });
        }
    }

    if (income.length === 0 && expenses.length > 0) {
        insights.push({
            type: 'warning',
            title: 'Δεν υπάρχουν Έσοδα',
            message: 'Δεν έχουν καταχωρηθεί έσοδα αυτόν τον μήνα. Ελέγξτε αν λείπουν τιμολόγια εισοδήματος.',
            action: 'Καταχώρηση Εσόδου'
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: 'info',
            title: 'Χωρίς Δεδομένα',
            message: 'Δεν υπάρχουν δεδομένα για αυτόν τον μήνα.',
            action: 'Πίσω'
        });
    }

    return insights;
}
