import { useState } from "react";
import {
  Check, AlertTriangle, X, FileText, ChevronDown, ChevronUp,
  Pencil, Link2, Building2, Plus, Receipt, ArrowDownCircle,
  ArrowUpCircle, FolderOpen, StickyNote, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BankLogo } from "./BankLogo";
import { getBankBorderColor } from "./BankLogo";
import { MatchSuggestionCard } from "./MatchSuggestionCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { MatchSuggestion } from "@/lib/matching-engine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Package {
  id: string;
  client_name: string;
}

interface TransactionRowProps {
  transaction: {
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    bank_name?: string | null;
    bank_id?: string | null;
    match_status?: string;
    category_type?: string;
    notes?: string | null;
    confidence_score?: number | null;
    folder_id?: string | null;
    matched_record_id?: string | null;
    matched_record_type?: string | null;
    needs_invoice?: boolean;
  };
  packages: Package[];
  onLinkToPackage: (txnId: string, packageId: string | null) => void;
  onSetCategoryType: (txnId: string, type: string) => void;
  onUpdateNotes: (txnId: string, notes: string) => void;
  onViewSourcePDF?: (txnId: string) => void;
  onApproveMatch?: (txnId: string, recordId: string, recordType: string) => void;
  onRejectMatch?: (txnId: string) => void;
  onLinkToInvoice?: (txnId: string) => void;
  onRefresh?: () => void;
  suggestions?: MatchSuggestion[];
  index: number;
}

export function TransactionRow({
  transaction,
  packages,
  onLinkToPackage,
  onSetCategoryType,
  onUpdateNotes,
  onViewSourcePDF,
  onApproveMatch,
  onRejectMatch,
  onLinkToInvoice,
  onRefresh,
  suggestions = [],
  index,
}: TransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(transaction.notes || "");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("other");

  const borderColor = getBankBorderColor(transaction.bank_name || null);
  const isIncome = transaction.amount > 0;
  const matchStatus = transaction.match_status || "unmatched";
  const categoryType = transaction.category_type || "unmatched";

  const handleSaveNotes = () => {
    onUpdateNotes(transaction.id, notesValue);
    setEditingNotes(false);
  };

  const handleCreateExpense = async () => {
    if (!expenseName.trim()) {
      toast.error("Εισάγετε περιγραφή εξόδου");
      return;
    }
    try {
      // Map UI category to DB-allowed values
      const dbCategory = ["other", "airline", "hotel", "tolls"].includes(expenseCategory)
        ? (expenseCategory as "other" | "airline" | "hotel" | "tolls")
        : "other";

      const { data: newInvoice, error } = await supabase
        .from("invoices")
        .insert({
          merchant: expenseName.trim(),
          amount: Math.abs(transaction.amount),
          invoice_date: transaction.transaction_date,
          category: dbCategory,
          file_path: "manual/" + Date.now(),
          file_name: expenseName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Link the transaction to this new expense
      await supabase
        .from("bank_transactions")
        .update({
          match_status: "matched",
          matched_record_id: newInvoice.id,
          matched_record_type: "invoice",
          category_type: "general_expense",
        })
        .eq("id", transaction.id);

      toast.success("Δημιουργήθηκε νέο έξοδο και συνδέθηκε");
      setCreatingExpense(false);
      setExpenseName("");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error("Αποτυχία δημιουργίας εξόδου");
    }
  };

  // ── Status badge ────────────────────────────────────────────────────────
  const getMatchBadge = () => {
    if (matchStatus === "matched") {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-xs">
          <Check className="h-3 w-3" /> Ταιριασμένο
        </Badge>
      );
    }
    if (matchStatus === "suggested" && transaction.confidence_score) {
      const pct = transaction.confidence_score * 100;
      const cls = pct >= 90
        ? "bg-green-50 text-green-700 border-green-200"
        : pct >= 70
          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
          : "bg-orange-50 text-orange-700 border-orange-200";
      return (
        <Badge variant="outline" className={cn(cls, "gap-1 text-xs")}>
          <AlertTriangle className="h-3 w-3" /> {pct.toFixed(0)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 gap-1 text-xs">
        <X className="h-3 w-3" /> Αταίριαστο
      </Badge>
    );
  };

  // ── Category badge ───────────────────────────────────────────────────────
  const getCategoryBadge = () => {
    switch (categoryType) {
      case "folder": {
        const pkg = packages.find(p => p.id === transaction.folder_id);
        return pkg ? (
          <Badge variant="secondary" className="rounded-md text-xs gap-1">
            <FolderOpen className="h-3 w-3" /> {pkg.client_name}
          </Badge>
        ) : null;
      }
      case "general_income":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-md text-xs gap-1">
            <ArrowUpCircle className="h-3 w-3" /> Γ. Έσοδα
          </Badge>
        );
      case "general_expense":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 rounded-md text-xs gap-1">
            <ArrowDownCircle className="h-3 w-3" /> Γ. Έξοδα
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      className="border-b border-slate-100 last:border-0"
      style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* ── Main row ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
          {/* Bank logo */}
          <BankLogo bankName={transaction.bank_name || null} size="md" />

          {/* Description + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm text-slate-800 truncate max-w-xs">
                {transaction.description}
              </p>
              {/* Bank name pill */}
              {transaction.bank_name && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5">
                  <Building2 className="h-3 w-3" />
                  {transaction.bank_name}
                </span>
              )}
              {getCategoryBadge()}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">
                {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
              </p>
              {transaction.notes && !isExpanded && (
                <span className="text-xs text-slate-400 italic truncate max-w-[120px]">
                  · {transaction.notes}
                </span>
              )}
            </div>
          </div>

          {/* Status badge (hidden on mobile) */}
          <div className="shrink-0 hidden sm:block">{getMatchBadge()}</div>

          {/* Amount */}
          <div className="text-right shrink-0 min-w-[90px]">
            <p className={cn(
              "font-semibold text-base tabular-nums",
              isIncome ? "text-emerald-600" : "text-rose-600"
            )}>
              {isIncome ? "+" : "-"}€{Math.abs(transaction.amount).toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-400">{isIncome ? "Πίστωση" : "Χρέωση"}</p>
          </div>

          {/* Expand toggle */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* ── Expanded panel ───────────────────────────────────────────── */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 bg-slate-50/70 border-t border-slate-100 space-y-4">

            {/* Bank info bar */}
            {transaction.bank_name && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 text-sm">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-slate-700">{transaction.bank_name}</span>
                  {transaction.bank_id && (
                    <span className="text-slate-400 ml-2 text-xs font-mono">ID: {transaction.bank_id}</span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {isIncome ? "Εισερχόμενο" : "Εξερχόμενο"}
                </Badge>
              </div>
            )}

            {/* AI Suggestions */}
            {suggestions.length > 0 && matchStatus !== "matched" && onApproveMatch && onRejectMatch && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Προτεινόμενες Αντιστοιχίσεις ({suggestions.length})
                </p>
                <div className="space-y-2">
                  {(showAllSuggestions ? suggestions : suggestions.slice(0, 1)).map(s => (
                    <MatchSuggestionCard
                      key={s.recordId}
                      suggestion={s}
                      onApprove={() => onApproveMatch(transaction.id, s.recordId, s.recordType)}
                      onReject={() => onRejectMatch(transaction.id)}
                      onSelectDifferent={() => setShowAllSuggestions(!showAllSuggestions)}
                    />
                  ))}
                </div>
                {suggestions.length > 1 && !showAllSuggestions && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllSuggestions(true)} className="text-xs text-slate-500">
                    +{suggestions.length - 1} ακόμα προτάσεις
                  </Button>
                )}
              </div>
            )}

            {/* Action grid */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ενέργειες</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

                {/* Link to invoice */}
                {onLinkToInvoice && matchStatus !== "matched" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLinkToInvoice(transaction.id)}
                    className="rounded-xl h-9 text-xs gap-1.5 bg-white border-slate-200 hover:border-blue-300 hover:text-blue-700"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Σύνδεση Παραστατικού
                  </Button>
                )}

                {/* General Income */}
                <Button
                  variant={categoryType === "general_income" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetCategoryType(transaction.id, "general_income")}
                  className={cn(
                    "rounded-xl h-9 text-xs gap-1.5",
                    categoryType === "general_income"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-white border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                  )}
                >
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Γενικά Έσοδα
                </Button>

                {/* General Expense */}
                <Button
                  variant={categoryType === "general_expense" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSetCategoryType(transaction.id, "general_expense")}
                  className={cn(
                    "rounded-xl h-9 text-xs gap-1.5",
                    categoryType === "general_expense"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-white border-slate-200 hover:border-rose-300 hover:text-rose-700"
                  )}
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  Γενικά Έξοδα
                </Button>

                {/* Create expense record */}
                {!isIncome && matchStatus !== "matched" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreatingExpense(!creatingExpense)}
                    className="rounded-xl h-9 text-xs gap-1.5 bg-white border-slate-200 hover:border-orange-300 hover:text-orange-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Νέο Έξοδο
                  </Button>
                )}

                {/* Link to folder */}
                <div className="col-span-2 sm:col-span-1">
                  <Select
                    value={transaction.folder_id || "none"}
                    onValueChange={v => {
                      if (v === "none") {
                        onLinkToPackage(transaction.id, null);
                      } else {
                        onLinkToPackage(transaction.id, v);
                        onSetCategoryType(transaction.id, "folder");
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs bg-white border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                        <SelectValue placeholder="Σύνδεση με Φάκελο" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Χωρίς φάκελο</SelectItem>
                      {packages.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* View source PDF */}
                {onViewSourcePDF && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSourcePDF(transaction.id)}
                    className="rounded-xl h-9 text-xs gap-1.5 bg-white border-slate-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Πηγή PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Create expense inline form */}
            {creatingExpense && (
              <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-3">
                <p className="text-xs font-semibold text-orange-700">Δημιουργία Νέου Εξόδου</p>
                <Input
                  placeholder="Περιγραφή εξόδου..."
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  className="rounded-xl text-sm"
                />
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger className="rounded-xl text-sm">
                    <SelectValue placeholder="Κατηγορία" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="other">Άλλο</SelectItem>
                    <SelectItem value="accommodation">Διαμονή</SelectItem>
                    <SelectItem value="transport">Μεταφορά</SelectItem>
                    <SelectItem value="food">Εστίαση</SelectItem>
                    <SelectItem value="fuel">Καύσιμα</SelectItem>
                    <SelectItem value="utilities">Κοινόχρηστα</SelectItem>
                    <SelectItem value="office">Γραφείο</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="insurance">Ασφάλεια</SelectItem>
                    <SelectItem value="tax">Φόρος</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setCreatingExpense(false)}>
                    Ακύρωση
                  </Button>
                  <Button size="sm" onClick={handleCreateExpense} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl">
                    Δημιουργία
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> Σημειώσεις
                </p>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)} className="h-6 px-2 text-xs text-slate-400">
                    <Pencil className="h-3 w-3 mr-1" /> Επεξεργασία
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    placeholder="Προσθέστε σημειώσεις..."
                    className="rounded-xl resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setNotesValue(transaction.notes || ""); setEditingNotes(false); }}>
                      Ακύρωση
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} className="rounded-xl">
                      Αποθήκευση
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 bg-white rounded-xl p-3 min-h-[40px] border border-slate-100">
                  {transaction.notes || "Δεν υπάρχουν σημειώσεις"}
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
