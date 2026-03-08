import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { parseInvoiceExcel, ParsedInvoiceData } from "@/lib/excel-parser";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceListUploadProps {
  onUploadComplete: (importId: string, data: ParsedInvoiceData) => void;
}

interface DuplicateInfo {
  count: number;
  samples: string[];
}

export function InvoiceListUpload({ onUploadComplete }: InvoiceListUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'checking_dupes' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateInfo | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingData, setPendingData] = useState<ParsedInvoiceData | null>(null);

  const checkDuplicates = async (parsedData: ParsedInvoiceData): Promise<DuplicateInfo | null> => {
    // Get invoice numbers from parsed data
    const invoiceNumbers = parsedData.rows
      .map(r => r.invoiceNumber)
      .filter(Boolean) as string[];

    if (invoiceNumbers.length === 0) return null;

    // Check existing items with same invoice numbers
    const { data: existing } = await supabase
      .from('invoice_list_items')
      .select('invoice_number, client_vat, total_amount')
      .in('invoice_number', invoiceNumbers.slice(0, 100)); // Check first 100

    if (!existing || existing.length === 0) return null;

    // Cross-reference with parsed rows
    const existingSet = new Set(existing.map(e =>
      `${e.invoice_number}|${e.client_vat}|${e.total_amount}`
    ));

    const dupes = parsedData.rows.filter(row =>
      existingSet.has(`${row.invoiceNumber}|${row.clientVat}|${row.totalAmount}`)
    );

    if (dupes.length === 0) return null;

    return {
      count: dupes.length,
      samples: dupes.slice(0, 3).map(d => d.invoiceNumber || 'N/A'),
    };
  };

  const doUpload = async (file: File, parsedData: ParsedInvoiceData) => {
    setProgress(50);
    setStatus('uploading');

    // Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `imports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('invoice-lists')
      .upload(filePath, file);

    if (uploadError) throw uploadError;
    setProgress(70);
    setStatus('saving');

    // Determine period from data
    const dates = parsedData.rows.filter(r => r.date).map(r => r.date as Date);
    let periodMonth = '';
    if (dates.length > 0) {
      const firstDate = dates[0];
      periodMonth = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
    }

    // Create import record
    const { data: importRecord, error: insertError } = await supabase
      .from('invoice_list_imports')
      .insert({
        file_name: file.name,
        file_path: filePath,
        period_month: periodMonth,
        row_count: parsedData.rows.length,
        total_net: parsedData.totals.net,
        total_vat: parsedData.totals.vat,
        total_gross: parsedData.totals.gross,
        validated_totals: parsedData.validationPassed,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    setProgress(85);

    // Insert all invoice items
    const itemsToInsert = parsedData.rows.map(row => ({
      import_id: importRecord.id,
      invoice_date: row.date?.toISOString().split('T')[0] || null,
      invoice_number: row.invoiceNumber,
      mydata_code: row.mydataCode,
      client_name: row.clientName,
      client_vat: row.clientVat,
      net_amount: row.netAmount,
      vat_amount: row.vatAmount,
      total_amount: row.totalAmount,
      mydata_mark: row.mydataMark,
      match_status: 'unmatched',
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_list_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    setProgress(100);
    setStatus('done');
    toast.success(`Εισήχθησαν ${parsedData.rows.length} τιμολόγια επιτυχώς!`);
    onUploadComplete(importRecord.id, parsedData);
  };

  const processFile = useCallback(async (file: File) => {
    setUploading(true);
    setStatus('parsing');
    setProgress(10);
    setDuplicateWarning(null);

    try {
      const parsedData = await parseInvoiceExcel(file);
      setProgress(25);
      setStatus('checking_dupes');

      // Check for duplicates
      const dupes = await checkDuplicates(parsedData);
      setProgress(35);

      if (dupes) {
        // Show warning and wait for confirmation
        setDuplicateWarning(dupes);
        setPendingFile(file);
        setPendingData(parsedData);
        setStatus('idle');
        setUploading(false);
        return;
      }

      // No duplicates, proceed
      await doUpload(file, parsedData);
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      toast.error(error.message || 'Αποτυχία εισαγωγής');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setStatus('idle');
        setProgress(0);
      }, 2000);
    }
  }, [onUploadComplete]);

  const handleForceUpload = async () => {
    if (!pendingFile || !pendingData) return;
    setUploading(true);
    setDuplicateWarning(null);
    try {
      await doUpload(pendingFile, pendingData);
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      toast.error(error.message || 'Αποτυχία εισαγωγής');
    } finally {
      setPendingFile(null);
      setPendingData(null);
      setTimeout(() => {
        setUploading(false);
        setStatus('idle');
        setProgress(0);
      }, 2000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: uploading,
    onDrop: (files) => {
      if (files.length > 0) processFile(files[0]);
    },
  });

  const getStatusIcon = () => {
    switch (status) {
      case 'parsing':
      case 'checking_dupes':
      case 'uploading':
      case 'saving':
        return <Loader2 className="h-8 w-8 text-primary animate-spin" />;
      case 'done':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-destructive" />;
      default:
        return <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'parsing': return 'Ανάλυση αρχείου Excel...';
      case 'checking_dupes': return 'Έλεγχος διπλοεγγραφών...';
      case 'uploading': return 'Αποθήκευση αρχείου...';
      case 'saving': return 'Αποθήκευση δεδομένων...';
      case 'done': return 'Ολοκληρώθηκε!';
      case 'error': return 'Σφάλμα εισαγωγής';
      default:
        return isDragActive
          ? 'Αφήστε το αρχείο εδώ...'
          : 'Σύρετε ένα αρχείο Excel ή κάντε κλικ για επιλογή';
    }
  };

  return (
    <div className="space-y-3">
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-3xl transition-all cursor-pointer ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : uploading
            ? 'border-muted bg-muted/20 cursor-wait'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center gap-4">
          {getStatusIcon()}
          <div>
            <p className="font-medium text-foreground">{getStatusText()}</p>
            {status === 'idle' && !duplicateWarning && (
              <p className="text-sm text-muted-foreground mt-1">
                Υποστηριζόμενα αρχεία: .xlsx, .xls
              </p>
            )}
          </div>
          {uploading && (
            <div className="w-full max-w-xs">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{progress}%</p>
            </div>
          )}
          {status === 'idle' && !duplicateWarning && (
            <Button variant="outline" className="rounded-xl gap-2" disabled={uploading}>
              <Upload className="h-4 w-4" />
              Επιλογή Αρχείου
            </Button>
          )}
        </div>
      </Card>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <Card className="p-4 rounded-2xl border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                Βρέθηκαν {duplicateWarning.count} πιθανές διπλοεγγραφές
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Τιμολόγια: {duplicateWarning.samples.join(', ')}
                {duplicateWarning.count > 3 && ` (+${duplicateWarning.count - 3} ακόμα)`}
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                  setDuplicateWarning(null);
                  setPendingFile(null);
                  setPendingData(null);
                }}>
                  Ακύρωση
                </Button>
                <Button size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white" onClick={handleForceUpload}>
                  Εισαγωγή Ούτως ή Άλλως
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
