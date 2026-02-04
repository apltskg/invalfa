import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, Check, AlertTriangle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BankLogo, SUPPORTED_BANKS } from "./BankLogo";
import { ExtractionProgress } from "@/components/upload/ExtractionProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
}

interface BankPDFUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ExtractionStage = "idle" | "uploading" | "extracting" | "complete";

export function BankPDFUploadModal({ open, onOpenChange, onSuccess }: BankPDFUploadModalProps) {
  const [stage, setStage] = useState<ExtractionStage>("idle");
  const [autoDetect, setAutoDetect] = useState(true);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [detectedBank, setDetectedBank] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedRows, setExtractedRows] = useState<ExtractedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [statementId, setStatementId] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  const resetState = () => {
    setStage("idle");
    setAutoDetect(true);
    setSelectedBank("");
    setDetectedBank(null);
    setSelectedFile(null);
    setExtractedRows([]);
    setStatementId(null);
    setFilePath(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Get the effective bank (detected or selected)
  const effectiveBank = detectedBank || selectedBank;

  const handleExtract = async () => {
    if (!selectedFile) {
      toast.error("Επιλέξτε αρχείο PDF");
      return;
    }

    if (!autoDetect && !selectedBank) {
      toast.error("Επιλέξτε τράπεζα");
      return;
    }

    setStage("uploading");
    setDetectedBank(null);

    try {
      // 1. Upload PDF to storage (use temp path first if auto-detect)
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Upload to temp path first
      const tempPath = `temp/${uniqueId}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("bank-statements")
        .upload(tempPath, selectedFile);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      setFilePath(tempPath);
      setStage("extracting");

      // 2. Call extraction edge function
      const { data, error } = await supabase.functions.invoke("extract-bank-pdf", {
        body: { filePath: tempPath, fileName: selectedFile.name },
      });

      if (error) {
        throw new Error("Extraction failed");
      }

      // 3. Handle detected bank
      let finalBankName = selectedBank;
      if (autoDetect && data?.detected_bank) {
        setDetectedBank(data.detected_bank);
        finalBankName = data.detected_bank;
        toast.success(`Αναγνωρίστηκε: ${SUPPORTED_BANKS.find(b => b.value === data.detected_bank)?.label || data.detected_bank}`);
      } else if (autoDetect && !data?.detected_bank && !selectedBank) {
        // Couldn't detect, need manual selection
        toast.warning("Δεν αναγνωρίστηκε η τράπεζα - παρακαλώ επιλέξτε χειροκίνητα");
      }

      // 4. Move file to proper location if we have a bank
      if (finalBankName) {
        const finalPath = `${finalBankName}/${currentMonth}/${uniqueId}.${fileExt}`;
        
        // Move file by copying and deleting (Supabase doesn't have move)
        const { error: copyError } = await supabase.storage
          .from("bank-statements")
          .copy(tempPath, finalPath);

        if (!copyError) {
          await supabase.storage.from("bank-statements").remove([tempPath]);
          setFilePath(finalPath);

          // 5. Create bank_statement record
          const { data: bankData } = await supabase
            .from("banks")
            .select("id")
            .eq("name", finalBankName)
            .single();

          const { data: statementData, error: statementError } = await supabase
            .from("bank_statements")
            .insert({
              bank_id: bankData?.id || null,
              bank_name: finalBankName,
              file_path: finalPath,
              file_name: selectedFile.name,
              statement_month: currentMonth,
              transaction_count: data?.transactions?.length || 0,
            })
            .select("id")
            .single();

          if (!statementError) {
            setStatementId(statementData?.id || null);
          }
        }
      }

      if (data?.transactions && Array.isArray(data.transactions)) {
        setExtractedRows(data.transactions);
        if (data.transactions.length === 0) {
          toast.warning("Δεν βρέθηκαν κινήσεις στο PDF");
        }
      } else {
        toast.warning("Δεν ήταν δυνατή η εξαγωγή κινήσεων");
      }

      setStage("complete");
    } catch (err) {
      console.error("PDF processing error:", err);
      toast.error("Αποτυχία επεξεργασίας PDF");
      setStage("idle");
    }
  };

  const handleImport = async () => {
    if (extractedRows.length === 0) return;

    const bankToUse = effectiveBank;
    if (!bankToUse) {
      toast.error("Επιλέξτε τράπεζα πριν την εισαγωγή");
      return;
    }

    setImporting(true);

    try {
      const { data: bankData } = await supabase
        .from("banks")
        .select("id")
        .eq("name", bankToUse)
        .single();

      const toInsert = extractedRows.map((r) => ({
        transaction_date: r.date,
        description: r.description,
        amount: r.amount,
        bank_id: bankData?.id || null,
        bank_name: bankToUse,
        statement_id: statementId,
        match_status: "unmatched",
        category_type: "unmatched",
      }));

      const { error } = await supabase.from("bank_transactions").insert(toInsert);

      if (error) {
        throw error;
      }

      toast.success(`Εισήχθησαν ${toInsert.length} κινήσεις`);
      handleClose();
      onSuccess();
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(`Αποτυχία εισαγωγής: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Εισαγωγή PDF Τράπεζας
          </DialogTitle>
          <DialogDescription>
            {autoDetect 
              ? "Ανεβάστε το PDF και το AI θα αναγνωρίσει αυτόματα την τράπεζα και τις κινήσεις."
              : "Επιλέξτε τράπεζα και ανεβάστε το PDF για αυτόματη εξαγωγή κινήσεων."}
          </DialogDescription>
        </DialogHeader>

        {stage === "idle" && (
          <div className="space-y-6 py-4">
            {/* Auto-detect toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="auto-detect" className="font-medium">Αυτόματη Αναγνώριση Τράπεζας</Label>
                  <p className="text-xs text-muted-foreground">Το AI θα αναγνωρίσει την τράπεζα από το PDF</p>
                </div>
              </div>
              <Switch 
                id="auto-detect"
                checked={autoDetect} 
                onCheckedChange={setAutoDetect} 
              />
            </div>

            {/* Bank Selection (if not auto-detect) */}
            {!autoDetect && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Επιλέξτε Τράπεζα</label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Επιλέξτε τράπεζα..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_BANKS.map((bank) => (
                      <SelectItem key={bank.value} value={bank.value}>
                        <div className="flex items-center gap-2">
                          <BankLogo bankName={bank.value} size="sm" />
                          <span>{bank.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="font-medium">{selectedFile.name}</p>
                  <Badge variant="secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Badge>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {isDragActive ? "Αφήστε το αρχείο εδώ" : "Σύρετε ή κάντε κλικ για επιλογή PDF"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Υποστηρίζεται μόνο PDF
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {(stage === "uploading" || stage === "extracting") && (
          <div className="py-8">
            <ExtractionProgress stage={stage} fileName={selectedFile?.name} />
          </div>
        )}

        {stage === "complete" && (
          <div className="space-y-4">
            {extractedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <p className="text-muted-foreground">Δεν βρέθηκαν κινήσεις στο PDF.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {effectiveBank ? (
                      <>
                        <BankLogo bankName={effectiveBank} size="md" />
                        <span className="font-medium">
                          {SUPPORTED_BANKS.find((b) => b.value === effectiveBank)?.label}
                        </span>
                        {detectedBank && (
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            Αναγνωρίστηκε
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-600 font-medium">Επιλέξτε τράπεζα για εισαγωγή</p>
                        <Select value={selectedBank} onValueChange={setSelectedBank}>
                          <SelectTrigger className="rounded-xl w-[200px]">
                            <SelectValue placeholder="Επιλέξτε τράπεζα..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_BANKS.map((bank) => (
                              <SelectItem key={bank.value} value={bank.value}>
                                <div className="flex items-center gap-2">
                                  <BankLogo bankName={bank.value} size="sm" />
                                  <span>{bank.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary">{extractedRows.length} κινήσεις</Badge>
                </div>

                <div className="max-h-80 overflow-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 font-medium">Ημερομηνία</th>
                        <th className="text-left p-3 font-medium">Περιγραφή</th>
                        <th className="text-right p-3 font-medium">Ποσό</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {extractedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{row.date}</td>
                          <td className="p-3 truncate max-w-xs">{row.description}</td>
                          <td
                            className={cn(
                              "p-3 text-right font-medium",
                              row.amount > 0 ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {row.amount > 0 ? "+" : ""}€{row.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Ακύρωση
          </Button>

          {stage === "idle" && (
            <Button
              onClick={handleExtract}
              disabled={!selectedFile || (!autoDetect && !selectedBank)}
              className="rounded-xl gap-2"
            >
              <FileText className="h-4 w-4" />
              Εξαγωγή Κινήσεων
            </Button>
          )}

          {stage === "complete" && extractedRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || !effectiveBank}
              className="rounded-xl gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Εισαγωγή...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Εισαγωγή {extractedRows.length} Κινήσεων
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
