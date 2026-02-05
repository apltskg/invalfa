import { useState, useMemo } from "react";
import { Check, AlertTriangle, Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MatchSuggestion, getConfidenceStyles } from "@/lib/matching-engine";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TransactionWithSuggestion {
  transaction: {
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    bank_name?: string | null;
  };
  suggestion: MatchSuggestion;
}

interface BulkMatchingViewProps {
  suggestions: TransactionWithSuggestion[];
  onApproveMatch: (txnId: string, recordId: string, recordType: string) => Promise<void>;
  onRejectMatch: (txnId: string) => Promise<void>;
  onClose: () => void;
}

export function BulkMatchingView({
  suggestions,
  onApproveMatch,
  onRejectMatch,
  onClose,
}: BulkMatchingViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAutoApproveDialog, setShowAutoApproveDialog] = useState(false);
  
  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    if (confidenceFilter === "all") return suggestions;
    return suggestions.filter(s => s.suggestion.confidenceLevel === confidenceFilter);
  }, [suggestions, confidenceFilter]);
  
  // Stats
  const stats = useMemo(() => {
    const high = suggestions.filter(s => s.suggestion.confidenceLevel === 'high').length;
    const medium = suggestions.filter(s => s.suggestion.confidenceLevel === 'medium').length;
    const low = suggestions.filter(s => s.suggestion.confidenceLevel === 'low').length;
    return { high, medium, low, total: suggestions.length };
  }, [suggestions]);
  
  const toggleSelection = (txnId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(txnId)) {
      newSelected.delete(txnId);
    } else {
      newSelected.add(txnId);
    }
    setSelectedIds(newSelected);
  };
  
  const selectAll = () => {
    setSelectedIds(new Set(filteredSuggestions.map(s => s.transaction.id)));
  };
  
  const selectNone = () => {
    setSelectedIds(new Set());
  };
  
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast.error("Επιλέξτε τουλάχιστον μία συναλλαγή");
      return;
    }
    
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const txnId of selectedIds) {
      const item = suggestions.find(s => s.transaction.id === txnId);
      if (item) {
        try {
          await onApproveMatch(
            txnId, 
            item.suggestion.recordId, 
            item.suggestion.recordType
          );
          successCount++;
        } catch {
          errorCount++;
        }
      }
    }
    
    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} αντιστοιχίσεις εγκρίθηκαν`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} αντιστοιχίσεις απέτυχαν`);
    }
    
    setSelectedIds(new Set());
  };
  
  const handleAutoApproveHigh = async () => {
    setShowAutoApproveDialog(false);
    setIsProcessing(true);
    
    const highConfidence = suggestions.filter(s => s.suggestion.confidenceLevel === 'high');
    let successCount = 0;
    
    for (const item of highConfidence) {
      try {
        await onApproveMatch(
          item.transaction.id,
          item.suggestion.recordId,
          item.suggestion.recordType
        );
        successCount++;
      } catch {
        // Continue with others
      }
    }
    
    setIsProcessing(false);
    toast.success(`${successCount} υψηλής εμπιστοσύνης αντιστοιχίσεις εγκρίθηκαν`);
  };
  
  if (suggestions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-semibold">Όλες οι συναλλαγές ταιριασμένες!</h3>
        <p className="text-muted-foreground mt-2">
          Δεν υπάρχουν προτεινόμενες αντιστοιχίσεις προς έλεγχο.
        </p>
        <Button onClick={onClose} className="mt-4">
          Κλείσιμο
        </Button>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Σύνολο</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex gap-3">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                {stats.high} Υψηλή
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                {stats.medium} Μέτρια
              </Badge>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                {stats.low} Χαμηλή
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            {stats.high > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowAutoApproveDialog(true)}
                disabled={isProcessing}
                className="gap-2 rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                Αυτόματη έγκριση υψηλών
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {/* Filters and Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Φίλτρο" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλα τα επίπεδα</SelectItem>
              <SelectItem value="high">Υψηλή εμπιστοσύνη</SelectItem>
              <SelectItem value="medium">Μέτρια εμπιστοσύνη</SelectItem>
              <SelectItem value="low">Χαμηλή εμπιστοσύνη</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="text-sm text-muted-foreground">
            {filteredSuggestions.length} εγγραφές
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Επιλογή όλων
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>
            Καμία επιλογή
          </Button>
          <Button 
            size="sm" 
            onClick={handleBulkApprove}
            disabled={selectedIds.size === 0 || isProcessing}
            className="rounded-xl gap-2"
          >
            <Check className="h-4 w-4" />
            Έγκριση επιλεγμένων ({selectedIds.size})
          </Button>
        </div>
      </div>
      
      {/* Suggestions List */}
      <Card className="rounded-2xl overflow-hidden divide-y">
        {filteredSuggestions.map(({ transaction, suggestion }) => {
          const styles = getConfidenceStyles(suggestion.confidenceLevel);
          const isSelected = selectedIds.has(transaction.id);
          
          return (
            <div
              key={transaction.id}
              className={cn(
                "p-4 transition-colors",
                isSelected && "bg-primary/5"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelection(transaction.id)}
                  className="mt-1"
                />
                
                {/* Transaction Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{transaction.description}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("shrink-0", styles.textClass, styles.borderClass)}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{format(new Date(transaction.transaction_date), "d MMM yyyy", { locale: el })}</span>
                    <span className={transaction.amount > 0 ? "text-emerald-600" : "text-rose-600"}>
                      €{Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Suggested Match */}
                  <div className={cn("mt-2 p-2 rounded-lg border", styles.borderClass, styles.bgClass)}>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">→</span>
                      {suggestion.record.invoice_number && (
                        <span className="font-medium">{suggestion.record.invoice_number}</span>
                      )}
                      {suggestion.record.vendor_or_client && (
                        <span className="text-muted-foreground">{suggestion.record.vendor_or_client}</span>
                      )}
                      {suggestion.record.amount && (
                        <span className="font-semibold">€{Math.abs(suggestion.record.amount).toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.reasons.map((reason, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs px-2 py-0.5 rounded-full bg-background/50 text-muted-foreground"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
      
      {/* Auto-approve Dialog */}
      <AlertDialog open={showAutoApproveDialog} onOpenChange={setShowAutoApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αυτόματη έγκριση υψηλής εμπιστοσύνης</AlertDialogTitle>
            <AlertDialogDescription>
              Θα εγκριθούν αυτόματα {stats.high} αντιστοιχίσεις με εμπιστοσύνη 90%+.
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoApproveHigh}>
              Έγκριση {stats.high} αντιστοιχίσεων
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
