import { useState } from "react";
import { Check, AlertTriangle, X, FileText, ChevronDown, ChevronUp, Pencil, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { BankLogo, getBankBorderColor } from "./BankLogo";
import { MatchSuggestionCard } from "./MatchSuggestionCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { MatchSuggestion } from "@/lib/matching-engine";

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
    match_status?: string;
    category_type?: string;
    folder_id?: string | null;
    notes?: string | null;
    confidence_score?: number | null;
  };
  packages: Package[];
  onLinkToPackage: (txnId: string, packageId: string | null) => void;
  onSetCategoryType: (txnId: string, type: string) => void;
  onUpdateNotes: (txnId: string, notes: string) => void;
  onViewSourcePDF?: (txnId: string) => void;
  onApproveMatch?: (txnId: string, recordId: string, recordType: string) => void;
  onRejectMatch?: (txnId: string) => void;
  onLinkToInvoice?: (txnId: string) => void;
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
  suggestions = [],
  index,
}: TransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(transaction.notes || "");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const borderColor = getBankBorderColor(transaction.bank_name || null);
  const isIncome = transaction.amount > 0;
  const matchStatus = transaction.match_status || "unmatched";
  const categoryType = transaction.category_type || "unmatched";

  const getMatchBadge = () => {
    if (matchStatus === "matched") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
          <Check className="h-3 w-3" /> Ταιριασμένο
        </Badge>
      );
    }
    if (matchStatus === "suggested" && transaction.confidence_score) {
      const confidence = transaction.confidence_score * 100;
      const badgeColor =
        confidence >= 90
          ? "bg-green-50 text-green-700 border-green-200"
          : confidence >= 70
            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
            : "bg-orange-50 text-orange-700 border-orange-200";
      return (
        <Badge variant="outline" className={cn(badgeColor, "gap-1")}>
          <AlertTriangle className="h-3 w-3" /> {confidence.toFixed(0)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
        <X className="h-3 w-3" /> Χωρίς αντιστοίχιση
      </Badge>
    );
  };

  const getCategoryBadge = () => {
    switch (categoryType) {
      case "folder":
        const pkg = packages.find((p) => p.id === transaction.folder_id);
        return pkg ? (
          <Badge variant="secondary" className="rounded-lg">
            📁 {pkg.client_name}
          </Badge>
        ) : null;
      case "general_income":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-lg">
            Γενικά Έσοδα
          </Badge>
        );
      case "general_expense":
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 rounded-lg">
            Γενικά Έξοδα
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(transaction.id, notesValue);
    setEditingNotes(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="border-b border-border"
      style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors">
          {/* Bank Logo */}
          <BankLogo bankName={transaction.bank_name || null} size="md" />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate max-w-xs">{transaction.description}</p>
              {getCategoryBadge()}
              {transaction.notes && !isExpanded && (
                <span className="text-xs text-muted-foreground italic truncate max-w-[100px]">
                  📝 {transaction.notes}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(transaction.transaction_date), "dd/MM/yyyy")}
            </p>
          </div>

          {/* Match Status */}
          <div className="shrink-0 hidden sm:block">{getMatchBadge()}</div>

          {/* Amount */}
          <div className="text-right shrink-0 min-w-[80px] sm:min-w-[100px]">
            <p
              className={cn(
                "font-semibold text-lg",
                isIncome ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {isIncome ? "+" : "-"}€{Math.abs(transaction.amount).toFixed(2)}
            </p>
          </div>

          {/* Expand Button */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 bg-muted/20 space-y-4">
            {/* Match Suggestions */}
            {suggestions.length > 0 && matchStatus !== 'matched' && onApproveMatch && onRejectMatch && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Προτεινόμενες Αντιστοιχίσεις ({suggestions.length})
                </label>
                <div className="space-y-2">
                  {(showAllSuggestions ? suggestions : suggestions.slice(0, 1)).map((suggestion) => (
                    <MatchSuggestionCard
                      key={suggestion.recordId}
                      suggestion={suggestion}
                      onApprove={() => onApproveMatch(transaction.id, suggestion.recordId, suggestion.recordType)}
                      onReject={() => onRejectMatch(transaction.id)}
                      onSelectDifferent={() => setShowAllSuggestions(!showAllSuggestions)}
                    />
                  ))}
                </div>
                {suggestions.length > 1 && !showAllSuggestions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllSuggestions(true)}
                    className="text-xs text-muted-foreground"
                  >
                    +{suggestions.length - 1} ακόμα προτάσεις
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Assign to Folder */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Σύνδεση με Φάκελο
                </label>
                <Select
                  value={transaction.folder_id || "none"}
                  onValueChange={(v) => {
                    if (v === "none") {
                      onLinkToPackage(transaction.id, null);
                    } else {
                      onLinkToPackage(transaction.id, v);
                      onSetCategoryType(transaction.id, "folder");
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Επιλέξτε φάκελο..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Καμία σύνδεση</SelectItem>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Assign Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Γρήγορες Ενέργειες
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={categoryType === "general_income" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSetCategoryType(transaction.id, "general_income")}
                    className="rounded-xl h-8 text-xs"
                  >
                    Γ. Έσοδα
                  </Button>
                  <Button
                    variant={categoryType === "general_expense" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSetCategoryType(transaction.id, "general_expense")}
                    className="rounded-xl h-8 text-xs"
                  >
                    Γ. Έξοδα
                  </Button>
                  {onLinkToInvoice && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLinkToInvoice(transaction.id)}
                      className="col-span-2 rounded-xl h-8 text-xs gap-2"
                    >
                      <Link2 className="h-3 w-3" />
                      Σύνδεση με Παραστατικό
                    </Button>
                  )}
                </div>
              </div>

              {/* Source PDF */}
              {onViewSourcePDF && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Πηγή
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSourcePDF(transaction.id)}
                    className="w-full rounded-xl gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Προβολή PDF
                  </Button>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Σημειώσεις
                </label>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Επεξεργασία
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Προσθέστε σημειώσεις..."
                    className="rounded-xl resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNotesValue(transaction.notes || "");
                        setEditingNotes(false);
                      }}
                    >
                      Ακύρωση
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes}>
                      Αποθήκευση
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-background rounded-xl p-3 min-h-[40px]">
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
