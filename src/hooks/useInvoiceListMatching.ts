import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    findMatchSuggestions,
    MatchSuggestion,
    MatchableRecord,
    TransactionForMatching
} from "@/lib/matching-engine";

export interface InvoiceListItem {
    id: string;
    invoice_date: string | null;
    invoice_number: string;
    client_name: string;
    client_vat: string;
    total_amount: number;
    match_status: string;
}

interface SuggestionResult {
    itemId: string;
    suggestions: MatchSuggestion[];
}

/**
 * Hook for matching invoice list items to income records
 * Works similarly to useMatchingSuggestions but for invoice lists
 */
export function useInvoiceListMatching(items: InvoiceListItem[]) {
    const [records, setRecords] = useState<MatchableRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch matchable income records
    useEffect(() => {
        async function fetchRecords() {
            setLoading(true);

            try {
                // Fetch income invoices
                const { data: invoices } = await supabase
                    .from("invoices")
                    .select("id, type, amount, invoice_date, merchant, extracted_data, file_name")
                    .eq("type", "income")
                    .order("invoice_date", { ascending: false })
                    .limit(500);

                const matchableRecords: MatchableRecord[] = [];

                // Process invoices
                if (invoices) {
                    for (const inv of invoices) {
                        const rawExtracted = inv.extracted_data as Record<string, unknown> | null;
                        // Handle both { extracted: {...} } and flat { merchant, ... } formats
                        const extractedData = (rawExtracted?.extracted as Record<string, unknown>) || rawExtracted;
                        matchableRecords.push({
                            id: inv.id,
                            type: 'income',
                            amount: inv.amount,
                            date: inv.invoice_date,
                            vendor_or_client: inv.merchant || (extractedData?.merchant as string) || null,
                            invoice_number: (extractedData?.invoice_number as string) || null,
                            description: inv.file_name,
                        });
                    }
                }

                setRecords(matchableRecords);
            } catch (error) {
                console.error("Error fetching matchable records:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchRecords();
    }, []);

    // Calculate suggestions for each unmatched item
    const suggestionResults = useMemo<SuggestionResult[]>(() => {
        if (loading || records.length === 0) return [];

        const unmatchedItems = items.filter(
            item => item.match_status !== 'matched'
        );

        return unmatchedItems.map(item => {
            // Convert invoice list item to transaction format for matching
            const itemForMatching: TransactionForMatching = {
                id: item.id,
                amount: item.total_amount,
                transaction_date: item.invoice_date || '',
                description: `${item.client_name} ${item.invoice_number}`,
            };

            const suggestions = findMatchSuggestions(itemForMatching, records);

            return {
                itemId: item.id,
                suggestions,
            };
        });
    }, [items, records, loading]);

    // Get suggestions for a specific item
    const getSuggestionsForItem = (itemId: string): MatchSuggestion[] => {
        const result = suggestionResults.find(r => r.itemId === itemId);
        return result?.suggestions || [];
    };

    // Get best suggestion for an item
    const getBestSuggestion = (itemId: string): MatchSuggestion | null => {
        const suggestions = getSuggestionsForItem(itemId);
        return suggestions.length > 0 ? suggestions[0] : null;
    };

    // Get all items with suggestions (for bulk view)
    const itemsWithSuggestions = useMemo(() => {
        return suggestionResults
            .filter(r => r.suggestions.length > 0)
            .map(r => {
                const item = items.find(i => i.id === r.itemId);
                return {
                    item: item!,
                    suggestion: r.suggestions[0],
                    allSuggestions: r.suggestions,
                };
            })
            .filter(result => result.item !== undefined);
    }, [suggestionResults, items]);

    // Stats
    const stats = useMemo(() => {
        const withSuggestions = itemsWithSuggestions.length;
        const highConfidence = itemsWithSuggestions.filter(
            s => s.suggestion.confidenceLevel === 'high'
        ).length;
        const mediumConfidence = itemsWithSuggestions.filter(
            s => s.suggestion.confidenceLevel === 'medium'
        ).length;
        const lowConfidence = itemsWithSuggestions.filter(
            s => s.suggestion.confidenceLevel === 'low'
        ).length;

        return {
            total: withSuggestions,
            high: highConfidence,
            medium: mediumConfidence,
            low: lowConfidence,
        };
    }, [itemsWithSuggestions]);

    return {
        loading,
        getSuggestionsForItem,
        getBestSuggestion,
        itemsWithSuggestions,
        stats,
        records,
    };
}
