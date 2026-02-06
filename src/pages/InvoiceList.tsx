import { useState, useEffect, useCallback } from "react";
import { FileSpreadsheet, Download, Trash2, Check, RefreshCw, ChevronDown, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoiceListUpload } from "@/components/invoicelist/InvoiceListUpload";
import { InvoiceListTable, InvoiceListItem } from "@/components/invoicelist/InvoiceListTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

interface InvoiceListImport {
  id: string;
  file_name: string;
  file_path: string;
  upload_date: string;
  period_month: string | null;
  row_count: number;
  matched_count: number;
  total_net: number;
  total_vat: number;
  total_gross: number;
  validated_totals: boolean;
}

export default function InvoiceList() {
  const [imports, setImports] = useState<InvoiceListImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchingItem, setMatchingItem] = useState<InvoiceListItem | null>(null);
  const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  // Fetch all imports
  useEffect(() => {
    fetchImports();
    fetchIncomeRecords();
    fetchPackages();
  }, []);

  // Fetch items when import is selected
  useEffect(() => {
    if (selectedImportId) {
      fetchItems(selectedImportId);
    } else {
      setItems([]);
    }
  }, [selectedImportId]);

  async function fetchImports() {
    try {
      const { data, error } = await supabase
        .from('invoice_list_imports')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setImports(data || []);
      
      // Auto-select first import if exists
      if (data && data.length > 0 && !selectedImportId) {
        setSelectedImportId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching imports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchItems(importId: string) {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('invoice_list_items')
        .select('*')
        .eq('import_id', importId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setItems((data || []) as InvoiceListItem[]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  }

  async function fetchIncomeRecords() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('type', 'income')
        .order('invoice_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      setIncomeRecords(data || []);
    } catch (error) {
      console.error('Error fetching income records:', error);
    }
  }

  async function fetchPackages() {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  }

  const handleUploadComplete = useCallback((importId: string) => {
    fetchImports();
    setSelectedImportId(importId);
  }, []);

  const handleDeleteImport = async () => {
    if (!selectedImportId) return;
    
    try {
      const importRecord = imports.find(i => i.id === selectedImportId);
      
      // Delete from storage
      if (importRecord?.file_path) {
        await supabase.storage
          .from('invoice-lists')
          .remove([importRecord.file_path]);
      }
      
      // Delete from database (cascade will delete items)
      const { error } = await supabase
        .from('invoice_list_imports')
        .delete()
        .eq('id', selectedImportId);

      if (error) throw error;
      
      toast.success('Η εισαγωγή διαγράφηκε');
      setSelectedImportId(null);
      fetchImports();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Αποτυχία διαγραφής');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleDownloadOriginal = async () => {
    const importRecord = imports.find(i => i.id === selectedImportId);
    if (!importRecord?.file_path) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('invoice-lists')
        .createSignedUrl(importRecord.file_path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Αποτυχία λήψης');
    }
  };

  const handleMatchItem = (item: InvoiceListItem) => {
    setMatchingItem(item);
    setMatchDialogOpen(true);
  };

  const handleCreateIncome = async (item: InvoiceListItem) => {
    try {
      // Create new income record
      const { data: newIncome, error: createError } = await supabase
        .from('invoices')
        .insert({
          type: 'income',
          merchant: item.client_name,
          amount: item.total_amount,
          invoice_date: item.invoice_date,
          category: 'other',
          file_path: 'manual/' + Date.now(),
          file_name: `Income - ${item.invoice_number || item.client_name}`,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update the list item to matched
      const { error: updateError } = await supabase
        .from('invoice_list_items')
        .update({
          match_status: 'matched',
          matched_income_id: newIncome.id,
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      toast.success('Δημιουργήθηκε νέο έσοδο');
      fetchItems(selectedImportId!);
      fetchIncomeRecords();
    } catch (error) {
      console.error('Create income error:', error);
      toast.error('Αποτυχία δημιουργίας');
    }
  };

  const handleLinkFolder = async (item: InvoiceListItem) => {
    // TODO: Implement folder selection modal
    toast.info('Επιλογή φακέλου - υπό ανάπτυξη');
  };

  const handleConfirmMatch = async (incomeId: string) => {
    if (!matchingItem) return;
    
    try {
      const { error } = await supabase
        .from('invoice_list_items')
        .update({
          match_status: 'matched',
          matched_income_id: incomeId,
        })
        .eq('id', matchingItem.id);

      if (error) throw error;

      toast.success('Αντιστοιχίστηκε επιτυχώς');
      setMatchDialogOpen(false);
      setMatchingItem(null);
      fetchItems(selectedImportId!);
    } catch (error) {
      console.error('Match error:', error);
      toast.error('Αποτυχία αντιστοίχισης');
    }
  };

  const selectedImport = imports.find(i => i.id === selectedImportId);

  const stats = {
    total: items.length,
    matched: items.filter(i => i.match_status === 'matched').length,
    suggested: items.filter(i => i.match_status === 'suggested').length,
    unmatched: items.filter(i => i.match_status === 'unmatched').length,
    totalAmount: items.reduce((sum, i) => sum + (i.total_amount || 0), 0),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Λίστα Παραστατικών</h1>
          <p className="mt-1 text-muted-foreground">
            Εισαγωγή και αντιστοίχιση τιμολογίων από τιμολογιέρα
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <InvoiceListUpload onUploadComplete={handleUploadComplete} />

      {/* Import Selector */}
      {imports.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Εισαγωγή:</span>
            </div>
            
            <Select value={selectedImportId || ''} onValueChange={setSelectedImportId}>
              <SelectTrigger className="w-64 rounded-xl">
                <SelectValue placeholder="Επιλέξτε εισαγωγή" />
              </SelectTrigger>
              <SelectContent>
                {imports.map((imp) => (
                  <SelectItem key={imp.id} value={imp.id}>
                    <div className="flex items-center gap-2">
                      <span>{imp.file_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({imp.row_count} τιμολόγια)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedImport && (
              <>
                <Badge variant={selectedImport.validated_totals ? "default" : "secondary"} className="gap-1">
                  {selectedImport.validated_totals ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {selectedImport.validated_totals ? 'Επαληθευμένο' : 'Μη επαληθευμένο'}
                </Badge>
                
                <div className="flex gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={handleDownloadOriginal}
                  >
                    <Download className="h-4 w-4" />
                    Λήψη Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-2 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Stats */}
      {selectedImportId && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 rounded-2xl">
            <p className="text-sm text-muted-foreground">Σύνολο</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4 rounded-2xl bg-green-50 border-green-200">
            <p className="text-sm text-green-600">Αντιστοιχισμένα</p>
            <p className="text-2xl font-bold text-green-700">{stats.matched}</p>
          </Card>
          <Card className="p-4 rounded-2xl bg-amber-50 border-amber-200">
            <p className="text-sm text-amber-600">Προτεινόμενα</p>
            <p className="text-2xl font-bold text-amber-700">{stats.suggested}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-sm text-muted-foreground">Ανοιχτά</p>
            <p className="text-2xl font-bold">{stats.unmatched}</p>
          </Card>
          <Card className="p-4 rounded-2xl bg-primary/5 border-primary/20">
            <p className="text-sm text-primary">Συνολική Αξία</p>
            <p className="text-2xl font-bold text-primary">€{stats.totalAmount.toFixed(2)}</p>
          </Card>
        </div>
      )}

      {/* Items Table */}
      {loading ? (
        <Card className="p-8 rounded-3xl">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Φόρτωση...
          </div>
        </Card>
      ) : imports.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Δεν υπάρχουν εισαγωγές"
          description="Ανεβάστε ένα αρχείο Excel από την τιμολογιέρα σας για να ξεκινήσετε"
        />
      ) : selectedImportId && (
        <Card className="p-6 rounded-3xl">
          {loadingItems ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Φόρτωση τιμολογίων...
            </div>
          ) : (
            <InvoiceListTable
              items={items}
              onMatchItem={handleMatchItem}
              onCreateIncome={handleCreateIncome}
              onLinkFolder={handleLinkFolder}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Εισαγωγής</AlertDialogTitle>
            <AlertDialogDescription>
              Θα διαγραφεί η εισαγωγή "{selectedImport?.file_name}" και όλα τα {selectedImport?.row_count} τιμολόγια που περιέχει.
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImport}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Match Dialog */}
      <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Αντιστοίχιση Τιμολογίου</DialogTitle>
          </DialogHeader>
          
          {matchingItem && (
            <div className="space-y-4">
              <Card className="p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{matchingItem.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{matchingItem.client_name}</p>
                  </div>
                  <p className="font-bold">€{matchingItem.total_amount?.toFixed(2)}</p>
                </div>
              </Card>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {incomeRecords
                  .filter(inc => 
                    // Filter by similar amount (±5%)
                    matchingItem.total_amount && 
                    Math.abs((inc.amount || 0) - matchingItem.total_amount) <= matchingItem.total_amount * 0.05
                  )
                  .slice(0, 10)
                  .map((inc) => (
                    <Card
                      key={inc.id}
                      className="p-4 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleConfirmMatch(inc.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{inc.merchant || 'Χωρίς τίτλο'}</p>
                          <p className="text-sm text-muted-foreground">
                            {inc.invoice_date ? format(new Date(inc.invoice_date), 'dd/MM/yyyy', { locale: el }) : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">€{(inc.amount || 0).toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs">
                            {Math.abs((inc.amount || 0) - (matchingItem.total_amount || 0)) < 0.01
                              ? 'Ακριβής'
                              : `±€${Math.abs((inc.amount || 0) - (matchingItem.total_amount || 0)).toFixed(2)}`}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                
                {incomeRecords.filter(inc => 
                  matchingItem.total_amount && 
                  Math.abs((inc.amount || 0) - matchingItem.total_amount) <= matchingItem.total_amount * 0.05
                ).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Δεν βρέθηκαν έσοδα με παρόμοιο ποσό
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)} className="rounded-xl">
              Ακύρωση
            </Button>
            <Button
              onClick={() => matchingItem && handleCreateIncome(matchingItem)}
              className="rounded-xl"
            >
              Δημιουργία Νέου Εσόδου
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
