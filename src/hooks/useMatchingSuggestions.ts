import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  findMatchSuggestions, 
  MatchSuggestion, 
  MatchableRecord, 
  TransactionForMatching 
} from "@/lib/matching-engine";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  match_status: string | null;
  bank_name: string | null;
}

interface SuggestionResult {
  transactionId: string;
  suggestions: MatchSuggestion[];
}

export function useMatchingSuggestions(transactions: BankTransaction[]) {
  const [records, setRecords] = useState<MatchableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch matchable records (invoices)
  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      
      try {
        // Fetch invoices (expenses and income)
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, type, amount, invoice_date, merchant, extracted_data, file_name")
          .order("invoice_date", { ascending: false })
          .limit(500);
        
        const matchableRecords: MatchableRecord[] = [];
        
        // Process invoices
        if (invoices) {
          for (const inv of invoices) {
            const extractedData = inv.extracted_data as Record<string, unknown> | null;
            matchableRecords.push({
              id: inv.id,
              type: inv.type === 'income' ? 'income' : 'expense',
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
  
  // Calculate suggestions for each unmatched transaction
  const suggestionResults = useMemo<SuggestionResult[]>(() => {
    if (loading || records.length === 0) return [];
    
    const unmatchedTransactions = transactions.filter(
      t => t.match_status !== 'matched'
    );
    
    return unmatchedTransactions.map(txn => {
      const txnForMatching: TransactionForMatching = {
        id: txn.id,
        amount: txn.amount,
        transaction_date: txn.transaction_date,
        description: txn.description,
      };
      
      const suggestions = findMatchSuggestions(txnForMatching, records);
      
      return {
        transactionId: txn.id,
        suggestions,
      };
    });
  }, [transactions, records, loading]);
  
  // Get suggestions for a specific transaction
  const getSuggestionsForTransaction = (txnId: string): MatchSuggestion[] => {
    const result = suggestionResults.find(r => r.transactionId === txnId);
    return result?.suggestions || [];
  };
  
  // Get best suggestion for a transaction
  const getBestSuggestion = (txnId: string): MatchSuggestion | null => {
    const suggestions = getSuggestionsForTransaction(txnId);
    return suggestions.length > 0 ? suggestions[0] : null;
  };
  
  // Get all transactions with suggestions (for bulk view)
  const transactionsWithSuggestions = useMemo(() => {
    return suggestionResults
      .filter(r => r.suggestions.length > 0)
      .map(r => {
        const transaction = transactions.find(t => t.id === r.transactionId);
        return {
          transaction: transaction!,
          suggestion: r.suggestions[0],
        };
      })
      .filter(item => item.transaction !== undefined);
  }, [suggestionResults, transactions]);
  
  // Stats
  const stats = useMemo(() => {
    const withSuggestions = transactionsWithSuggestions.length;
    const highConfidence = transactionsWithSuggestions.filter(
      s => s.suggestion.confidenceLevel === 'high'
    ).length;
    const mediumConfidence = transactionsWithSuggestions.filter(
      s => s.suggestion.confidenceLevel === 'medium'
    ).length;
    const lowConfidence = transactionsWithSuggestions.filter(
      s => s.suggestion.confidenceLevel === 'low'
    ).length;
    
    return {
      total: withSuggestions,
      high: highConfidence,
      medium: mediumConfidence,
      low: lowConfidence,
    };
  }, [transactionsWithSuggestions]);
  
  return {
    loading,
    getSuggestionsForTransaction,
    getBestSuggestion,
    transactionsWithSuggestions,
    stats,
  };
}
