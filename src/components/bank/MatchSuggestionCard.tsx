import { Check, X, RefreshCw, FileText, User, Calendar, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MatchSuggestion, getConfidenceStyles } from "@/lib/matching-engine";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MatchSuggestionCardProps {
  suggestion: MatchSuggestion;
  onApprove: () => void;
  onReject: () => void;
  onSelectDifferent: () => void;
  isLoading?: boolean;
}

export function MatchSuggestionCard({
  suggestion,
  onApprove,
  onReject,
  onSelectDifferent,
  isLoading = false,
}: MatchSuggestionCardProps) {
  const styles = getConfidenceStyles(suggestion.confidenceLevel);
  const { record } = suggestion;
  
  const confidencePercent = Math.round(suggestion.confidence * 100);
  
  return (
    <Card className={cn("p-3 border-2", styles.borderClass, styles.bgClass)}>
      <div className="flex items-start justify-between gap-3">
        {/* Match Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn("font-bold", styles.textClass, styles.borderClass)}
            >
              {confidencePercent}% {suggestion.confidenceLevel === 'high' ? 'Υψηλή' : suggestion.confidenceLevel === 'medium' ? 'Μέτρια' : 'Χαμηλή'}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {record.type === 'invoice' ? 'Τιμολόγιο' : record.type === 'income' ? 'Έσοδο' : 'Έξοδο'}
            </Badge>
          </div>
          
          {/* Record Info */}
          <div className="space-y-1 text-sm">
            {record.invoice_number && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className="font-medium">{record.invoice_number}</span>
              </div>
            )}
            {record.vendor_or_client && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">{record.vendor_or_client}</span>
              </div>
            )}
            {record.date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(record.date), "d MMM yyyy", { locale: el })}</span>
              </div>
            )}
            {record.amount && (
              <div className="flex items-center gap-2 font-semibold">
                <Euro className="h-3.5 w-3.5" />
                <span>€{Math.abs(record.amount).toFixed(2)}</span>
              </div>
            )}
          </div>
          
          {/* Match Reasons */}
          <div className="flex flex-wrap gap-1">
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
        
        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isLoading}
            className="gap-1 rounded-xl bg-green-600 hover:bg-green-700"
          >
            <Check className="h-3.5 w-3.5" />
            Έγκριση
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
            className="gap-1 rounded-xl"
          >
            <X className="h-3.5 w-3.5" />
            Απόρριψη
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectDifferent}
            disabled={isLoading}
            className="gap-1 rounded-xl text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            Άλλο
          </Button>
        </div>
      </div>
    </Card>
  );
}
