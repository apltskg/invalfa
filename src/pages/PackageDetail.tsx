import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, CreditCard, CheckCircle2, Link as LinkIcon, Sparkles, Upload, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, BankTransaction, InvoiceTransactionMatch } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UploadModal } from "@/components/upload/UploadModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type InvoiceWithMatch = Invoice & { matchedTransaction?: BankTransaction; matchId?: string };

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithMatch[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [matches, setMatches] = useState<InvoiceTransactionMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"income" | "expense">("expense");
  const [linkInvoiceOpen, setLinkInvoiceOpen] = useState(false);
  const [unassignedInvoices, setUnassignedInvoices] = useState<Invoice[]>([]);

  const [linking, setLinking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const [{ data: pkgData }, { data: invData }, { data: txnData }, { data: matchData }] = await Promise.all([
      supabase.from("packages").select("*").eq("id", id).single(),
      supabase.from("invoices").select("*").eq("package_id", id).order('invoice_date', { ascending: false }),
      supabase.from("bank_transactions").select("*").eq("package_id", id).order('transaction_date', { ascending: false }),
      supabase.from("invoice_transaction_matches").select("*"),
    ]);

    setPkg(pkgData as Package | null);
    setMatches((matchData || []) as InvoiceTransactionMatch[]);

    const txns = (txnData as BankTransaction[]) || [];
    setTransactions(txns);

    // Match invoices with transactions using the matches table
    const invoicesWithMatches = ((invData as any[]) || []).map((inv) => {
      const match = (matchData || []).find((m: InvoiceTransactionMatch) => m.invoice_id === inv.id);
      const matchedTransaction = match ? txns.find(t => t.id === match.transaction_id) : undefined;
      return {
        ...inv,
        type: inv.type || 'expense', // Ensure type is set for legacy data
        matchedTransaction,
        matchId: match?.id,
      } as InvoiceWithMatch;
    });

    setInvoices(invoicesWithMatches);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  // Fetch unassigned invoices for linking
  const fetchUnassigned = async () => {
    const { data } = await supabase.from("invoices").select("*").is("package_id", null);
    setUnassignedInvoices((data as Invoice[]) || []);
  };

  useEffect(() => {
    if (linkInvoiceOpen) fetchUnassigned();
  }, [linkInvoiceOpen]);

  // Actions
  const handleLinkInvoice = async (invoiceId: string) => {
    if (!id) return;
    await supabase.from("invoices").update({ package_id: id }).eq("id", invoiceId);
    toast.success("Invoice linked to package");
    setLinkInvoiceOpen(false);
    fetchData();
  };

  const createMatch = async (invoiceId: string, transactionId: string) => {
    setLinking(transactionId);

    try {
      const existingMatch = matches.find(
        m => m.invoice_id === invoiceId && m.transaction_id === transactionId
      );

      if (existingMatch) {
        toast.info("This match already exists");
        setLinking(null);
        return;
      }

      const { error } = await supabase.from("invoice_transaction_matches").insert([{
        invoice_id: invoiceId,
        transaction_id: transactionId,
        status: "confirmed"
      }]);

      if (error) {
        throw error;
      }

      toast.success("Match created successfully");
      await fetchData();
    } catch (error: any) {
      console.error("Match error:", error);
      toast.error(`Failed to create match: ${error.message}`);
    }

    setLinking(null);
  };

  const openPreview = async (inv: Invoice) => {
    if (inv.file_path && inv.file_path.startsWith("manual/")) {
      toast.info("This is a manual entry (no file).");
      return;
    }
    const { data } = await supabase.storage.from("invoices").createSignedUrl(inv.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // derived state
  const incomeInvoices = invoices.filter(i => i.type === 'income');
  const expenseInvoices = invoices.filter(i => i.type === 'expense'); // Default mostly
  // Catch legacy nulls as expenses for safety, or just filter explicit. 
  // For now let's assume if it's not income it's expense to capture legacy data.
  // actually better to be strict if we updated DB.
  // But let's act as: default/null = expense.
  const expenseInvoicesAll = invoices.filter(i => i.type !== 'income');

  const totalIncome = incomeInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalExpenses = expenseInvoicesAll.reduce((sum, i) => sum + (i.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;

  // Filter unmatched items for suggestions
  const unmatchedInvoices = invoices.filter(inv => !inv.matchedTransaction && inv.amount);
  const unmatchedTransactions = transactions.filter(txn =>
    !matches.some(m => m.transaction_id === txn.id)
  );

  // Suggested Matches
  const suggestedMatches = unmatchedTransactions.map(txn => {
    const matchingInvoice = unmatchedInvoices.find(
      inv => inv.amount && Math.abs(Math.abs(txn.amount) - inv.amount) < 0.01
    );
    return matchingInvoice ? { transaction: txn, invoice: matchingInvoice } : null;
  }).filter(Boolean) as { transaction: BankTransaction; invoice: Invoice }[];

  // Render Helpers
  const InvoiceList = ({ items }: { items: InvoiceWithMatch[] }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-xl">No items found</p>
      ) : (
        items.map(inv => (
          <Card key={inv.id} className="p-4 rounded-xl hover:bg-muted/50 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => openPreview(inv)}>
            <div>
              <div className="font-medium flex items-center gap-2">
                {inv.merchant || "Unknown"}
                {inv.matchedTransaction && <CheckCircle2 className="h-3 w-3 text-green-500" />}
              </div>
              <div className="text-xs text-muted-foreground flex gap-2">
                <span>{inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : "-"}</span>
                <Badge variant="secondary" className="text-[10px] h-5">{inv.category}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">€{(inv.amount || 0).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">View</div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-muted" />
          <div className="h-96 animate-pulse rounded-3xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!pkg) return <div>Package not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate("/packages")} className="self-start -ml-2 rounded-xl gap-2 hover:bg-muted/50">
          <ArrowLeft className="h-4 w-4" />
          Back to Packages
        </Button>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Main Info Card */}
          <Card className="md:col-span-2 rounded-3xl p-6 bg-gradient-to-br from-card to-secondary/30 border-border/50">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="mb-2 rounded-lg capitalize">
                  {pkg.status}
                </Badge>
                <h1 className="text-3xl font-bold tracking-tight">{pkg.client_name}</h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary/50"></span>
                  {format(new Date(pkg.start_date), "MMM d")} - {format(new Date(pkg.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </Card>

          {/* Summary Dashboard */}
          <Card className="rounded-3xl p-6 bg-primary text-primary-foreground shadow-xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp className="w-24 h-24" />
            </div>
            <div className="relative z-10 space-y-4">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium">Net Profit</p>
                <h2 className="text-3xl font-bold tracking-tight">€{netProfit.toFixed(2)}</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-xs text-primary-foreground/70">Income</p>
                  <p className="font-semibold text-lg">€{totalIncome.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-primary-foreground/70">Expenses</p>
                  <p className="font-semibold text-lg">€{totalExpenses.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Financials */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Financials
            </h2>

            <Dialog open={linkInvoiceOpen} onOpenChange={setLinkInvoiceOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <LinkIcon className="h-4 w-4 mr-2" /> Link Existing
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Link Existing Invoice</DialogTitle></DialogHeader>
                <div className="max-h-[300px] overflow-auto space-y-2">
                  {unassignedInvoices.map(inv => (
                    <div key={inv.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted cursor-pointer" onClick={() => handleLinkInvoice(inv.id)}>
                      <div>
                        <p className="font-medium">{inv.merchant || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">€{inv.amount} • {inv.invoice_date}</p>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                  {unassignedInvoices.length === 0 && <p className="text-center py-4 text-muted-foreground">No unassigned invoices found.</p>}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-xl mb-4 bg-muted/50 p-1">
              <TabsTrigger value="expenses" className="rounded-lg">Expenses (€{totalExpenses.toFixed(0)})</TabsTrigger>
              <TabsTrigger value="income" className="rounded-lg">Income (€{totalIncome.toFixed(0)})</TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="space-y-4">
              <Button className="w-full rounded-xl border-dashed border-2 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground h-12" variant="outline" onClick={() => { setUploadType("expense"); setUploadModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Expense
              </Button>
              <InvoiceList items={expenseInvoicesAll} />
            </TabsContent>

            <TabsContent value="income" className="space-y-4">
              <Button className="w-full rounded-xl border-dashed border-2 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground h-12" variant="outline" onClick={() => { setUploadType("income"); setUploadModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Income
              </Button>
              <InvoiceList items={incomeInvoices} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Bank Transactions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Bank Transactions
            </h2>
          </div>

          {/* Suggestions Area */}
          {suggestedMatches.length > 0 && (
            <Card className="rounded-3xl overflow-hidden border-primary/20 bg-primary/5 mb-4">
              <div className="p-3 border-b border-primary/10 bg-primary/10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Smart Suggestions</span>
              </div>
              <div className="divide-y divide-primary/10">
                {suggestedMatches.map(({ transaction, invoice }) => (
                  <div key={transaction.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Matches {invoice.merchant} (€{invoice.amount})</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-xl h-8 text-xs gap-1"
                      onClick={() => createMatch(invoice.id, transaction.id)}
                      disabled={linking === transaction.id}
                    >
                      <LinkIcon className="h-3 w-3" />
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Transactions List */}
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-12 bg-muted/20">
                <p className="text-muted-foreground">No transactions found</p>
              </Card>
            ) : (
              transactions.map((txn) => {
                const isMatched = matches.some(m => m.transaction_id === txn.id);
                return (
                  <Card
                    key={txn.id}
                    className={cn(
                      "p-4 rounded-2xl border-border/50 transition-colors",
                      isMatched ? "bg-muted/30 opacity-60" : "bg-card"
                    )}
                  >
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{txn.description}</p>
                          {isMatched && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(txn.transaction_date), "dd MMM")}
                        </p>
                      </div>
                      <p className={cn("font-semibold", txn.amount < 0 ? "text-foreground" : "text-green-600")}>
                        {txn.amount < 0 ? '-' : '+'}€{Math.abs(txn.amount).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        packageId={id}
        onUploadComplete={fetchData}
        defaultType={uploadType}
      />
    </div>
  );
}
