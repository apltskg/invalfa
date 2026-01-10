import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoicePreview } from "./InvoicePreview";
import { ExtractedData, InvoiceCategory } from "@/types/database";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    file: File;
    path: string;
    url: string;
    extractedData: ExtractedData | null;
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Use signed URL for private bucket
      const { data: signedUrlData } = await supabase.storage
        .from("invoices")
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      
      const fileUrl = signedUrlData?.signedUrl || "";

      setUploading(false);
      setExtracting(true);

      // Call AI extraction edge function
      const { data: extractionData, error: extractionError } = await supabase.functions
        .invoke("extract-invoice", {
          body: { fileUrl: fileUrl, fileName: file.name }
        });

      if (extractionError) {
        console.error("Extraction error:", extractionError);
        toast.error("AI extraction failed, but file was uploaded");
      }

      setUploadedFile({
        file,
        path: filePath,
        url: fileUrl,
        extractedData: extractionData?.extracted || null
      });

      setExtracting(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      setUploading(false);
      setExtracting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp"]
    },
    maxFiles: 1,
    disabled: uploading || extracting
  });

  const handleClose = () => {
    setUploadedFile(null);
    onOpenChange(false);
  };

  const handleSave = async (data: {
    merchant: string;
    amount: number | null;
    date: string | null;
    category: InvoiceCategory;
    packageId: string | null;
  }) => {
    if (!uploadedFile) return;

    try {
      const { error } = await supabase.from("invoices").insert([{
        file_path: uploadedFile.path,
        file_name: uploadedFile.file.name,
        merchant: data.merchant,
        amount: data.amount,
        invoice_date: data.date,
        category: data.category,
        package_id: data.packageId,
        extracted_data: uploadedFile.extractedData as any
      }]);

      if (error) throw error;

      toast.success("Invoice saved successfully");
      handleClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save invoice");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${uploadedFile ? "max-w-6xl" : "max-w-lg"} p-0 gap-0 overflow-hidden`}>
        <AnimatePresence mode="wait">
          {!uploadedFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-semibold">Upload Invoice</DialogTitle>
              </DialogHeader>

              <div
                {...getRootProps()}
                className={`
                  relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12
                  transition-all duration-200 cursor-pointer
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"}
                  ${(uploading || extracting) ? "pointer-events-none opacity-60" : ""}
                `}
              >
                <input {...getInputProps()} />
                
                {uploading || extracting ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {uploading ? "Uploading..." : "Extracting data with AI..."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="mb-2 text-lg font-medium">
                      {isDragActive ? "Drop your file here" : "Drag & drop your invoice"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse • PDF, PNG, JPG
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <InvoicePreview
              fileUrl={uploadedFile.url}
              fileName={uploadedFile.file.name}
              extractedData={uploadedFile.extractedData}
              onSave={handleSave}
              onCancel={handleClose}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
