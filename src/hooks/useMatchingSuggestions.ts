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
  package_id?: string | null;
}

interface SuggestionResult {
  transactionId: string;
  suggestions: MatchSuggestion[];
}

export function useMatchingSuggestions(transactions: BankTransaction[]) {
  const [records, setRecords] = useState<MatchableRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch matchable records with enriched data (VAT, supplier info)
  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);

      try {
        // Fetch invoices + supplier/customer + invoice list items data in parallel
        const [{ data: invoices }, { data: suppliers }, { data: customers }, { data: listItems }] = await Promise.all([
          supabase
            .from("invoices")
            .select("id, type, amount, invoice_date, merchant, extracted_data, file_name, package_id, supplier_id, customer_id")
            .order("invoice_date", { ascending: false })
            .limit(500),
          supabase.from("suppliers").select("id, name, vat_number").limit(500),
          supabase.from("customers").select("id, name, vat_number").limit(500),
          supabase.from("invoice_list_items")
            .select("id, invoice_number, client_name, client_vat, invoice_date, net_amount, total_amount, match_status")
            .neq("match_status", "matched")
            .limit(500),
        ]);

        const supplierMap = new Map((suppliers || []).map(s => [s.id, s]));
        const customerMap = new Map((customers || []).map(c => [c.id, c]));

        const matchableRecords: MatchableRecord[] = [];

        if (invoices) {
          for (const inv of invoices) {
            const rawExtracted = inv.extracted_data as Record<string, unknown> | null;
            const extractedData = (rawExtracted?.extracted as Record<string, unknown>) || rawExtracted;

            // Enrich with supplier/customer VAT data
            const supplier = inv.supplier_id ? supplierMap.get(inv.supplier_id) : null;
            const customer = inv.customer_id ? customerMap.get(inv.customer_id) : null;
            
            const taxId = (extractedData?.tax_id as string) || supplier?.vat_number || null;
            const buyerVat = (extractedData?.buyer_vat as string) || customer?.vat_number || null;
            const vendorName = inv.merchant 
              || (extractedData?.merchant as string) 
              || supplier?.name 
              || customer?.name 
              || null;

            matchableRecords.push({
              id: inv.id,
              type: inv.type === 'income' ? 'income' : 'expense',
              amount: inv.amount,
              date: inv.invoice_date,
              vendor_or_client: vendorName,
              invoice_number: (extractedData?.invoice_number as string) || null,
              description: inv.file_name,
              tax_id: taxId,
              buyer_vat: buyerVat,
              package_id: inv.package_id,
              supplier_id: inv.supplier_id,
              customer_id: inv.customer_id,
            });
          }
        }

        // Add invoice list items as matchable records (income type)
        if (listItems) {
          for (const item of listItems) {
            matchableRecords.push({
              id: item.id,
              type: 'income',
              amount: item.total_amount || item.net_amount,
              date: item.invoice_date,
              vendor_or_client: item.client_name,
              invoice_number: item.invoice_number,
              description: item.client_name || '',
              tax_id: null,
              buyer_vat: item.client_vat,
              package_id: null,
              supplier_id: null,
              customer_id: null,
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
        package_id: txn.package_id,
      };

      // Filter records by type: credit transactions → income invoices, debit → expenses
      const expectedType = txn.amount > 0 ? 'income' : 'expense';
      const filteredRecords = records.filter(r => r.type === expectedType);

      const suggestions = findMatchSuggestions(txnForMatching, filteredRecords);

      return {
        transactionId: txn.id,
        suggestions,
      };
    });
  }, [transactions, records, loading]);

  const getSuggestionsForTransaction = (txnId: string): MatchSuggestion[] => {
    const result = suggestionResults.find(r => r.transactionId === txnId);
    return result?.suggestions || [];
  };

  const getBestSuggestion = (txnId: string): MatchSuggestion | null => {
    const suggestions = getSuggestionsForTransaction(txnId);
    return suggestions.length > 0 ? suggestions[0] : null;
  };

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

  const stats = useMemo(() => {
    const withSuggestions = transactionsWithSuggestions.length;
    const highConfidence = transactionsWithSuggestions.filter(s => s.suggestion.confidenceLevel === 'high').length;
    const mediumConfidence = transactionsWithSuggestions.filter(s => s.suggestion.confidenceLevel === 'medium').length;
    const lowConfidence = transactionsWithSuggestions.filter(s => s.suggestion.confidenceLevel === 'low').length;

    return { total: withSuggestions, high: highConfidence, medium: mediumConfidence, low: lowConfidence };
  }, [transactionsWithSuggestions]);

  return {
    loading,
    getSuggestionsForTransaction,
    getBestSuggestion,
    transactionsWithSuggestions,
    stats,
  };
}
