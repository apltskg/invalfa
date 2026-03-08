import { useState, useEffect, useCallback } from "react";
import {
    FileText, TrendingDown, MoreVertical, Eye,
    Edit, Trash2, FileUp, Loader2, Plus, Search, Calendar, ExternalLink,
    CheckSquare, Square, X, Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveContactIds } from "@/lib/auto-link-contact";
import { Invoice } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadModal } from "@/components/upload/UploadModal";
import { BulkUploadModal } from "@/components/upload/BulkUploadModal";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMonth } from "@/contexts/MonthContext";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormDialog, FormInput, FormRow, FormField, FormDivider, ConfirmDialog } from "@/components/shared/FormDialog";

interface InvoiceListEntry {
    id: string;
    invoice_date: string | null;
    total_amount: number | null;
    client_vat: string | null;
    client_name: string | null;
    invoice_number: string | null;
    match_status: string;
}

interface ExpenseCategory {
    id: string;
    name: string;
    name_el: string;
    color: string | null;
}

export default function GeneralExpenses() {
    const { startDate, endDate, monthKey } = useMonth();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoiceListEntries, setInvoiceListEntries] = useState<InvoiceListEntry[]>([]);
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkCategoryId, setBulkCategoryId] = useState<string>("none");
    const [bulkProcessing, setBulkProcessing] = useState(false);

    // Manual entry state
    const [manualEntryOpen, setManualEntryOpen] = useState(false);
    const [manualEntry, setManualEntry] = useState({ merchant: "", amount: "", invoice_date: "", category_id: "none" });
    const [manualSaving, setManualSaving] = useState(false);

    const isSelecting = selectedIds.size > 0;

    useEffect(() => { fetchData(); fetchCategories(); }, [monthKey]);
    useEffect(() => { setSelectedIds(new Set()); }, [monthKey]);

    async function fetchCategories() {
        const { data } = await supabase.from("expense_categories").select("id,name,name_el,color").order("sort_order");
        setCategories((data as ExpenseCategory[]) || []);
    }

    async function fetchData() {
        setLoading(true);
        try {
            const [expensesRes, invoiceListRes] = await Promise.all([
                supabase
                    .from("invoices")
                    .select("*")
                    .is("package_id", null)
                    .eq("type", "expense")
                    .gte("invoice_date", startDate)
                    .lte("invoice_date", endDate)
                    .order("invoice_date", { ascending: false }),
                (supabase as any)
                    .from("invoice_list")
                    .select("id, invoice_date, total_amount, client_vat, client_name, invoice_number, match_status")
                    .gte("invoice_date", startDate)
                    .lte("invoice_date", endDate)
            ]);
            if (expensesRes.error) throw expensesRes.error;
            setInvoices(((expensesRes.data as any[]) || []) as Invoice[]);
            if (invoiceListRes.data) setInvoiceListEntries(invoiceListRes.data as InvoiceListEntry[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const findInvoiceListMatch = useCallback((inv: Invoice): InvoiceListEntry | null => {
        if (!inv.amount || !invoiceListEntries.length) return null;
        const invDate = inv.invoice_date ? new Date(inv.invoice_date).getTime() : null;
        const invVat = (inv as any).extracted_data?.tax_id || (inv as any).extracted_data?.extracted?.tax_id || null;

        let bestMatch: InvoiceListEntry | null = null;
        let bestScore = 0;

        for (const entry of invoiceListEntries) {
            let score = 0;
            if (entry.total_amount && Math.abs(entry.total_amount - inv.amount) < 0.02) score += 50;
            else if (entry.total_amount && Math.abs(entry.total_amount - inv.amount) < 1) score += 20;
            else continue;

            if (invDate && entry.invoice_date) {
                const entryDate = new Date(entry.invoice_date).getTime();
                const diffDays = Math.abs(invDate - entryDate) / (1000 * 60 * 60 * 24);
                if (diffDays === 0) score += 30;
                else if (diffDays <= 1) score += 20;
                else if (diffDays <= 3) score += 10;
            }

            if (invVat && entry.client_vat && invVat === entry.client_vat) score += 20;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }

        return bestScore >= 50 ? bestMatch : null;
    }, [invoiceListEntries]);

    const handleView = async (inv: Invoice) => {
        if (!inv.file_path || inv.file_path.startsWith("manual/")) {
            toast.info("Δεν υπάρχει αρχείο για αυτή την εγγραφή");
            return;
        }
        const { data, error } = await supabase.storage.from("invoices").createSignedUrl(inv.file_path, 3600);
        if (error || !data?.signedUrl) { toast.error("Αποτυχία φόρτωσης αρχείου"); return; }
        window.open(data.signedUrl, "_blank");
    };

    const updateCategory = async (invoiceId: string, newCategoryId: string | null) => {
        try {
            const { error } = await supabase.from("invoices")
                .update({ expense_category_id: newCategoryId } as any)
                .eq("id", invoiceId);
            if (error) throw error;
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, expense_category_id: newCategoryId } as any : inv));
            toast.success("Η κατηγορία ενημερώθηκε", { duration: 1500 });
        } catch {
            toast.error("Σφάλμα κατά την ενημέρωση κατηγορίας", { duration: 2500 });
        }
    };

    async function handleUpdate() {
        if (!editingInvoice) return;
        setSaving(true);
        try {
            const { error } = await supabase.from("invoices")
                .update({
                    merchant: editingInvoice.merchant,
                    amount: editingInvoice.amount,
                    invoice_date: editingInvoice.invoice_date,
                    expense_category_id: (editingInvoice as any).expense_category_id || null
                } as any)
                .eq("id", editingInvoice.id);
            if (error) throw error;
            toast.success("Ενημερώθηκε επιτυχώς");
            setEditDialogOpen(false);
            fetchData();
        } catch { toast.error("Αποτυχία ενημέρωσης"); }
        finally { setSaving(false); }
    }

    const handleDelete = async () => {
        if (!selectedInvoice) return;
        try {
            if (selectedInvoice.file_path && !selectedInvoice.file_path.startsWith("manual/")) {
                await supabase.storage.from("invoices").remove([selectedInvoice.file_path]);
            }
            const { error } = await supabase.from("invoices").delete().eq("id", selectedInvoice.id);
            if (error) throw error;
            toast.success("Διαγράφηκε επιτυχώς");
            fetchData();
        } catch { toast.error("Αποτυχία διαγραφής"); }
        finally { setDeleteDialogOpen(false); setSelectedInvoice(null); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(i => i.id)));
        }
    };

    const handleBulkCategoryChange = async () => {
        setBulkProcessing(true);
        try {
            const newCatId = bulkCategoryId === "none" ? null : bulkCategoryId;
            const ids = Array.from(selectedIds);
            const { error } = await supabase.from("invoices")
                .update({ expense_category_id: newCatId } as any)
                .in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} εγγραφές ενημερώθηκαν`);
            setSelectedIds(new Set());
            setBulkCategoryDialogOpen(false);
            fetchData();
        } catch {
            toast.error("Σφάλμα μαζικής ενημέρωσης");
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkProcessing(true);
        try {
            const ids = Array.from(selectedIds);
            const toDelete = invoices.filter(i => ids.includes(i.id) && i.file_path && !i.file_path.startsWith("manual/"));
            if (toDelete.length > 0) {
                await supabase.storage.from("invoices").remove(toDelete.map(i => i.file_path));
            }
            const { error } = await supabase.from("invoices").delete().in("id", ids);
            if (error) throw error;
            toast.success(`${ids.length} εγγραφές διαγράφηκαν`);
            setSelectedIds(new Set());
            setBulkDeleteDialogOpen(false);
            fetchData();
        } catch {
            toast.error("Σφάλμα μαζικής διαγραφής");
        } finally {
            setBulkProcessing(false);
        }
    };

    const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);

    const byCategory = invoices.reduce((acc, inv) => {
        const catId = (inv as any).expense_category_id || "__none";
        acc[catId] = (acc[catId] || 0) + (inv.amount || 0);
        return acc;
    }, {} as Record<string, number>);

    const filtered = invoices.filter(i => {
        const matchSearch = !search || (i.merchant || "").toLowerCase().includes(search.toLowerCase());
        const matchCat = !activeCategory || (inv => (inv as any).expense_category_id === activeCategory)(i);
        return matchSearch && matchCat;
    });

    const getCategoryById = (id: string | null | undefined) =>
        categories.find(c => c.id === id) || null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Γενικά Έξοδα</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Λειτουργικά έξοδα εκτός φακέλων</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setBulkUploadOpen(true)}
                        className="rounded-xl gap-2 h-9 text-sm"
                    >
                        <FileText className="h-4 w-4" />
                        Μαζική Εισαγωγή
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setManualEntryOpen(true)}
                        className="rounded-xl gap-2 h-9 text-sm"
                    >
                        <Edit className="h-4 w-4" />
                        Χειροκίνητη
                    </Button>
                    <Button
                        onClick={() => setUploadModalOpen(true)}
                        className="rounded-xl gap-2 h-9 text-sm bg-rose-600 hover:bg-rose-700"
                    >
                        <Plus className="h-4 w-4" />
                        Νέο Έξοδο
                    </Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="rounded-xl border-border bg-card border-l-4 border-l-rose-500">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Σύνολο Εξόδων</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">€{totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{invoices.length} καταχωρήσεις</p>
                    </CardContent>
                </Card>
                {categories
                    .filter(cat => byCategory[cat.id])
                    .slice(0, 3)
                    .map(cat => (
                        <Card
                            key={cat.id}
                            className="rounded-xl border-border bg-card cursor-pointer hover:shadow-sm transition-shadow"
                            style={{ borderLeftWidth: 4, borderLeftColor: cat.color || "#e11d48" }}
                            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                        >
                            <CardContent className="p-4">
                                <p className="text-xs font-medium text-muted-foreground truncate">{cat.name_el}</p>
                                <p className="text-lg font-bold text-foreground mt-0.5">€{(byCategory[cat.id] || 0).toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Category filter chips */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${!activeCategory
                            ? "bg-rose-600 text-white border-rose-600"
                            : "border-border text-muted-foreground hover:border-foreground/30"
                            }`}
                    >
                        Όλα
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors ${activeCategory === cat.id
                                ? "text-white border-transparent"
                                : "border-border text-muted-foreground hover:border-foreground/30"
                                }`}
                            style={activeCategory === cat.id ? { backgroundColor: cat.color || "#e11d48", borderColor: cat.color || "#e11d48" } : {}}
                        >
                            {cat.name_el}
                        </button>
                    ))}
                </div>
            )}

            {/* Search + Bulk Actions Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Αναζήτηση..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 rounded-xl text-sm h-9"
                    />
                </div>

                {isSelecting && (
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-1.5 animate-in fade-in slide-in-from-top-1">
                        <Badge className="bg-primary text-primary-foreground border-0 text-xs">{selectedIds.size}</Badge>
                        <span className="text-xs text-primary font-medium">επιλεγμένα</span>
                        <div className="w-px h-4 bg-primary/20 mx-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-lg px-2"
                            onClick={() => setBulkCategoryDialogOpen(true)}
                        >
                            <Tag className="h-3.5 w-3.5" />
                            Κατηγορία
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-lg px-2"
                            onClick={() => setBulkDeleteDialogOpen(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Διαγραφή
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-lg"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-border bg-card overflow-hidden">
                <div className="grid grid-cols-[32px_1fr_120px_120px_120px_44px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide items-center">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center"
                        title={selectedIds.size === filtered.length ? "Αποεπιλογή όλων" : "Επιλογή όλων"}
                    >
                        {filtered.length > 0 && selectedIds.size === filtered.length
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square className="h-4 w-4 text-muted-foreground/40" />}
                    </button>
                    <span>Πληρωμή / Προμηθευτής</span>
                    <span>Κατηγορία</span>
                    <span>Ημερομηνία</span>
                    <span className="text-right">Ποσό</span>
                    <span />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                    </div>
                ) : filtered.length === 0 ? (
                     <div className="p-16 text-center">
                        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                            <TrendingDown className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν καταχωρίσεις"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map(inv => {
                            const hasFile = inv.file_path && !inv.file_path.startsWith("manual/");
                            const cat = getCategoryById((inv as any).expense_category_id);
                            const isSelected = selectedIds.has(inv.id);
                            return (
                                <div
                                    key={inv.id}
                                    className={`grid grid-cols-[32px_1fr_120px_120px_120px_44px] gap-4 items-center px-5 py-3.5 hover:bg-muted/50 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
                                >
                                    {/* Checkbox */}
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelect(inv.id)}
                                            className="h-4 w-4"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                                            {hasFile
                                                ? <FileText className="h-4 w-4 text-rose-600" />
                                                : <FileUp className="h-4 w-4 text-muted-foreground/40" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {inv.merchant || "Άγνωστος Προμηθευτής"}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {!hasFile && (
                                                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 py-0">
                                                        Χωρίς αρχείο
                                                    </Badge>
                                                )}
                                                {(() => {
                                                    const match = findInvoiceListMatch(inv);
                                                    if (!match) return null;
                                                    return (
                                                        <button
                                                            onClick={() => navigate(`/invoice-list?highlight=${match.id}`)}
                                                            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0 hover:bg-emerald-500/20 transition-colors"
                                                        >
                                                            <ExternalLink className="h-2.5 w-2.5" />
                                                            Λίστα #{match.invoice_number || match.id.slice(0, 6)}
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Category Edit */}
                                    <div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer">
                                                    {cat ? (
                                                        <span
                                                            className="text-[10px] font-medium px-2 py-1 rounded-full border truncate max-w-[120px]"
                                                            style={{ backgroundColor: `${cat.color}18`, color: cat.color || "#e11d48", borderColor: `${cat.color}40` }}
                                                            title={cat.name_el}
                                                        >
                                                            {cat.name_el}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border border-dashed hover:bg-accent transition-colors">
                                                            {inv.category && inv.category !== 'other' ? (
                                                                <span className="capitalize">{inv.category}</span>
                                                            ) : "+ Κατηγορία"}
                                                        </span>
                                                    )}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[200px] max-h-[300px] overflow-y-auto rounded-xl">
                                                <DropdownMenuItem onClick={() => updateCategory(inv.id, null)} className="text-xs text-muted-foreground cursor-pointer">
                                                    Χωρίς κατηγορία
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {categories.map(c => (
                                                    <DropdownMenuItem
                                                        key={c.id}
                                                        onClick={() => updateCategory(inv.id, c.id)}
                                                        className="text-xs flex items-center gap-2 cursor-pointer"
                                                    >
                                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || '#ccc' }} />
                                                        <span className="truncate">{c.name_el}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                                        {inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : "—"}
                                    </p>

                                    <p className="text-sm font-semibold text-rose-600 text-right tabular-nums">
                                        -€{(inv.amount || 0).toFixed(2)}
                                    </p>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                            {hasFile && (
                                                <DropdownMenuItem onClick={() => handleView(inv)} className="gap-2 text-sm">
                                                    <Eye className="h-4 w-4" /> Προβολή
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => { setEditingInvoice(inv); setEditDialogOpen(true); }} className="gap-2 text-sm">
                                                <Edit className="h-4 w-4" /> Επεξεργασία
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => { setSelectedInvoice(inv); setDeleteDialogOpen(true); }}
                                                className="gap-2 text-sm text-rose-600 focus:text-rose-600"
                                            >
                                                <Trash2 className="h-4 w-4" /> Διαγραφή
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })}
                    </div>
                )}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 bg-muted/50 border-t border-border flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{filtered.length} εγγραφές</span>
                        <span className="text-sm font-bold text-rose-600">
                            Σύνολο: €{filtered.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                        </span>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUploadComplete={fetchData} defaultType="expense" />
            <BulkUploadModal open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} onComplete={fetchData} defaultType="expense" />

            {/* Edit Dialog */}
            <FormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                title="Επεξεργασία Εξόδου"
                icon={Edit}
                iconClassName="bg-rose-500/10 text-rose-600"
                onSubmit={handleUpdate}
                submitLabel="Αποθήκευση"
                loading={saving}
            >
                {editingInvoice && (
                    <>
                        <FormInput
                            label="Προμηθευτής"
                            value={editingInvoice.merchant || ""}
                            onChange={(v) => setEditingInvoice({ ...editingInvoice, merchant: v })}
                            placeholder="Όνομα προμηθευτή..."
                        />
                        <FormField label="Κατηγορία Εξόδου">
                            <Select
                                value={(editingInvoice as any).expense_category_id || "none"}
                                onValueChange={v => setEditingInvoice({
                                    ...editingInvoice, ...({
                                        expense_category_id: v === "none" ? null : v
                                    } as any)
                                })}
                            >
                                <SelectTrigger className="rounded-xl h-10 text-sm bg-muted/30 border-border/50">
                                    <SelectValue placeholder="Επιλέξτε κατηγορία..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Χωρίς κατηγορία</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name_el}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <FormDivider />
                        <FormRow>
                            <FormInput
                                label="Ποσό (€)"
                                type="number"
                                value={editingInvoice.amount || 0}
                                onChange={(v) => setEditingInvoice({ ...editingInvoice, amount: parseFloat(v) })}
                            />
                            <FormInput
                                label="Ημερομηνία"
                                type="date"
                                value={editingInvoice.invoice_date || ""}
                                onChange={(v) => setEditingInvoice({ ...editingInvoice, invoice_date: v })}
                                icon={Calendar}
                            />
                        </FormRow>
                    </>
                )}
            </FormDialog>

            {/* Single Delete Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Διαγραφή Εξόδου"
                description={<>Να διαγραφεί το έξοδο <strong>{selectedInvoice?.merchant}</strong>{" "}({selectedInvoice?.amount ? `€${selectedInvoice.amount.toFixed(2)}` : ""});<br/>Η ενέργεια δεν αναιρείται.</>}
                icon={Trash2}
                onConfirm={handleDelete}
            />

            {/* Bulk Category Dialog */}
            <Dialog open={bulkCategoryDialogOpen} onOpenChange={setBulkCategoryDialogOpen}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">Μαζική Αλλαγή Κατηγορίας</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Αλλαγή κατηγορίας για <strong>{selectedIds.size}</strong> επιλεγμένες εγγραφές.
                    </p>
                    <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                        <SelectTrigger className="rounded-xl text-sm h-9">
                            <SelectValue placeholder="Επιλέξτε κατηγορία..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Χωρίς κατηγορία</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                                        {cat.name_el}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setBulkCategoryDialogOpen(false)} className="rounded-xl text-sm">Ακύρωση</Button>
                        <Button onClick={handleBulkCategoryChange} disabled={bulkProcessing} className="rounded-xl text-sm">
                            {bulkProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Εφαρμογή
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <ConfirmDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                title="Μαζική Διαγραφή"
                description={<>Να διαγραφούν <strong>{selectedIds.size}</strong> εγγραφές;<br/>Η ενέργεια δεν αναιρείται.</>}
                icon={Trash2}
                onConfirm={handleBulkDelete}
                confirmLabel={`Διαγραφή ${selectedIds.size} εγγραφών`}
                loading={bulkProcessing}
            />

            {/* Manual Entry Dialog */}
            <FormDialog
                open={manualEntryOpen}
                onOpenChange={setManualEntryOpen}
                title="Χειροκίνητη Καταχώρηση Εξόδου"
                icon={Edit}
                iconClassName="bg-rose-500/10 text-rose-600"
                onSubmit={async () => {
                    const merchant = manualEntry.merchant.trim().slice(0, 100);
                    const amount = parseFloat(manualEntry.amount);
                    if (!merchant) { toast.error("Συμπληρώστε Προμηθευτή"); return; }
                    if (!manualEntry.amount || isNaN(amount) || amount <= 0) { toast.error("Το ποσό πρέπει να είναι μεγαλύτερο από 0"); return; }
                    if (amount > 999999) { toast.error("Μη έγκυρο ποσό"); return; }
                    setManualSaving(true);
                    try {
                        const autoLinked = await resolveContactIds(merchant, "expense");
                        const { error } = await supabase.from("invoices").insert({
                            merchant,
                            amount,
                            invoice_date: manualEntry.invoice_date || null,
                            expense_category_id: manualEntry.category_id === "none" ? null : manualEntry.category_id,
                            type: "expense",
                            file_path: `manual/${Date.now()}`,
                            file_name: "manual-entry",
                            category: "other",
                            ...autoLinked,
                        } as any);
                        if (error) throw error;
                        toast.success("Καταχωρήθηκε επιτυχώς");
                        setManualEntryOpen(false);
                        setManualEntry({ merchant: "", amount: "", invoice_date: "", category_id: "none" });
                        fetchData();
                    } catch { toast.error("Αποτυχία καταχώρησης"); }
                    finally { setManualSaving(false); }
                }}
                submitLabel="Καταχώρηση"
                loading={manualSaving}
                disabled={!manualEntry.merchant || !manualEntry.amount}
            >
                <FormInput
                    label="Προμηθευτής"
                    value={manualEntry.merchant}
                    onChange={v => setManualEntry({ ...manualEntry, merchant: v })}
                    placeholder="Όνομα προμηθευτή..."
                />
                <FormField label="Κατηγορία Εξόδου">
                    <Select value={manualEntry.category_id} onValueChange={v => setManualEntry({ ...manualEntry, category_id: v })}>
                        <SelectTrigger className="rounded-xl h-10 text-sm bg-muted/30 border-border/50">
                            <SelectValue placeholder="Επιλέξτε κατηγορία..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Χωρίς κατηγορία</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name_el}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <FormDivider />
                <FormRow>
                    <FormInput
                        label="Ποσό (€)"
                        type="number"
                        value={manualEntry.amount}
                        onChange={v => setManualEntry({ ...manualEntry, amount: v })}
                        placeholder="0.00"
                    />
                    <FormInput
                        label="Ημερομηνία"
                        type="date"
                        value={manualEntry.invoice_date}
                        onChange={v => setManualEntry({ ...manualEntry, invoice_date: v })}
                        icon={Calendar}
                    />
                </FormRow>
            </FormDialog>
        </div>
    );
}
