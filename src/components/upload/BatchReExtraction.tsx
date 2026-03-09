import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runExtractionWithRetry } from "@/lib/extraction-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LowConfidenceInvoice {
  id: string;
  file_path: string;
  file_name: string;
  merchant: string | null;
  amount: number | null;
  confidence: number;
  status: "pending" | "processing" | "success" | "failed";
  newConfidence?: number;
}

interface BatchReExtractionProps {
  confidenceThreshold?: number;
  onComplete?: () => void;
}

export function BatchReExtraction({
  confidenceThreshold = 0.6,
  onComplete,
}: BatchReExtractionProps) {
  const [invoices, setInvoices] = useState<LowConfidenceInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ improved: 0, failed: 0, total: 0 });

  useEffect(() => {
    fetchLowConfidenceInvoices();
  }, []);

  async function fetchLowConfidenceInvoices() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, file_path, file_name, merchant, amount, extracted_data")
        .not("file_path", "like", "manual/%")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lowConf = (data || [])
        .filter((inv) => {
          if (!inv.extracted_data) return true;
          const ed = inv.extracted_data as any;
          const conf = ed?.confidence ?? ed?.extracted?.confidence ?? 0;
          return conf < confidenceThreshold;
        })
        .map((inv) => {
          const ed = inv.extracted_data as any;
          const conf = ed?.confidence ?? ed?.extracted?.confidence ?? 0;
          return {
            id: inv.id,
            file_path: inv.file_path,
            file_name: inv.file_name,
            merchant: inv.merchant,
            amount: inv.amount,
            confidence: conf,
            status: "pending" as const,
          };
        });

      setInvoices(lowConf);
      setStats({ improved: 0, failed: 0, total: lowConf.length });
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Αποτυχία φόρτωσης τιμολογίων");
    } finally {
      setLoading(false);
    }
  }

  async function runBatchExtraction() {
    if (invoices.length === 0) return;
    setRunning(true);
    setCurrentIndex(0);
    let improved = 0;
    let failed = 0;

    for (let i = 0; i < invoices.length; i++) {
      setCurrentIndex(i);
      setInvoices((prev) =>
        prev.map((inv, idx) =>
          idx === i ? { ...inv, status: "processing" } : inv
        )
      );

      try {
        const result = await runExtractionWithRetry({
          filePath: invoices[i].file_path,
          fileName: invoices[i].file_name,
          fallbackMode: true,
          maxRetries: 1,
        });

        const newConf = result.diagnostics?.confidence ?? result.extracted?.confidence as number ?? 0;

        if (result.extracted && newConf > invoices[i].confidence) {
          // Update the invoice with better data
          const extracted = result.extracted as any;
          await supabase
            .from("invoices")
            .update({
              extracted_data: extracted,
              merchant: extracted.merchant || invoices[i].merchant,
              amount: typeof extracted.amount === "number" ? extracted.amount : invoices[i].amount,
              invoice_date: extracted.date || undefined,
            })
            .eq("id", invoices[i].id);

          improved++;
          setInvoices((prev) =>
            prev.map((inv, idx) =>
              idx === i ? { ...inv, status: "success", newConfidence: newConf } : inv
            )
          );
        } else {
          failed++;
          setInvoices((prev) =>
            prev.map((inv, idx) =>
              idx === i ? { ...inv, status: "failed", newConfidence: newConf } : inv
            )
          );
        }
      } catch {
        failed++;
        setInvoices((prev) =>
          prev.map((inv, idx) =>
            idx === i ? { ...inv, status: "failed" } : inv
          )
        );
      }

      setStats({ improved, failed, total: invoices.length });

      // Small delay between requests to avoid rate limits
      if (i < invoices.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setRunning(false);
    toast.success(
      `Ολοκληρώθηκε: ${improved} βελτιώθηκαν, ${failed} απέτυχαν`,
      { duration: 5000 }
    );
    onComplete?.();
  }

  const progress = running
    ? Math.round(((currentIndex + 1) / invoices.length) * 100)
    : 0;

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Μαζική Επανεξαγωγή AI</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Επανεπεξεργασία τιμολογίων με χαμηλή ακρίβεια ({`<${Math.round(confidenceThreshold * 100)}%`}) με Pro model
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {invoices.length} τιμολόγια
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium">Όλα τα τιμολόγια έχουν καλή ακρίβεια!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Δεν υπάρχουν τιμολόγια με confidence κάτω από {Math.round(confidenceThreshold * 100)}%
            </p>
          </div>
        ) : (
          <>
            {/* Progress bar when running */}
            {running && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Επεξεργασία {currentIndex + 1} / {invoices.length}
                  </span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Stats summary when done */}
            {!running && stats.improved + stats.failed > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 border text-center">
                  <p className="text-lg font-semibold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Σύνολο</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-lg font-semibold text-emerald-600">{stats.improved}</p>
                  <p className="text-xs text-emerald-600/70">Βελτιώθηκαν</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-center">
                  <p className="text-lg font-semibold text-destructive">{stats.failed}</p>
                  <p className="text-xs text-destructive/70">Απέτυχαν</p>
                </div>
              </div>
            )}

            {/* Invoice list */}
            <div className="max-h-[320px] overflow-y-auto space-y-1.5 rounded-xl border p-2 bg-muted/20">
              <AnimatePresence>
                {invoices.map((inv, i) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      inv.status === "processing" && "bg-primary/5 border border-primary/20",
                      inv.status === "success" && "bg-emerald-50 dark:bg-emerald-950/20",
                      inv.status === "failed" && "bg-red-50 dark:bg-red-950/20",
                      inv.status === "pending" && "bg-background"
                    )}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {inv.status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : inv.status === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : inv.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">
                        {inv.merchant || inv.file_name}
                      </p>
                      {inv.amount !== null && (
                        <p className="text-[10px] text-muted-foreground">
                          €{inv.amount.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Confidence change */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-mono",
                          inv.confidence < 0.3
                            ? "border-destructive/30 text-destructive"
                            : "border-amber-500/30 text-amber-600"
                        )}
                      >
                        {Math.round(inv.confidence * 100)}%
                      </Badge>
                      {inv.newConfidence !== undefined && (
                        <>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-mono",
                              inv.newConfidence >= 0.8
                                ? "border-emerald-500/30 text-emerald-600"
                                : inv.newConfidence >= 0.6
                                ? "border-amber-500/30 text-amber-600"
                                : "border-destructive/30 text-destructive"
                            )}
                          >
                            {Math.round(inv.newConfidence * 100)}%
                          </Badge>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Action button */}
            <Button
              onClick={runBatchExtraction}
              disabled={running || invoices.length === 0}
              className="w-full rounded-xl"
              size="lg"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Επεξεργασία... ({currentIndex + 1}/{invoices.length})
                </>
              ) : stats.improved + stats.failed > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Επανάληψη Εξαγωγής
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Εκκίνηση Μαζικής Εξαγωγής ({invoices.length} αρχεία)
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
