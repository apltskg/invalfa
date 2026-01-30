import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoicePreview } from "./InvoicePreview";
import { ExtractedData, InvoiceCategory } from "@/types/database";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  file?: File;
  path: string;
  url: string;
  extractedData: ExtractedData | null;
  isManual?: boolean;
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
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [mode, setMode] = useState<"upload" | "manual">("upload");

  const handleClose = useCallback(() => {
    setUploadedFile(null);
    setUploading(false);
    setExtracting(false);
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
        toast.error(`Failed to upload file: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(filePath);

      setUploading(false);
      setExtracting(true);

      let extractedData: ExtractedData | null = null;
      try {
        const response = await supabase.functions.invoke('extract-invoice', {
          body: { filePath, fileName: file.name }
        });

        // Robust check for JSON response
        if (response.error) {
          console.error('Edge Function error:', response.error);
          toast.error("AI Assistant: " + (response.error.message || "Extraction failed. Falling back to manual entry."));
        } else if (response.data && typeof response.data === 'object') {
          extractedData = response.data as ExtractedData;
        } else {
          console.warn('Unexpected non-JSON response from AI extraction');
          toast.info("AI could not read some fields automatically. Please fill them manually.");
        }
      } catch (extractError) {
        console.error('Extraction catch error:', extractError);
        toast.error("AI connection lost. Switching to manual entry.");
      }

      setExtracting(false);
      setUploadedFile({
        file,
        path: filePath,
        url: publicUrl,
        extractedData,
        isManual: false
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
    expenseCategoryId?: string | null; // Added type definition
    packageId: string | null;
    customerId?: string | null;
    supplierId?: string | null;
  }) => {
    if (!uploadedFile) return;

    const isManual = uploadedFile.isManual || !uploadedFile.file;

    try {
      const { error } = await supabase.from("invoices").insert([{
        file_path: uploadedFile.path,
        file_name: uploadedFile.file?.name || "Manual Entry",
        merchant: data.merchant || null,
        amount: data.amount,
        invoice_date: data.date,
        category: data.category,
        expense_category_id: data.expenseCategoryId, // Map to DB column
        package_id: data.packageId || packageId || null,
        extracted_data: uploadedFile.extractedData as any,
        type: defaultType,
        customer_id: data.customerId || null,
        supplier_id: data.supplierId || null
      }]);

      if (error) {
        console.error("Save error:", error);
        toast.error(`Failed to save document: ${error.message}`);
        return;
      }

      if (isManual) {
        toast.success("Entry saved! Remember to upload the PDF file later.", {
          duration: 5000,
          action: {
            label: "Got it",
            onClick: () => { }
          }
        });
      } else {
        toast.success("Document saved successfully");
      }

      onUploadComplete?.();
      handleClose();
    } catch (error) {
      console.error("Save error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save: ${errorMessage}`);
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

                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Uploading file...</p>
                    </div>
                  ) : extracting ? (
                    <div className="space-y-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Extracting data with AI...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? "Drop file here" : "Drag & drop or click to upload"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports PDF, PNG, JPG
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
            >
              <InvoicePreview
                fileName={uploadedFile.file?.name || "Manual Entry"}
                fileUrl={uploadedFile.url}
                extractedData={uploadedFile.extractedData}
                onSave={handleSave}
                onCancel={handleClose}
                packageId={packageId}
                isManual={uploadedFile.isManual}
                type={defaultType} // Pass the type
              />
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
