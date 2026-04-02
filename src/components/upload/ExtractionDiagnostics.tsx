import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Clock, Cpu, Brain, Copy, Check, RefreshCw, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DiagnosticsData {
  model?: string;
  duration_ms?: number;
  confidence?: number;
  raw_args?: string;
  is_fallback?: boolean;
  retry_count?: number;
  ocr_quality?: 'clear' | 'readable' | 'partial' | 'poor';
  ocr_issues?: string[];
}

const ocrQualityLabels: Record<string, { label: string; color: string; bg: string }> = {
  clear: { label: "Καθαρό", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  readable: { label: "Αναγνώσιμο", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  partial: { label: "Μερικώς αναγνώσιμο", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  poor: { label: "Κακή ποιότητα", color: "text-destructive", bg: "bg-red-100 dark:bg-red-900/30" },
};

const ocrIssueLabels: Record<string, string> = {
  blurry_text: "Θολό κείμενο",
  skewed: "Στραβό",
  low_contrast: "Χαμηλή αντίθεση",
  faded_ink: "Ξεθωριασμένο",
  partial_crop: "Κομμένο",
  handwritten: "Χειρόγραφο",
  stamp_overlay: "Σφραγίδα",
  small_font: "Μικρή γραμματοσειρά",
};

interface ExtractionDiagnosticsProps {
  diagnostics: DiagnosticsData | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ExtractionDiagnostics({
  diagnostics,
  onRetry,
  isRetrying,
}: ExtractionDiagnosticsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!diagnostics) return null;

  const { model, duration_ms, confidence, raw_args, is_fallback, retry_count } = diagnostics;

  const confidenceColor =
    confidence === undefined ? "text-muted-foreground" :
    confidence >= 0.8 ? "text-emerald-600" :
    confidence >= 0.6 ? "text-amber-600" : "text-destructive";

  const confidenceBg =
    confidence === undefined ? "bg-muted" :
    confidence >= 0.8 ? "bg-emerald-100 dark:bg-emerald-900/30" :
    confidence >= 0.6 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30";

  const handleCopy = async () => {
    if (raw_args) {
      await navigator.clipboard.writeText(raw_args);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border border-border rounded-xl bg-muted/30 text-sm">
      {/* Header - always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium">AI Diagnostics</span>
        </div>

        <div className="flex items-center gap-3">
          {retry_count !== undefined && retry_count > 0 && (
            <Badge variant="outline" className="text-xs">
              Retry #{retry_count}
            </Badge>
          )}
          {is_fallback && (
            <Badge variant="secondary" className="text-xs">
              Fallback Mode
            </Badge>
          )}
          {confidence !== undefined && (
            <Badge className={cn("text-xs", confidenceBg, confidenceColor)}>
              {Math.round(confidence * 100)}% confidence
            </Badge>
          )}
          {duration_ms !== undefined && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded-lg bg-background border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Cpu className="h-3 w-3" />
                    Model
                  </div>
                  <p className="font-mono text-xs truncate" title={model}>
                    {model || "unknown"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-background border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    Duration
                  </div>
                  <p className="font-mono text-xs">
                    {duration_ms !== undefined ? `${duration_ms}ms` : "–"}
                  </p>
                </div>
                <div className={cn("p-2 rounded-lg border", confidenceBg)}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Brain className="h-3 w-3" />
                    Confidence
                  </div>
                  <p className={cn("font-mono text-xs font-semibold", confidenceColor)}>
                    {confidence !== undefined ? `${Math.round(confidence * 100)}%` : "–"}
                  </p>
                </div>
              </div>

              {/* Raw response */}
              {raw_args && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Raw AI Response</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="p-2 rounded-lg bg-background border text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(raw_args), null, 2);
                      } catch {
                        return raw_args;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {/* Retry button */}
              {onRetry && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="rounded-lg"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Retry with Pro Model
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
