import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExtractedData, InvoiceCategory } from "@/types/database";

interface BulkFileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'extracting' | 'done' | 'error' | 'review';
  filePath?: string;
  extractedData?: ExtractedData | null;
  error?: string;
  progress: number;
}

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  defaultType?: 'income' | 'expense';
}

const MAX_FILES = 20;
const CONCURRENT_PROCESSING = 3;

export function BulkUploadModal({
  open,
  onOpenChange,
  onComplete,
  defaultType = 'expense',
}: BulkUploadModalProps) {
  const [files, setFiles] = useState<BulkFileItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');

  // Fetch categories and packages on open
  useState(() => {
    async function fetchData() {
      const [catResult, pkgResult] = await Promise.all([
        supabase.from('expense_categories').select('*').eq('is_operational', true),
        supabase.from('packages').select('*').order('start_date', { ascending: false }).limit(50),
      ]);
      if (catResult.data) setExpenseCategories(catResult.data);
      if (pkgResult.data) setPackages(pkgResult.data);
    }
    if (open) fetchData();
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BulkFileItem[] = acceptedFiles.slice(0, MAX_FILES - files.length).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: MAX_FILES,
    disabled: processing || files.length >= MAX_FILES,
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<BulkFileItem>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const processFile = async (item: BulkFileItem): Promise<void> => {
    try {
      // Upload
      updateFile(item.id, { status: 'uploading', progress: 20 });
      
      const fileExt = item.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, item.file);

      if (uploadError) throw new Error('Αποτυχία μεταφόρτωσης');

      updateFile(item.id, { filePath, progress: 50, status: 'extracting' });

      // Extract
      let extractedData: ExtractedData | null = null;
      try {
        const response = await supabase.functions.invoke('extract-invoice', {
          body: { filePath, fileName: item.file.name },
        });

        if (response.data && typeof response.data === 'object') {
          extractedData = response.data as ExtractedData;
        }
      } catch (extractError) {
        console.warn('Extraction failed for', item.file.name);
      }

      const needsReview = !extractedData || 
        (extractedData.confidence && extractedData.confidence < 0.7) ||
        !extractedData.amount ||
        !extractedData.date;

      updateFile(item.id, {
        extractedData,
        status: needsReview ? 'review' : 'done',
        progress: 100,
      });

    } catch (error: any) {
      console.error('Process error:', error);
      updateFile(item.id, {
        status: 'error',
        error: error.message || 'Σφάλμα επεξεργασίας',
        progress: 0,
      });
    }
  };

  const startProcessing = async () => {
    if (files.length === 0) return;
    
    setProcessing(true);
    setStep('processing');

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Process in batches
    for (let i = 0; i < pendingFiles.length; i += CONCURRENT_PROCESSING) {
      const batch = pendingFiles.slice(i, i + CONCURRENT_PROCESSING);
      await Promise.all(batch.map(processFile));
    }

    setProcessing(false);
    setStep('review');
  };

  const saveAllValid = async () => {
    const validFiles = files.filter(f => f.status === 'done' && f.filePath);
    
    if (validFiles.length === 0) {
      toast.warning('Δεν υπάρχουν έγκυρα αρχεία για αποθήκευση');
      return;
    }

    try {
      const invoices = validFiles.map(f => ({
        file_path: f.filePath!,
        file_name: f.file.name,
        merchant: f.extractedData?.merchant || null,
        amount: f.extractedData?.amount || null,
        invoice_date: f.extractedData?.date || null,
        category: (f.extractedData?.category as InvoiceCategory) || 'other',
        expense_category_id: selectedCategory || null,
        package_id: selectedPackage || null,
        extracted_data: f.extractedData as any,
        type: defaultType,
      }));

      const { error } = await supabase.from('invoices').insert(invoices);

      if (error) throw error;

      toast.success(`Αποθηκεύτηκαν ${validFiles.length} τιμολόγια!`);
      onComplete?.();
      handleClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Αποτυχία αποθήκευσης');
    }
  };

  const handleClose = () => {
    setFiles([]);
    setStep('upload');
    setProcessing(false);
    setSelectedCategory('');
    setSelectedPackage('');
    onOpenChange(false);
  };

  const stats = {
    total: files.length,
    done: files.filter(f => f.status === 'done').length,
    review: files.filter(f => f.status === 'review').length,
    error: files.filter(f => f.status === 'error').length,
    pending: files.filter(f => ['pending', 'uploading', 'extracting'].includes(f.status)).length,
  };

  const overallProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;

  const getStatusIcon = (status: BulkFileItem['status']) => {
    switch (status) {
      case 'uploading':
      case 'extracting':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: BulkFileItem['status']) => {
    switch (status) {
      case 'uploading':
        return 'Μεταφόρτωση...';
      case 'extracting':
        return 'Ανάλυση...';
      case 'done':
        return 'Έτοιμο';
      case 'review':
        return 'Χρειάζεται έλεγχο';
      case 'error':
        return 'Σφάλμα';
      default:
        return 'Αναμονή';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Μαζική Εισαγωγή {defaultType === 'expense' ? 'Εξόδων' : 'Εσόδων'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <Card
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : files.length >= MAX_FILES
                    ? 'border-muted bg-muted/20 cursor-not-allowed'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center text-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">
                    {files.length >= MAX_FILES
                      ? `Μέγιστο όριο ${MAX_FILES} αρχείων`
                      : isDragActive
                      ? 'Αφήστε τα αρχεία εδώ...'
                      : 'Σύρετε πολλαπλά PDF αρχεία ή κάντε κλικ'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Υποστηριζόμενα: PDF, PNG, JPG (max {MAX_FILES} αρχεία)
                  </p>
                </div>
              </Card>

              {/* File list */}
              {files.length > 0 && (
                <ScrollArea className="h-64 rounded-xl border">
                  <div className="p-2 space-y-1">
                    {files.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate text-sm">{item.file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(item.file.size / 1024).toFixed(0)} KB
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFile(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Batch settings */}
              {files.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Κατηγορία (προαιρετικό)</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Επιλέξτε κατηγορία..." />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name_el}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Φάκελος (προαιρετικό)</label>
                    <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Επιλέξτε φάκελο..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleClose} className="rounded-xl">
                  Ακύρωση
                </Button>
                <Button
                  onClick={startProcessing}
                  disabled={files.length === 0}
                  className="rounded-xl gap-2"
                >
                  Επεξεργασία {files.length} Αρχείων
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {(step === 'processing' || step === 'review') && (
            <div className="space-y-4">
              {/* Progress */}
              <Card className="p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {processing ? 'Επεξεργασία...' : 'Ολοκληρώθηκε!'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <Card className="p-3 rounded-xl text-center">
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Σύνολο</p>
                </Card>
                <Card className="p-3 rounded-xl text-center bg-green-50 border-green-200">
                  <p className="text-2xl font-bold text-green-600">{stats.done}</p>
                  <p className="text-xs text-green-600">Έτοιμα</p>
                </Card>
                <Card className="p-3 rounded-xl text-center bg-amber-50 border-amber-200">
                  <p className="text-2xl font-bold text-amber-600">{stats.review}</p>
                  <p className="text-xs text-amber-600">Έλεγχος</p>
                </Card>
                <Card className="p-3 rounded-xl text-center bg-red-50 border-red-200">
                  <p className="text-2xl font-bold text-red-600">{stats.error}</p>
                  <p className="text-xs text-red-600">Σφάλματα</p>
                </Card>
              </div>

              {/* File list with status */}
              <ScrollArea className="h-64 rounded-xl border">
                <div className="p-2 space-y-1">
                  {files.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        item.status === 'error' ? 'bg-red-50' :
                        item.status === 'review' ? 'bg-amber-50' :
                        item.status === 'done' ? 'bg-green-50' :
                        'hover:bg-muted/50'
                      }`}
                    >
                      {getStatusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        {item.extractedData && (
                          <p className="text-xs text-muted-foreground">
                            {item.extractedData.merchant} • €{item.extractedData.amount?.toFixed(2) || '–'}
                          </p>
                        )}
                        {item.error && (
                          <p className="text-xs text-destructive">{item.error}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {getStatusLabel(item.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              {!processing && (
                <div className="flex justify-between gap-3 pt-4">
                  <Button variant="outline" onClick={handleClose} className="rounded-xl">
                    Κλείσιμο
                  </Button>
                  <div className="flex gap-3">
                    {stats.review > 0 && (
                      <Button variant="outline" className="rounded-xl gap-2">
                        <Edit className="h-4 w-4" />
                        Επεξεργασία ({stats.review})
                      </Button>
                    )}
                    <Button
                      onClick={saveAllValid}
                      disabled={stats.done === 0}
                      className="rounded-xl gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Αποθήκευση {stats.done} Τιμολογίων
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
