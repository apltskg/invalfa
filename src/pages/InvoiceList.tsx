import { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet, Download, Trash2, Check, RefreshCw, ChevronDown,
  Calendar, AlertCircle, CheckCircle, Sparkles, Zap, Layers, History,
} from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoiceListUpload } from "@/components/invoicelist/InvoiceListUpload";
import { InvoiceListTable, InvoiceListItem } from "@/components/invoicelist/InvoiceListTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { motion } from "framer-motion";
import { useInvoiceListMatching } from "@/hooks/useInvoiceListMatching";
import { getConfidenceStyles } from "@/lib/matching-engine";
import { logAuditAction, getAuditLog } from "@/hooks/useAuditLog";

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

const PAGE_SIZE = 50;

export default function InvoiceList() {
  const [imports, setImports] = useState<InvoiceListImport[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [matchingItem, setMatchingItem] = useState<InvoiceListItem | null>(null);
  const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Audit history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InvoiceListItem | null>(null);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);

  // Fetch all imports
  useEffect(() => {
    fetchImports();
    fetchIncomeRecords();
    fetchPackages();
  }, []);

  // Fetch items when import/page/viewMode changes
  useEffect(() => {
    if (viewMode === 'all') {
      fetchAllItems();
    } else if (selectedImportId) {
      fetchItems(selectedImportId);
    } else {
      setItems([]);
      setTotalCount(0);
    }
  }, [selectedImportId, page, viewMode]);

  async function fetchImports() {
    try {
      const { data, error } = await supabase
        .from('invoice_list_imports')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;
      setImports(data || []);

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
      // Get total count
      const { count } = await supabase
        .from('invoice_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('import_id', importId);

      setTotalCount(count || 0);

      // Fetch paginated data
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('invoice_list_items')
        .select('*')
        .eq('import_id', importId)
        .order('invoice_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setItems((data || []) as InvoiceListItem[]);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  }

  async function fetchAllItems() {
    setLoadingItems(true);
    try {
      const { count } = await supabase
        .from('invoice_list_items')
        .select('*', { count: 'exact', head: true });

      setTotalCount(count || 0);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('invoice_list_items')
        .select('*')
        .order('invoice_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setItems((data || []) as InvoiceListItem[]);
    } catch (error) {
      console.error('Error fetching all items:', error);
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
    setPage(1);
    setViewMode('single');
    linkCustomersToItems(importId);
  }, []);

  const handleDeleteImport = async () => {
    if (!selectedImportId) return;
    try {
      const importRecord = imports.find(i => i.id === selectedImportId);
      if (importRecord?.file_path) {
        await supabase.storage.from('invoice-lists').remove([importRecord.file_path]);
      }
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
      toast.error('Αποτυχία λήψης');
    }
  };

  const handleMatchItem = (item: InvoiceListItem) => {
    setMatchingItem(item);
    setMatchDialogOpen(true);
  };

  const handleCreateIncome = async (item: InvoiceListItem) => {
    try {
      let customerId: string | null = null;
      const cleanVat = (item.client_vat || '').replace(/\D/g, '');
      const isValidVat = /^\d{9}$/.test(cleanVat);
      
      if (isValidVat) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('vat_number', cleanVat)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: custError } = await supabase
            .from('customers')
            .insert({
              name: item.client_name || `Πελάτης ${cleanVat}`,
              vat_number: cleanVat,
            })
            .select('id')
            .single();
          if (!custError && newCustomer) {
            customerId = newCustomer.id;
            toast.success(`Δημιουργήθηκε νέος πελάτης: ${item.client_name || item.client_vat}`);
          }
        }
      }

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
          customer_id: customerId,
          extracted_data: {
            invoice_number: item.invoice_number,
            merchant: item.client_name,
            tax_id: item.client_vat,
            amount: item.total_amount,
            vat_amount: item.vat_amount,
            date: item.invoice_date,
          },
        })
        .select()
        .single();

      if (createError) throw createError;

      const { error: updateError } = await supabase
        .from('invoice_list_items')
        .update({
          match_status: 'matched',
          matched_income_id: newIncome.id,
          client_id: customerId,
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Audit log
      await logAuditAction({
        itemId: item.id,
        action: 'create_income',
        oldStatus: item.match_status,
        newStatus: 'matched',
        matchedRecordId: newIncome.id,
        matchedRecordType: 'income',
        details: { invoice_number: item.invoice_number, amount: item.total_amount },
      });

      toast.success('Δημιουργήθηκε νέο έσοδο');
      refreshCurrentView();
      fetchIncomeRecords();
    } catch (error) {
      console.error('Create income error:', error);
      toast.error('Αποτυχία δημιουργίας');
    }
  };

  const linkCustomersToItems = async (importId: string) => {
    try {
      const { data: importItems } = await supabase
        .from('invoice_list_items')
        .select('id, client_name, client_vat')
        .eq('import_id', importId)
        .not('client_vat', 'is', null);

      if (!importItems?.length) return;

      const uniqueVats = [...new Set(importItems.map(i => i.client_vat?.trim()).filter(Boolean))] as string[];
      if (!uniqueVats.length) return;

      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, vat_number')
        .in('vat_number', uniqueVats);

      const vatToCustomerId = new Map<string, string>();
      (existingCustomers || []).forEach(c => {
        if (c.vat_number) vatToCustomerId.set(c.vat_number, c.id);
      });

      const newVats = uniqueVats.filter(v => !vatToCustomerId.has(v));
      let createdCount = 0;

      for (const vat of newVats) {
        const itemWithName = importItems.find(i => i.client_vat?.trim() === vat);
        const name = itemWithName?.client_name || `Πελάτης ${vat}`;
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ name, vat_number: vat })
          .select('id')
          .single();
        if (!custErr && newCust) {
          vatToCustomerId.set(vat, newCust.id);
          createdCount++;
        }
      }

      let linkedCount = 0;
      for (const item of importItems) {
        const vat = item.client_vat?.trim();
        const customerId = vat ? vatToCustomerId.get(vat) : undefined;
        if (customerId) {
          await supabase
            .from('invoice_list_items')
            .update({ client_id: customerId })
            .eq('id', item.id);
          linkedCount++;
        }
      }

      if (createdCount > 0) toast.success(`Δημιουργήθηκαν ${createdCount} νέοι πελάτες`);
      if (linkedCount > 0) toast.success(`Συνδέθηκαν ${linkedCount} τιμολόγια με πελάτες`);
    } catch (error) {
      console.error('Customer linking error:', error);
    }
  };

  const handleLinkFolder = async (item: InvoiceListItem) => {
    toast.info('Επιλογή φακέλου - υπό ανάπτυξη');
  };

  const handleConfirmMatch = async (incomeId: string) => {
    if (!matchingItem) return;
    try {
      const { error } = await supabase
        .from('invoice_list_items')
        .update({ match_status: 'matched', matched_income_id: incomeId })
        .eq('id', matchingItem.id);
      if (error) throw error;

      await logAuditAction({
        itemId: matchingItem.id,
        action: 'match',
        oldStatus: matchingItem.match_status,
        newStatus: 'matched',
        matchedRecordId: incomeId,
        matchedRecordType: 'income',
      });

      toast.success('Αντιστοιχίστηκε επιτυχώς');
      setMatchDialogOpen(false);
      setMatchingItem(null);
      refreshCurrentView();
    } catch (error) {
      toast.error('Αποτυχία αντιστοίχισης');
    }
  };

  const handleUnmatch = async (item: InvoiceListItem) => {
    try {
      const { error } = await supabase
        .from('invoice_list_items')
        .update({ match_status: 'unmatched', matched_income_id: null, matched_folder_id: null })
        .eq('id', item.id);
      if (error) throw error;

      await logAuditAction({
        itemId: item.id,
        action: 'unmatch',
        oldStatus: 'matched',
        newStatus: 'unmatched',
        matchedRecordId: item.matched_income_id || item.matched_folder_id || undefined,
      });

      toast.success('Η αντιστοίχιση αναιρέθηκε');
      refreshCurrentView();
    } catch (error) {
      toast.error('Αποτυχία αναίρεσης');
    }
  };

  const handleViewHistory = async (item: InvoiceListItem) => {
    setHistoryItem(item);
    const entries = await getAuditLog(item.id);
    setAuditEntries(entries);
    setHistoryDialogOpen(true);
  };

  const refreshCurrentView = () => {
    if (viewMode === 'all') {
      fetchAllItems();
    } else if (selectedImportId) {
      fetchItems(selectedImportId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
  };

  const selectedImport = imports.find(i => i.id === selectedImportId);

  const {
    loading: matchingLoading,
    getSuggestionsForItem,
    getBestSuggestion,
    itemsWithSuggestions,
    stats: matchingStats
  } = useInvoiceListMatching(items.map(i => ({
    id: i.id,
    invoice_date: i.invoice_date,
    invoice_number: i.invoice_number || '',
    client_name: i.client_name || '',
    client_vat: i.client_vat || '',
    total_amount: i.total_amount || 0,
    match_status: i.match_status,
  })));

  const stats = {
    total: totalCount || items.length,
    matched: items.filter(i => i.match_status === 'matched').length,
    suggested: matchingStats.total,
    unmatched: items.filter(i => i.match_status === 'unmatched').length - matchingStats.total,
    totalAmount: items.reduce((sum, i) => sum + (i.total_amount || 0), 0),
    aiHigh: matchingStats.high,
    aiMedium: matchingStats.medium,
    aiLow: matchingStats.low,
  };

  const actionLabels: Record<string, string> = {
    match: 'Αντιστοίχιση',
    unmatch: 'Αναίρεση',
    create_income: 'Δημιουργία Εσόδου',
    link_folder: 'Σύνδεση Φακέλου',
    auto_match: 'Αυτόματη Αντιστ.',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Λίστα Παραστατικών</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Εισαγωγή και αντιστοίχιση τιμολογίων από τιμολογιέρα
          </p>
        </div>
        {/* View toggle */}
        {imports.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
              onClick={() => { setViewMode('single'); setPage(1); }}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Ανά Εισαγωγή
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
              onClick={() => { setViewMode('all'); setPage(1); }}
            >
              <Layers className="h-3.5 w-3.5" />
              Όλα ({imports.reduce((s, i) => s + i.row_count, 0)})
            </Button>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <InvoiceListUpload onUploadComplete={handleUploadComplete} />

      {/* Import Selector (single mode) */}
      {viewMode === 'single' && imports.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Εισαγωγή:</span>
            </div>

            <Select value={selectedImportId || ''} onValueChange={(v) => { setSelectedImportId(v); setPage(1); }}>
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
                  {selectedImport.validated_totals ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {selectedImport.validated_totals ? 'Επαληθευμένο' : 'Μη επαληθευμένο'}
                </Badge>
                {selectedImport.period_month && (
                  <Badge variant="outline" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedImport.period_month}
                  </Badge>
                )}

                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={handleDownloadOriginal}>
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

      {/* Multi-period summary (all mode) */}
      {viewMode === 'all' && imports.length > 0 && (
        <Card className="p-4 rounded-2xl">
          <div className="flex items-center gap-4 flex-wrap">
            <Layers className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Ενοποιημένη Προβολή</span>
            <Badge variant="secondary">{imports.length} εισαγωγές</Badge>
            <Badge variant="outline">{totalCount} τιμολόγια σύνολο</Badge>
            <span className="text-sm text-muted-foreground ml-auto">
              Περίοδοι: {[...new Set(imports.map(i => i.period_month).filter(Boolean))].join(', ') || '-'}
            </span>
          </div>
        </Card>
      )}

      {/* Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 rounded-2xl">
            <p className="text-sm text-muted-foreground">Σύνολο</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <p className="text-sm text-green-600 dark:text-green-400">Αντιστοιχισμένα</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.matched}</p>
          </Card>
          <Card className="p-4 rounded-2xl border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <p className="text-sm text-violet-600 dark:text-violet-400">AI Προτάσεις</p>
            </div>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{stats.suggested}</p>
            {stats.suggested > 0 && (
              <div className="flex gap-1 mt-1">
                {stats.aiHigh > 0 && (
                  <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-600 border-green-200">
                    {stats.aiHigh} υψηλό
                  </Badge>
                )}
                {stats.aiMedium > 0 && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 border-yellow-200">
                    {stats.aiMedium} μεσαίο
                  </Badge>
                )}
              </div>
            )}
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-sm text-muted-foreground">Ανοιχτά</p>
            <p className="text-2xl font-bold">{Math.max(0, stats.unmatched)}</p>
          </Card>
          <Card className="p-4 rounded-2xl bg-primary/5 border-primary/20 md:col-span-2">
            <p className="text-sm text-primary">Συνολική Αξία (σελίδα)</p>
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
      ) : (viewMode === 'all' || selectedImportId) && (
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
              onUnmatch={handleUnmatch}
              onViewHistory={handleViewHistory}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              totalCount={totalCount}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
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
              Θα διαγραφεί η εισαγωγή "{selectedImport?.file_name}" και όλα τα {selectedImport?.row_count} τιμολόγια.
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Έξυπνη Αντιστοίχιση
            </DialogTitle>
          </DialogHeader>

          {matchingItem && (
            <div className="space-y-4">
              <Card className="p-4 rounded-xl bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{matchingItem.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">{matchingItem.client_name}</p>
                    {matchingItem.invoice_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(matchingItem.invoice_date), 'dd/MM/yyyy', { locale: el })}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-lg">€{matchingItem.total_amount?.toFixed(2)}</p>
                </div>
              </Card>

              {/* AI Suggestions */}
              {(() => {
                const suggestions = getSuggestionsForItem(matchingItem.id);
                if (suggestions.length > 0) {
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-violet-500" />
                        <p className="text-sm font-medium text-violet-600">AI Προτάσεις</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {suggestions.map((suggestion) => {
                          const styles = getConfidenceStyles(suggestion.confidenceLevel);
                          return (
                            <Card
                              key={suggestion.recordId}
                              className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${styles.bgClass} ${styles.borderClass} border-2`}
                              onClick={() => handleConfirmMatch(suggestion.recordId)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium">{suggestion.record.vendor_or_client || 'Χωρίς τίτλο'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {suggestion.record.date ? format(new Date(suggestion.record.date), 'dd/MM/yyyy', { locale: el }) : '-'}
                                  </p>
                                  <div className="flex gap-1 mt-1">
                                    {suggestion.reasons.map((reason, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">{reason}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`font-bold ${styles.textClass}`}>€{(suggestion.record.amount || 0).toFixed(2)}</p>
                                  <Badge className={`text-xs ${styles.bgClass} ${styles.textClass}`}>
                                    {Math.round(suggestion.confidence * 100)}%
                                    {suggestion.confidenceLevel === 'high' ? ' 🎯' : suggestion.confidenceLevel === 'medium' ? ' ✓' : ''}
                                  </Badge>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Manual search fallback */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Άλλα Πιθανά Έσοδα</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {incomeRecords
                    .filter(inc =>
                      matchingItem.total_amount &&
                      Math.abs((inc.amount || 0) - matchingItem.total_amount) <= matchingItem.total_amount * 0.1
                    )
                    .slice(0, 5)
                    .map((inc) => (
                      <Card
                        key={inc.id}
                        className="p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleConfirmMatch(inc.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm">{inc.merchant || 'Χωρίς τίτλο'}</p>
                            <p className="text-xs text-muted-foreground">
                              {inc.invoice_date ? format(new Date(inc.invoice_date), 'dd/MM/yyyy', { locale: el }) : '-'}
                            </p>
                          </div>
                          <p className="font-medium text-green-600">€{(inc.amount || 0).toFixed(2)}</p>
                        </div>
                      </Card>
                    ))}
                  {incomeRecords.filter(inc =>
                    matchingItem.total_amount &&
                    Math.abs((inc.amount || 0) - matchingItem.total_amount) <= matchingItem.total_amount * 0.1
                  ).length === 0 && getSuggestionsForItem(matchingItem.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Δεν βρέθηκαν έσοδα με παρόμοιο ποσό
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchDialogOpen(false)} className="rounded-xl">
              Ακύρωση
            </Button>
            <Button
              onClick={() => matchingItem && handleCreateIncome(matchingItem)}
              className="rounded-xl gap-2"
            >
              <Check className="h-4 w-4" />
              Δημιουργία Νέου Εσόδου
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Ιστορικό Ενεργειών
            </DialogTitle>
          </DialogHeader>
          {historyItem && (
            <div className="space-y-3">
              <Card className="p-3 rounded-xl bg-muted/50">
                <p className="font-medium text-sm">{historyItem.invoice_number}</p>
                <p className="text-xs text-muted-foreground">{historyItem.client_name} — €{historyItem.total_amount?.toFixed(2)}</p>
              </Card>

              {auditEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Δεν υπάρχει ιστορικό ενεργειών
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {auditEntries.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {entry.action === 'match' ? <Check className="h-4 w-4 text-green-600" /> :
                         entry.action === 'unmatch' ? <RefreshCw className="h-4 w-4 text-amber-600" /> :
                         <Zap className="h-4 w-4 text-violet-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{actionLabels[entry.action] || entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.old_status && `${entry.old_status} → `}{entry.new_status}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
