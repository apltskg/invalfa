import { useState, useEffect, useMemo } from "react";
import { FileText, Filter, ArrowUpDown, Check, X, AlertTriangle, Search, Sparkles, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "@/types/database";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { EmptyState } from "@/components/shared/EmptyState";
import { useMonth } from "@/contexts/MonthContext";
import { BankLogo, SUPPORTED_BANKS, getBankBorderColor } from "@/components/bank/BankLogo";
import { BankPDFUploadModal } from "@/components/bank/BankPDFUploadModal";
import { TransactionRow } from "@/components/bank/TransactionRow";
import { BulkMatchingView } from "@/components/bank/BulkMatchingView";
import { useMatchingSuggestions } from "@/hooks/useMatchingSuggestions";
import { useAutoMatching } from "@/lib/auto-matching";

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  bank_id: string | null;
  bank_name: string | null;
  statement_id: string | null;
  match_status: string;
  matched_record_id: string | null;
  matched_record_type: string | null;
  folder_id: string | null;
  category_type: string;
  notes: string | null;
  confidence_score: number | null;
  package_id: string | null;
  needs_invoice: boolean;
}

type SortField = "date" | "amount" | "bank" | "status";
type SortDirection = "asc" | "desc";

import { InvoiceSelectorDialog } from "@/components/bank/InvoiceSelectorDialog";

export default function BankSync() {
  const { startDate, endDate, monthKey } = useMonth();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("transactions");
  const [invoiceSelectorOpen, setInvoiceSelectorOpen] = useState(false);
  const [selectedTransactionForInvoice, setSelectedTransactionForInvoice] = useState<string | null>(null);
  const [autoMatchingRunning, setAutoMatchingRunning] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Matching suggestions hook
  const {
    getSuggestionsForTransaction,
    transactionsWithSuggestions,
    stats: matchingStats,
    loading: matchingLoading
  } = useMatchingSuggestions(transactions);

  // Auto-matching hook
  const { runMatching } = useAutoMatching();

  const handleAutoMatch = async () => {
    setAutoMatchingRunning(true);
    try {
      const result = await runMatching({ minConfidence: 80 });
      if (result.matched > 0) {
        fetchData(); // Refresh data after matching
      }
    } catch (error) {
      console.error("Auto-matching error:", error);
    } finally {
      setAutoMatchingRunning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthKey]);

  async function fetchData() {
    setLoading(true);
    const [{ data: txns }, { data: pkgs }] = await Promise.all([
      supabase
        .from("bank_transactions")
        .select("*")
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate)
        .order("transaction_date", { ascending: false }),
      supabase.from("packages").select("*"),
    ]);
    setTransactions((txns as BankTransaction[]) || []);
    setPackages((pkgs as Package[]) || []);
    setLoading(false);
  }

  async function handleApproveMatch(txnId: string, recordId: string, recordType: string) {
    // Update the transaction with the match
    const { error } = await supabase
      .from("bank_transactions")
      .update({
        match_status: "matched",
        matched_record_id: recordId,
        matched_record_type: recordType,
      })
      .eq("id", txnId);

    if (error) {
      toast.error("Αποτυχία αντιστοίχισης");
      throw error;
    }

    // Create match record in invoice_transaction_matches
    await supabase
      .from("invoice_transaction_matches")
      .insert({
        transaction_id: txnId,
        invoice_id: recordId,
        status: "confirmed",
      });

    // If matching with invoice list item, update its status
    if (recordType === 'invoice_list') {
      await supabase
        .from('invoice_list_items')
        .update({
          match_status: 'matched',
          matched_income_id: txnId
        })
        .eq('id', recordId);
    }

    toast.success("Αντιστοίχιση επιβεβαιώθηκε");
    fetchData();
  }

  // Handle manual linking to invoice
  async function handleInvoiceSelected(invoiceId: string, invoiceNumber: string) {
    if (!selectedTransactionForInvoice) return;

    try {
      // Use existing approve match logic
      // Assuming 'invoice_list' is the record type for items from the list
      await handleApproveMatch(selectedTransactionForInvoice, invoiceId, 'invoice_list');
      setInvoiceSelectorOpen(false);
      setSelectedTransactionForInvoice(null);
    } catch (error) {
      console.error("Error linking invoice:", error);
      toast.error("Σφάλμα σύνδεσης παραστατικού");
    }
  }

  const handleLinkToInvoice = (txnId: string) => {
    setSelectedTransactionForInvoice(txnId);
    setInvoiceSelectorOpen(true);
  };

  async function handleRejectMatch(txnId: string) {
    // Mark as unmatched (rejected suggestion)
    const { error } = await supabase
      .from("bank_transactions")
      .update({
        match_status: "unmatched",
        matched_record_id: null,
        matched_record_type: null,
      })
      .eq("id", txnId);

    // If we are rejecting a match that was previously confirmed (though usually this function is for suggestions)
    // We might need to handle unmatching logic if we add an 'Unmatch' button later.
    // For now, this function handles rejecting suggestions.

    // For unmatching a confused match, we'd need a separate function or expand this one.
    // Assuming this is used for 'reject suggestion', we don't need to update invoice_list_items 
    // because it wasn't matched yet.

    if (error) {
      toast.error("Αποτυχία ενημέρωσης");
      throw error;
    }
    toast.success("Πρόταση απορρίφθηκε");
    fetchData();
  }

  async function handleLinkToPackage(txnId: string, packageId: string | null) {
    const { error } = await supabase
      .from("bank_transactions")
      .update({
        folder_id: packageId,
        category_type: packageId ? "folder" : "unmatched"
      })
      .eq("id", txnId);

    if (error) {
      toast.error("Αποτυχία σύνδεσης");
      return;
    }
    toast.success("Η κίνηση συνδέθηκε");
    fetchData();
  }

  async function handleSetCategoryType(txnId: string, type: string) {
    const { error } = await supabase
      .from("bank_transactions")
      .update({ category_type: type })
      .eq("id", txnId);

    if (error) {
      toast.error("Αποτυχία ενημέρωσης");
      return;
    }
    toast.success("Κατηγορία ενημερώθηκε");
    fetchData();
  }

  async function handleUpdateNotes(txnId: string, notes: string) {
    const { error } = await supabase
      .from("bank_transactions")
      .update({ notes: notes || null })
      .eq("id", txnId);

    if (error) {
      toast.error("Αποτυχία αποθήκευσης σημείωσης");
      return;
    }
    toast.success("Σημείωση αποθηκεύτηκε");
    fetchData();
  }

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.notes?.toLowerCase().includes(query)
      );
    }

    // Bank filter
    if (selectedBanks.length > 0) {
      result = result.filter((t) => t.bank_name && selectedBanks.includes(t.bank_name));
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((t) => t.match_status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case "amount":
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case "bank":
          comparison = (a.bank_name || "").localeCompare(b.bank_name || "");
          break;
        case "status":
          comparison = (a.match_status || "").localeCompare(b.match_status || "");
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [transactions, searchQuery, selectedBanks, statusFilter, sortField, sortDirection]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, BankTransaction[]> = {};
    filteredTransactions.forEach((t) => {
      const dateKey = t.transaction_date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const toggleBankFilter = (bankName: string) => {
    setSelectedBanks((prev) =>
      prev.includes(bankName) ? prev.filter((b) => b !== bankName) : [...prev, bankName]
    );
  };

  const stats = useMemo(() => {
    const matched = transactions.filter((t) => t.match_status === "matched").length;
    const suggested = transactions.filter((t) => t.match_status === "suggested").length;
    const unmatched = transactions.filter((t) => t.match_status === "unmatched").length;
    const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { matched, suggested, unmatched, totalIncome, totalExpense, total: transactions.length };
  }, [transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground animate-pulse">Φόρτωση κινήσεων...</p>
      </div>
    );
  }

  const selectedTransaction = transactions.find(t => t.id === selectedTransactionForInvoice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Συγχρονισμός Τράπεζας</h1>
          <p className="mt-1 text-muted-foreground">
            Διαχείριση τραπεζικών κινήσεων και αντιστοίχιση με παραστατικά
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleAutoMatch}
            disabled={autoMatchingRunning || transactions.length === 0}
            className="rounded-xl gap-2"
          >
            {autoMatchingRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Αυτόματο Ταίριασμα
          </Button>
          {matchingStats.total > 0 && (
            <Button
              variant="outline"
              onClick={() => setActiveTab("suggestions")}
              className="rounded-xl gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {matchingStats.total} Προτάσεις
            </Button>
          )}
          <Button
            onClick={() => setUploadModalOpen(true)}
            className="rounded-xl gap-2"
          >
            <FileText className="h-4 w-4" />
            Εισαγωγή PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground">Σύνολο</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-l-4 border-l-emerald-500">
            <p className="text-xs text-muted-foreground">Ταιριασμένα</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.matched}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-l-4 border-l-amber-500">
            <p className="text-xs text-muted-foreground">Με Προτάσεις</p>
            <p className="text-2xl font-bold text-amber-600">{matchingStats.total}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground">Εισπράξεις</p>
            <p className="text-2xl font-bold text-emerald-600">€{stats.totalIncome.toFixed(2)}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground">Πληρωμές</p>
            <p className="text-2xl font-bold text-rose-600">€{stats.totalExpense.toFixed(2)}</p>
          </Card>
        </div>
      )}

      {/* Tabs for Transactions / Bulk Matching */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="transactions" className="rounded-lg gap-2">
            <FileText className="h-4 w-4" />
            Κινήσεις
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-lg gap-2">
            <Sparkles className="h-4 w-4" />
            Προτάσεις Αντιστοίχισης
            {matchingStats.total > 0 && (
              <Badge variant="secondary" className="ml-1">
                {matchingStats.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          {transactions.length > 0 && (
            <Card className="p-4 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Αναζήτηση περιγραφής..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-xl"
                  />
                </div>

                {/* Bank Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl gap-2">
                      <Filter className="h-4 w-4" />
                      Τράπεζα
                      {selectedBanks.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedBanks.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuLabel>Επιλέξτε Τράπεζες</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SUPPORTED_BANKS.map((bank) => (
                      <DropdownMenuCheckboxItem
                        key={bank.value}
                        checked={selectedBanks.includes(bank.value)}
                        onCheckedChange={() => toggleBankFilter(bank.value)}
                      >
                        <div className="flex items-center gap-2">
                          <BankLogo bankName={bank.value} size="sm" />
                          {bank.label}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] rounded-xl">
                    <SelectValue placeholder="Κατάσταση" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλες</SelectItem>
                    <SelectItem value="matched">
                      <div className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-600" />
                        Ταιριασμένες
                      </div>
                    </SelectItem>
                    <SelectItem value="suggested">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        Προτεινόμενες
                      </div>
                    </SelectItem>
                    <SelectItem value="unmatched">
                      <div className="flex items-center gap-2">
                        <X className="h-3 w-3 text-muted-foreground" />
                        Χωρίς αντιστοίχιση
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Ταξινόμηση
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ταξινόμηση κατά</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={sortField === "date"}
                      onCheckedChange={() => setSortField("date")}
                    >
                      Ημερομηνία
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortField === "amount"}
                      onCheckedChange={() => setSortField("amount")}
                    >
                      Ποσό
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={sortField === "bank"}
                      onCheckedChange={() => setSortField("bank")}
                    >
                      Τράπεζα
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={sortDirection === "desc"}
                      onCheckedChange={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
                    >
                      {sortDirection === "desc" ? "Φθίνουσα" : "Αύξουσα"}
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Filters */}
                {(searchQuery || selectedBanks.length > 0 || statusFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedBanks([]);
                      setStatusFilter("all");
                    }}
                    className="text-muted-foreground"
                  >
                    Καθαρισμός
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={transactions.length === 0 ? "Δεν υπάρχουν κινήσεις" : "Δεν βρέθηκαν κινήσεις"}
              description={
                transactions.length === 0
                  ? "Εισάγετε ένα PDF τράπεζας για να ξεκινήσετε"
                  : "Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης"
              }
              actionLabel={transactions.length === 0 ? "Εισαγωγή PDF" : undefined}
              onAction={transactions.length === 0 ? () => setUploadModalOpen(true) : undefined}
            />
          ) : (
            <Card className="rounded-3xl overflow-hidden">
              {Object.entries(groupedTransactions).map(([dateKey, dayTransactions]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b">
                    <p className="font-medium text-sm">
                      {format(parseISO(dateKey), "EEEE, d MMMM yyyy", { locale: el })}
                    </p>
                  </div>

                  {/* Day Transactions */}
                  {dayTransactions.map((txn, index) => (
                    <TransactionRow
                      key={txn.id}
                      transaction={txn}
                      packages={packages}
                      onLinkToPackage={handleLinkToPackage}
                      onSetCategoryType={handleSetCategoryType}
                      onUpdateNotes={handleUpdateNotes}
                      onApproveMatch={handleApproveMatch}
                      onRejectMatch={handleRejectMatch}
                      onLinkToInvoice={() => handleLinkToInvoice(txn.id)}
                      suggestions={getSuggestionsForTransaction(txn.id)}
                      index={index}
                    />
                  ))}
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <BulkMatchingView
            suggestions={transactionsWithSuggestions}
            onApproveMatch={handleApproveMatch}
            onRejectMatch={handleRejectMatch}
            onClose={() => setActiveTab("transactions")}
          />
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      <BankPDFUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchData}
      />

      <InvoiceSelectorDialog
        open={invoiceSelectorOpen}
        onOpenChange={setInvoiceSelectorOpen}
        onSelect={handleInvoiceSelected}
        transactionAmount={selectedTransaction?.amount || 0}
        transactionDate={selectedTransaction?.transaction_date || ""}
      />
    </div>
  );
}
