import { supabase } from "@/integrations/supabase/client";

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
}

// Simulate AI processing delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const AI_CATEGORIES = {
    utilities: { id: 'utils', name: 'ΔΕΚΟ & Ενέργεια', color: 'bg-blue-100 text-blue-700' },
    travel: { id: 'travel', name: 'Ταξίδια & Μεταφορές', color: 'bg-orange-100 text-orange-700' },
    services: { id: 'services', name: 'Υπηρεσίες', color: 'bg-purple-100 text-purple-700' },
    supplies: { id: 'supplies', name: 'Αναλώσιμα', color: 'bg-green-100 text-green-700' },
    marketing: { id: 'marketing', name: 'Marketing & Διαφήμιση', color: 'bg-pink-100 text-pink-700' },
};

/**
 * Simulates AI OCR and Analysis on an uploaded file
 */
export async function analyzeInvoiceAI(file: File): Promise<SmartInvoiceData> {
    await delay(2500); // Simulate processing time

    // Mock response - in production this would call OpenAI/Document AI
    const isHighValue = Math.random() > 0.7;
    const isAnomaly = Math.random() > 0.85;

    return {
        id: Math.random().toString(36).substr(2, 9),
        sender: "Auto-Detected Supplier S.A.",
        amount: Math.floor(Math.random() * 1000) + 50,
        date: new Date().toISOString(),
        items: ["Consulting Services", "Server Maintenance"],
        analysis: {
            categoryId: 'services',
            categoryName: 'Υπηρεσίες',
            confidence: 0.98,
            tags: ['monthly', 'cloud', 'infrastructure'],
            anomalies: isAnomaly ? ['Ποσό 40% υψηλότερο από το μέσο όρο', 'Νέος τραπεζικός λογαριασμός'] : [],
            riskLevel: isAnomaly ? 'medium' : 'low',
            summary: 'Τιμολόγιο παροχής υπηρεσιών cloud. Συμβατό με την τρέχουσα σύμβαση.'
        }
    };
}

/**
 * Detects fraud patterns in a batch of invoices
 */
export async function detectFraudPatterns(invoices: any[]) {
    // Simulate AI detection
    return invoices.map(inv => ({
        ...inv,
        fraudScore: Math.floor(Math.random() * 100),
        warnings: Math.random() > 0.9 ? ['Πιθανό διπλότυπο', 'Ασυνήθιστη ώρα συναλλαγής'] : []
    }));
}

/**
 * Generates natural language insights
 */
export async function generateSpendingInsights(month: string) {
    return [
        {
            type: 'warning',
            title: 'Αύξηση Εξόδων Ταξιδιών',
            message: 'Τα έξοδα ταξιδιών αυξήθηκαν κατά 40% αυτόν τον μήνα σε σχέση με τον μέσο όρο του τριμήνου.',
            action: 'Προβολή Ανάλυσης'
        },
        {
            type: 'success',
            title: 'Βελτίωση Ροής',
            message: 'Ο μέσος χρόνος είσπραξης μειώθηκε κατά 5 ημέρες.',
            action: 'Λεπτομέρειες'
        },
        {
            type: 'info',
            title: 'Πρόβλεψη',
            message: 'Αναμένονται 3 πάγια έξοδα την επόμενη εβδομάδα συνολικής αξίας €1.200.',
            action: 'Προβολή'
        }
    ];
}
