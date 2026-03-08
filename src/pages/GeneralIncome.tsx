import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Upload, FileText, TrendingUp, MoreVertical, Eye,
    Edit, Trash2, FileUp, Loader2, Plus, Search, Calendar, Tag
} from "lucide-react";
import { UploadModal } from "@/components/upload/UploadModal";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMonth } from "@/contexts/MonthContext";
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
import { FormDialog, FormInput, FormRow, FormField, FormDivider } from "@/components/shared/FormDialog";

interface IncomeCategory {
    id: string;
    name_el: string;
    color: string | null;
    icon: string | null;
}

export default function GeneralIncome() {
    const { startDate, endDate, monthKey } = useMonth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [categories, setCategories] = useState<IncomeCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    useEffect(() => { fetchData(); fetchCategories(); }, [monthKey]);

    async function fetchCategories() {
        setCategories([]);
    }

    async function fetchData() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .is("package_id", null)
                .eq("type", "income")
                .gte("invoice_date", startDate)
                .lte("invoice_date", endDate)
                .order("invoice_date", { ascending: false });
            if (error) throw error;
            setInvoices(((data as any[]) || []) as Invoice[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

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
                .update({ expense_category_id: newCategoryId })
                .eq("id", invoiceId);
            if (error) throw error;
            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, expense_category_id: newCategoryId } : inv));
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
                    expense_category_id: (editingInvoice as any).expense_category_id || null,
                })
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
            const { error } = await supabase.from("invoices").delete().eq("id", selectedInvoice.id);
            if (error) throw error;
            toast.success("Διαγράφηκε επιτυχώς");
            fetchData();
        } catch { toast.error("Αποτυχία διαγραφής"); }
        finally { setDeleteDialogOpen(false); setSelectedInvoice(null); }
    };

    const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0);

    const byCategory = invoices.reduce((acc, inv) => {
        const catId = (inv as any).expense_category_id || "__none";
        acc[catId] = (acc[catId] || 0) + (inv.amount || 0);
        return acc;
    }, {} as Record<string, number>);

    const filtered = invoices.filter(i => {
        const matchSearch = !search || (i.merchant || "").toLowerCase().includes(search.toLowerCase());
        const matchCat = !activeCategory || (i as any).expense_category_id === activeCategory;
        return matchSearch && matchCat;
    });

    const getCategoryById = (id: string | null | undefined) =>
        categories.find(c => c.id === id) || null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Γενικά Έσοδα</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Έσοδα εκτός φακέλων</p>
                </div>
                <Button
                    onClick={() => setUploadModalOpen(true)}
                    className="rounded-xl gap-2 h-9 text-sm bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus className="h-4 w-4" />
                    Νέο Έσοδο
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="rounded-xl border-border bg-card border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground">Σύνολο Εσόδων</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">€{totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} καταχωρήσεις</p>
                    </CardContent>
                </Card>
                {categories
                    .filter(cat => byCategory[cat.id])
                    .slice(0, 3)
                    .map(cat => (
                        <Card
                            key={cat.id}
                            className="rounded-xl border-border bg-card cursor-pointer hover:shadow-sm transition-shadow"
                            style={{ borderLeftWidth: 4, borderLeftColor: cat.color || "#10b981" }}
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
                            ? "bg-emerald-600 text-white border-emerald-600"
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
                            style={activeCategory === cat.id ? { backgroundColor: cat.color || "#10b981", borderColor: cat.color || "#10b981" } : {}}
                        >
                            {cat.name_el}
                        </button>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Αναζήτηση πελάτη..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-border bg-card text-sm h-9"
                />
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-border bg-card overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_130px_100px_120px_44px] gap-4 px-5 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <span>Πελάτης / Πηγή</span>
                    <span>Κατηγορία</span>
                    <span>Ημερομηνία</span>
                    <span className="text-right">Ποσό</span>
                    <span />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">
                            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν καταχωρίσεις"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map(inv => {
                            const hasFile = inv.file_path && !inv.file_path.startsWith("manual/");
                            const cat = getCategoryById((inv as any).expense_category_id);
                            return (
                                <div key={inv.id} className="grid grid-cols-[1fr_130px_100px_120px_44px] gap-4 items-center px-5 py-3.5 hover:bg-muted/50 transition-colors group">
                                    {/* Name */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                                            {hasFile
                                                ? <FileText className="h-4 w-4 text-emerald-600" />
                                                : <FileUp className="h-4 w-4 text-muted-foreground/50" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {inv.merchant || "Άγνωστος"}
                                            </p>
                                            {!hasFile && (
                                                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 py-0 mt-0.5">
                                                    Χωρίς αρχείο
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer">
                                                    {cat ? (
                                                        <span
                                                            className="text-[10px] font-medium px-2 py-1 rounded-full border truncate max-w-[120px]"
                                                            style={{ backgroundColor: `${cat.color}18`, color: cat.color || "#10b981", borderColor: `${cat.color}40` }}
                                                            title={cat.name_el}
                                                        >
                                                            {cat.name_el}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border border-dashed hover:bg-muted/80 transition-colors">
                                                            + Κατηγορία
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

                                    {/* Date */}
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                                        {inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : "—"}
                                    </p>

                                    {/* Amount */}
                                    <p className="text-sm font-semibold text-emerald-600 text-right tabular-nums">
                                        +€{(inv.amount || 0).toFixed(2)}
                                    </p>

                                    {/* Actions */}
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

                {/* Table footer summary */}
                {filtered.length > 0 && (
                    <div className="px-5 py-3 bg-muted/50 border-t border-border flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{filtered.length} εγγραφές</span>
                        <span className="text-sm font-bold text-emerald-600">
                            Σύνολο: €{filtered.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                        </span>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <UploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                onUploadComplete={fetchData}
                defaultType="income"
            />

            <FormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                title="Επεξεργασία Εσόδου"
                icon={Edit}
                iconClassName="bg-emerald-500/10 text-emerald-600"
                onSubmit={handleUpdate}
                submitLabel="Αποθήκευση"
                loading={saving}
            >
                {editingInvoice && (
                    <>
                        <FormInput
                            label="Πελάτης / Πηγή"
                            value={editingInvoice.merchant || ""}
                            onChange={(v) => setEditingInvoice({ ...editingInvoice, merchant: v })}
                            placeholder="Όνομα πελάτη..."
                        />
                        <FormField label="Κατηγορία">
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

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Διαγραφή Εσόδου</AlertDialogTitle>
                        <AlertDialogDescription>
                            Να διαγραφεί το έσοδο <strong>{selectedInvoice?.merchant}</strong>{" "}
                            ({selectedInvoice?.amount ? `€${selectedInvoice.amount.toFixed(2)}` : ""}); Η ενέργεια δεν αναιρείται.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-border">Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                            Διαγραφή
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
