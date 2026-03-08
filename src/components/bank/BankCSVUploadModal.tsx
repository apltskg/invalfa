import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, Loader2, Check, AlertTriangle } from "lucide-react";
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
import { BankLogo, SUPPORTED_BANKS } from "./BankLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
}

interface BankCSVUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Try to parse a Greek or ISO date into YYYY-MM-DD
function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const trimmed = raw.trim();
  
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }
  
  // YYYY-MM-DD already
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return trimmed.substring(0, 10);
  
  // Try native Date parsing as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  
  return new Date().toISOString().split("T")[0];
}

// Parse Greek number format: 1.234,56 → 1234.56
function normalizeAmount(raw: string): number {
  if (!raw) return 0;
  let cleaned = raw.trim().replace(/[€\s]/g, "");
  
  // Check if it uses Greek format (comma as decimal)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.234,56 → remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    // 1234,56 → replace comma with dot
    cleaned = cleaned.replace(",", ".");
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Auto-detect CSV column mapping
function detectColumns(headers: string[]): { dateCol: number; descCol: number; amountCol: number; creditCol: number; debitCol: number } {
  const lower = headers.map(h => h.toLowerCase().trim());
  
  let dateCol = -1, descCol = -1, amountCol = -1, creditCol = -1, debitCol = -1;
  
  for (let i = 0; i < lower.length; i++) {
    const h = lower[i];
    if (dateCol === -1 && (h.includes("date") || h.includes("ημερομ") || h.includes("ημ/νία") || h === "ημ.")) dateCol = i;
    if (descCol === -1 && (h.includes("description") || h.includes("περιγραφ") || h.includes("αιτιολ") || h.includes("details"))) descCol = i;
    if (amountCol === -1 && (h === "amount" || h === "ποσό" || h === "ποσο")) amountCol = i;
    if (creditCol === -1 && (h.includes("credit") || h.includes("πίστωσ") || h.includes("πιστωσ"))) creditCol = i;
    if (debitCol === -1 && (h.includes("debit") || h.includes("χρέωσ") || h.includes("χρεωσ"))) debitCol = i;
  }
  
  // Fallback: first 3 columns
  if (dateCol === -1) dateCol = 0;
  if (descCol === -1) descCol = Math.min(1, headers.length - 1);
  if (amountCol === -1 && creditCol === -1 && debitCol === -1) amountCol = Math.min(2, headers.length - 1);
  
  return { dateCol, descCol, amountCol, creditCol, debitCol };
}

export function BankCSVUploadModal({ open, onOpenChange, onSuccess }: BankCSVUploadModalProps) {
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      parseCSV(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "application/vnd.ms-excel": [".csv"] },
    maxFiles: 1,
    multiple: false,
  });

  const resetState = () => {
    setSelectedBank("");
    setSelectedFile(null);
    setParsedRows([]);
    setParsed(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  function parseCSV(file: File) {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const rows = results.data as string[][];
        if (rows.length < 2) {
          toast.error("Το CSV δεν περιέχει αρκετά δεδομένα");
          return;
        }

        const headers = rows[0];
        const { dateCol, descCol, amountCol, creditCol, debitCol } = detectColumns(headers);
        
        const transactions: ParsedTransaction[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;
          
          const date = normalizeDate(row[dateCol] || "");
          const description = (row[descCol] || "").trim();
          
          let amount = 0;
          if (amountCol >= 0 && row[amountCol]) {
            amount = normalizeAmount(row[amountCol]);
          } else if (creditCol >= 0 || debitCol >= 0) {
            const credit = creditCol >= 0 ? normalizeAmount(row[creditCol] || "") : 0;
            const debit = debitCol >= 0 ? normalizeAmount(row[debitCol] || "") : 0;
            amount = credit > 0 ? credit : -Math.abs(debit);
          }
          
          if (!description && amount === 0) continue;
          
          transactions.push({ date, description, amount });
        }
        
        setParsedRows(transactions);
        setParsed(true);
        
        if (transactions.length === 0) {
          toast.warning("Δεν βρέθηκαν κινήσεις στο CSV");
        } else {
          toast.success(`Βρέθηκαν ${transactions.length} κινήσεις`);
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Σφάλμα ανάγνωσης CSV");
      },
    });
  }

  const handleImport = async () => {
    if (parsedRows.length === 0 || !selectedBank) return;

    setImporting(true);
    try {
      const { data: bankData } = await supabase
        .from("banks")
        .select("id")
        .eq("name", selectedBank)
        .single();

      const toInsert = parsedRows.map((r) => ({
        transaction_date: r.date,
        description: r.description,
        amount: r.amount,
        bank_id: bankData?.id || null,
        bank_name: selectedBank,
        match_status: "unmatched",
        category_type: "unmatched",
      }));

      const { error } = await supabase.from("bank_transactions").insert(toInsert);
      if (error) throw error;

      toast.success(`Εισήχθησαν ${toInsert.length} κινήσεις από CSV`);
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
            <FileSpreadsheet className="h-5 w-5" />
            Εισαγωγή CSV Τράπεζας
          </DialogTitle>
          <DialogDescription>
            Ανεβάστε CSV αρχείο με στήλες: ημερομηνία, περιγραφή, ποσό. Υποστηρίζονται ελληνικοί μορφότυποι.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-6 py-4">
            {/* Bank Selection */}
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
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {isDragActive ? "Αφήστε το αρχείο εδώ" : "Σύρετε ή κάντε κλικ για επιλογή CSV"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Μορφή: date, description, amount (ή credit/debit στήλες)
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {parsedRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <p className="text-muted-foreground">Δεν βρέθηκαν κινήσεις στο CSV.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedBank && (
                      <>
                        <BankLogo bankName={selectedBank} size="md" />
                        <span className="font-medium">
                          {SUPPORTED_BANKS.find((b) => b.value === selectedBank)?.label}
                        </span>
                      </>
                    )}
                  </div>
                  <Badge variant="secondary">{parsedRows.length} κινήσεις</Badge>
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
                      {parsedRows.map((row, idx) => (
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

          {parsed && parsedRows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || !selectedBank}
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
                  Εισαγωγή {parsedRows.length} Κινήσεων
                </>
              )}
            </Button>
          )}

          {parsed && (
            <Button variant="ghost" onClick={() => { setParsed(false); setSelectedFile(null); setParsedRows([]); }} className="rounded-xl">
              Νέο Αρχείο
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
