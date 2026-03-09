import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Edit3, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoicePreview } from "./InvoicePreview";
import { ExtractedData, InvoiceCategory } from "@/types/database";
import { resolveContactIds } from "@/lib/auto-link-contact";
import { Button } from "@/components/ui/button";
import { ExtractionProgress } from "./ExtractionProgress";
import { checkDuplicateInvoice } from "@/lib/duplicate-detection";
import { runAutoMatching } from "@/lib/auto-matching";
import { runExtractionWithRetry, ExtractionResult } from "@/lib/extraction-utils";
import { ExtractionDiagnostics, DiagnosticsData } from "./ExtractionDiagnostics";

interface UploadedFile {
  file?: File;
  path: string;
  url: string;
  extractedData: ExtractedData | null;
  isManual?: boolean;
  diagnostics?: DiagnosticsData;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId?: string;
  onUploadComplete?: () => void;
  defaultType?: "income" | "expense";
}

export function UploadModal({ open, onOpenChange, packageId, onUploadComplete, defaultType = "expense" }: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [lastUploadedPath, setLastUploadedPath] = useState<string | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload");

  const handleClose = useCallback(() => {
    setUploadedFile(null);
    setUploading(false);
    setExtracting(false);
    setExtractionFailed(false);
    setLastUploadedPath(null);
    setLastUploadedFile(null);
    setMode("upload");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleManualEntry = () => {
    setMode("manual");
    setUploadedFile({
      path: `manual/${Date.now()}`,
      url: "",
      extractedData: null,
      isManual: true
    });
  };

  const runExtraction = async (filePath: string, fileName: string, fallbackMode = false): Promise<ExtractionResult> => {
    return runExtractionWithRetry({
      filePath,
      fileName,
      fallbackMode,
      maxRetries: 3,
    });
  };

  const handleRetryExtraction = async (useFallback = true) => {
    if (!lastUploadedPath || !lastUploadedFile) return;
    setExtracting(true);
    setExtractionFailed(false);
    toast.info(useFallback ? "Επανάληψη με Pro model..." : "Επανάληψη ανάγνωσης...");

    const result = await runExtraction(lastUploadedPath, lastUploadedFile.name, useFallback);

    setExtracting(false);
    if (!result.extracted || (result.diagnostics?.confidence ?? 0) <= 0.1) {
      setExtractionFailed(true);
      toast.error("Η ανάγνωση απέτυχε. Συμπληρώστε χειροκίνητα.");
    } else {
      const conf = result.diagnostics?.confidence ?? 0;
      if (conf >= 0.7) {
        toast.success(`Επιτυχής ανάγνωση! (${Math.round(conf * 100)}%)`);
      } else {
        toast.info(`Μερική ανάγνωση (${Math.round(conf * 100)}%). Ελέγξτε τα πεδία.`);
      }
    }

    if (uploadedFile) {
      setUploadedFile({
        ...uploadedFile,
        extractedData: result.extracted,
        diagnostics: result.diagnostics,
      });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Αποτυχία μεταφόρτωσης αρχείου. Παρακαλώ δοκιμάστε ξανά.');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      setUploading(false);
      setExtracting(true);
      setLastUploadedPath(filePath);
      setLastUploadedFile(file);

      const result = await runExtraction(filePath, file.name);

      setExtracting(false);
      const confidence = result.diagnostics?.confidence ?? (result.extracted?.confidence as number) ?? 0;
      
      if (!result.extracted || confidence <= 0.1) {
        setExtractionFailed(true);
      }
      
      setUploadedFile({
        file,
        path: filePath,
        url: publicUrl,
        extractedData: result.extracted,
        isManual: false,
        diagnostics: result.diagnostics,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      setUploading(false);
      setExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: uploading || extracting || mode === "manual"
  });

  const handleSave = async (data: {
    merchant: string;
    amount: number | null;
    date: string | null;
    category: InvoiceCategory;
    expenseCategoryId?: string | null;
    incomeCategoryId?: string | null;
    packageId: string | null;
    customerId?: string | null;
    supplierId?: string | null;
  }) => {
    if (!uploadedFile) return;

    const isManual = uploadedFile.isManual || !uploadedFile.file;

    try {
      // Duplicate detection
      const invoiceNumber = (uploadedFile.extractedData as any)?.invoice_number || null;
      const dupeCheck = await checkDuplicateInvoice({
        invoiceNumber,
        merchant: data.merchant,
        amount: data.amount,
        date: data.date,
        type: defaultType,
      });

      if (dupeCheck.isDuplicate) {
        toast.error(`Διπλότυπο! ${dupeCheck.reason}`, {
          duration: 6000,
          description: dupeCheck.existingMerchant
            ? `Υπάρχει ήδη: ${dupeCheck.existingMerchant} - €${dupeCheck.existingAmount?.toFixed(2) || '?'} (${dupeCheck.existingDate || '?'})`
            : undefined,
        });
        return;
      }

      if (dupeCheck.isPotential) {
        const confirmed = window.confirm(
          `⚠️ Πιθανό διπλότυπο!\n\n${dupeCheck.reason}\n\nΥπάρχει ήδη: ${dupeCheck.existingMerchant || '?'} - €${dupeCheck.existingAmount?.toFixed(2) || '?'} (${dupeCheck.existingDate || '?'})\n\nΑποθήκευση ούτως ή άλλως;`
        );
        if (!confirmed) return;
      }
      
      // Auto-create supplier for expenses if no supplier is linked
      let finalSupplierId = data.supplierId || null;
      if (defaultType === "expense" && !finalSupplierId && data.merchant) {
        // Try to find existing supplier by name
        const { data: existingSupp } = await supabase
          .from("suppliers")
          .select("id")
          .ilike("name", data.merchant.trim())
          .maybeSingle();

        if (existingSupp) {
          finalSupplierId = existingSupp.id;
        } else {
          // Create new supplier with VAT if available
          const { data: newSupp, error: suppErr } = await supabase
            .from("suppliers")
            .insert({ name: data.merchant.trim() })
            .select("id")
            .single();

          if (!suppErr && newSupp) {
            finalSupplierId = newSupp.id;
          }
        }
      }

      // Auto-link contact if not already set
      const autoLinked = await resolveContactIds(
        data.merchant,
        defaultType as "income" | "expense",
        (uploadedFile.extractedData as any)?.tax_id
      );

      const { error } = await (supabase as any).from("invoices").insert([{
        file_path: uploadedFile.path,
        file_name: uploadedFile.file?.name || "Manual Entry",
        merchant: data.merchant || null,
        amount: data.amount,
        invoice_date: data.date,
        category: data.category,
        expense_category_id: defaultType === "expense" ? (data.expenseCategoryId || null) : null,
        
        package_id: data.packageId || packageId || null,
        extracted_data: uploadedFile.extractedData as any,
        type: defaultType,
        customer_id: data.customerId || autoLinked.customer_id || null,
        supplier_id: finalSupplierId || autoLinked.supplier_id || null,
      }]);

      if (error) {
        console.error("Save error:", error);
        toast.error("Αποτυχία αποθήκευσης. Παρακαλώ δοκιμάστε ξανά.");
        return;
      }

      if (isManual) {
        toast.success("Αποθηκεύτηκε! Θυμηθείτε να ανεβάσετε το αρχείο αργότερα.", {
          duration: 5000,
          action: {
            label: "OK",
            onClick: () => { }
          }
        });
      } else {
        toast.success("Αποθηκεύτηκε επιτυχώς");
      }

      // Auto-matching: try to find matching bank transactions
      try {
        const result = await runAutoMatching({ minConfidence: 70, dryRun: false });
        if (result.matched > 0) {
          toast.success(`🔗 Αυτόματη αντιστοίχιση: ${result.matched} συναλλαγή(-ες) συνδέθηκαν!`, { duration: 5000 });
        } else if (result.suggested > 0) {
          toast.info(`💡 Βρέθηκαν ${result.suggested} πιθανές αντιστοιχίσεις στο Bank Sync`, { duration: 5000 });
        }
      } catch (e) {
        console.warn("Auto-matching after upload failed:", e);
      }

      onUploadComplete?.();
      handleClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Αποτυχία αποθήκευσης. Παρακαλώ δοκιμάστε ξανά.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {defaultType === "income" ? "Νέο Έσοδο" : "Νέο Έξοδο"}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!uploadedFile ? (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex gap-3 mb-4">
                <Button
                  variant={mode === "upload" ? "default" : "outline"}
                  onClick={() => setMode("upload")}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant={mode === "manual" ? "default" : "outline"}
                  onClick={handleManualEntry}
                  className="flex-1"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Manual Entry
                </Button>
              </div>

              {mode === "upload" && (
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                    ${(uploading || extracting) ? 'pointer-events-none opacity-50' : ''}
                  `}
                >
                  <input {...getInputProps()} />

                  {uploading || extracting ? (
                    <ExtractionProgress
                      stage={uploading ? "uploading" : "extracting"}
                    />
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? "Αφήστε το αρχείο εδώ" : "Σύρετε ή κάντε κλικ για μεταφόρτωση"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Υποστηρίζονται PDF, PNG, JPG
                      </p>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Diagnostics Panel */}
              {uploadedFile.diagnostics && !uploadedFile.isManual && (
                <ExtractionDiagnostics
                  diagnostics={uploadedFile.diagnostics}
                  onRetry={() => handleRetryExtraction(true)}
                  isRetrying={extracting}
                />
              )}

              {extractionFailed && !extracting && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                    Η AI ανάγνωση ήταν ατελής. Μπορείτε να δοκιμάσετε ξανά ή να συμπληρώσετε χειροκίνητα.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleRetryExtraction(true)} className="shrink-0">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Επανάληψη
                  </Button>
                </div>
              )}
              
              <InvoicePreview
                fileName={uploadedFile.file?.name || "Manual Entry"}
                fileUrl={uploadedFile.url}
                extractedData={uploadedFile.extractedData}
                onSave={handleSave}
                onCancel={handleClose}
                packageId={packageId}
                isManual={uploadedFile.isManual}
                type={defaultType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
