import { useState, useEffect } from "react";
import {
    FileText, TrendingDown, MoreVertical, Eye,
    Edit, Trash2, FileUp, Loader2, Plus, Search, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadModal } from "@/components/upload/UploadModal";
import { BulkUploadModal } from "@/components/upload/BulkUploadModal";
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
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export default function GeneralExpenses() {
    const { startDate, endDate, monthKey } = useMonth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchData(); }, [monthKey]);

    async function fetchData() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .is("package_id", null)
                .eq("type", "expense")
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

    async function handleUpdate() {
        if (!editingInvoice) return;
        setSaving(true);
        try {
            const { error } = await supabase.from("invoices")
                .update({ merchant: editingInvoice.merchant, amount: editingInvoice.amount, invoice_date: editingInvoice.invoice_date })
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
    const filtered = invoices.filter(i =>
        !search || (i.merchant || "").toLowerCase().includes(search.toLowerCase())
    );

    // Group by category for the stat breakdown
    const byCategory = invoices.reduce((acc, inv) => {
        const cat = inv.category || "other";
        acc[cat] = (acc[cat] || 0) + (inv.amount || 0);
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Γενικά Έξοδα</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Λειτουργικά έξοδα εκτός φακέλων</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setBulkUploadOpen(true)}
                        className="rounded-xl gap-2 h-9 text-sm border-slate-200"
                    >
                        <FileText className="h-4 w-4" />
                        Μαζική Εισαγωγή
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
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-rose-500">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Σύνολο Εξόδων</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">€{totalAmount.toFixed(2)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{invoices.length} καταχωρήσεις</p>
                    </CardContent>
                </Card>
                {Object.entries(byCategory).slice(0, 3).map(([cat, amt]) => (
                    <Card key={cat} className="rounded-xl border-slate-200 bg-white">
                        <CardContent className="p-4">
                            <p className="text-xs font-medium text-slate-500 capitalize">{cat}</p>
                            <p className="text-lg font-bold text-slate-700 mt-0.5">€{amt.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Αναζήτηση..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200 bg-white text-sm h-9"
                />
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_120px_120px_120px_44px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Πληρωμή / Προμηθευτής</span>
                    <span>Κατηγορία</span>
                    <span>Ημερομηνία</span>
                    <span className="text-right">Ποσό</span>
                    <span />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <TrendingDown className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">
                            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν υπάρχουν καταχωρίσεις"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(inv => {
                            const hasFile = inv.file_path && !inv.file_path.startsWith("manual/");
                            return (
                                <div key={inv.id} className="grid grid-cols-[1fr_120px_120px_120px_44px] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                                            {hasFile
                                                ? <FileText className="h-4 w-4 text-rose-600" />
                                                : <FileUp className="h-4 w-4 text-slate-300" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {inv.merchant || "Άγνωστος Προμηθευτής"}
                                            </p>
                                            {!hasFile && (
                                                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600 py-0 mt-0.5">
                                                    Χωρίς αρχείο
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <Badge variant="secondary" className="w-fit rounded-md text-xs capitalize">
                                        {inv.category || "—"}
                                    </Badge>

                                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-slate-300" />
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
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs text-slate-400">{filtered.length} εγγραφές</span>
                        <span className="text-sm font-bold text-rose-600">
                            Σύνολο: €{filtered.reduce((s, i) => s + (i.amount || 0), 0).toFixed(2)}
                        </span>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} onUploadComplete={fetchData} defaultType="expense" />
            <BulkUploadModal open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} onComplete={fetchData} defaultType="expense" />

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-base">Επεξεργασία Εξόδου</DialogTitle>
                    </DialogHeader>
                    {editingInvoice && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500">Προμηθευτής</Label>
                                <Input
                                    value={editingInvoice.merchant || ""}
                                    onChange={e => setEditingInvoice({ ...editingInvoice, merchant: e.target.value })}
                                    className="rounded-xl border-slate-200 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">Ποσό (€)</Label>
                                    <Input
                                        type="number"
                                        value={editingInvoice.amount || 0}
                                        onChange={e => setEditingInvoice({ ...editingInvoice, amount: parseFloat(e.target.value) })}
                                        className="rounded-xl border-slate-200 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-500">Ημερομηνία</Label>
                                    <Input
                                        type="date"
                                        value={editingInvoice.invoice_date || ""}
                                        onChange={e => setEditingInvoice({ ...editingInvoice, invoice_date: e.target.value })}
                                        className="rounded-xl border-slate-200 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl text-sm border-slate-200">Ακύρωση</Button>
                        <Button onClick={handleUpdate} disabled={saving} className="rounded-xl text-sm bg-blue-600 hover:bg-blue-700">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                            Αποθήκευση
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Διαγραφή Εξόδου</AlertDialogTitle>
                        <AlertDialogDescription>
                            Να διαγραφεί το έξοδο <strong>{selectedInvoice?.merchant}</strong>{" "}
                            ({selectedInvoice?.amount ? `€${selectedInvoice.amount.toFixed(2)}` : ""}); Η ενέργεια δεν αναιρείται.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl border-slate-200">Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">Διαγραφή</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
