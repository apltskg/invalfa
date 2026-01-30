import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Calendar, TrendingUp, MoreVertical, Eye, Edit, Trash2, FileUp } from "lucide-react";
import { UploadModal } from "@/components/upload/UploadModal";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

export default function GeneralIncome() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .is("package_id", null)
                .eq("type", "income")
                .order("invoice_date", { ascending: false });

            if (error) throw error;
            setInvoices(((data as any[]) || []) as Invoice[]);
        } catch (error) {
            console.error("Error fetching general income:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleView = async (inv: Invoice) => {
        if (inv.file_path && inv.file_path.startsWith("manual/")) {
            toast.info("This is a manual entry with no file attached yet");
            return;
        }

        try {
            const { data, error } = await supabase.storage
                .from("invoices")
                .createSignedUrl(inv.file_path, 3600);

            if (error || !data?.signedUrl) {
                toast.error("Failed to get file URL");
                return;
            }

            window.open(data.signedUrl, "_blank");
        } catch (error) {
            console.error("Preview error:", error);
            toast.error("Failed to open file");
        }
    };

    // Edit state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleUpdate() {
        if (!editingInvoice) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('invoices')
                .update({
                    merchant: editingInvoice.merchant,
                    amount: editingInvoice.amount,
                    invoice_date: editingInvoice.invoice_date,
                    category: editingInvoice.category
                })
                .eq('id', editingInvoice.id);

            if (error) throw error;
            toast.success("Ενημερώθηκε επιτυχώς");
            setEditDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error("Αποτυχία ενημέρωσης");
        } finally {
            setSaving(false);
        }
    }

    const handleEdit = (inv: Invoice) => {
        setEditingInvoice(inv);
        setEditDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedInvoice) return;

        try {
            const { error } = await supabase
                .from("invoices")
                .delete()
                .eq("id", selectedInvoice.id);

            if (error) throw error;

            toast.success("Income deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Failed to delete income");
        } finally {
            setDeleteDialogOpen(false);
            setSelectedInvoice(null);
        }
    };

    const confirmDelete = (inv: Invoice) => {
        setSelectedInvoice(inv);
        setDeleteDialogOpen(true);
    };

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const groupedInvoices = invoices.reduce((acc, inv) => {
        const category = inv.category || "General Income";
        if (!acc[category]) acc[category] = [];
        acc[category].push(inv);
        return acc;
    }, {} as Record<string, Invoice[]>);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Γενικά Έσοδα</h1>
                    <p className="mt-1 text-muted-foreground">Διαχείριση εσόδων εκτός φακέλων (π.χ. μεταφορές)</p>
                </div>
                <Button onClick={() => setUploadModalOpen(true)} className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                    <Upload className="h-4 w-4" />
                    Νέο Έσοδο
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 rounded-3xl bg-gradient-to-br from-green-50 to-green-100/50 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Σύνολο Εσόδων</p>
                            <p className="text-2xl font-bold text-green-700">€{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Φόρτωση...</div>
                ) : invoices.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">Δεν υπάρχουν καταχωρήσεις</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Καταχωρήστε έσοδα που δεν συνδέονται με συγκεκριμένα ταξιδιωτικά πακέτα.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedInvoices).map(([category, catInvoices]) => (
                            <div key={category} className="space-y-4">
                                <div className="px-6 py-2 bg-muted/40 flex items-center justify-between border-y border-border/50">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{category}</h3>
                                    <Badge variant="outline" className="font-bold border-muted-foreground/20">
                                        €{catInvoices.reduce((sum, i) => sum + (i.amount || 0), 0).toFixed(2)}
                                    </Badge>
                                </div>
                                <div className="divide-y divide-border/30">
                                    {catInvoices.map((inv) => {
                                        const hasFile = inv.file_path && !inv.file_path.startsWith("manual/");
                                        return (
                                            <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                                        {hasFile ? <FileText className="h-5 w-5" /> : <FileUp className="h-5 w-5 opacity-50" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-foreground">{inv.merchant || "Άγνωστος Πελάτης"}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : "-"}
                                                            </span>
                                                            {!hasFile && (
                                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                                                    No file
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-green-600">+€{(inv.amount || 0).toFixed(2)}</p>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            {hasFile && (
                                                                <DropdownMenuItem onClick={() => handleView(inv)}>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    View File
                                                                </DropdownMenuItem>
                                                            )}
                                                            {!hasFile && (
                                                                <DropdownMenuItem onClick={() => toast.info("Upload file feature coming soon!")}>
                                                                    <FileUp className="h-4 w-4 mr-2" />
                                                                    Upload File
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleEdit(inv)}>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => confirmDelete(inv)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <UploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                onUploadComplete={fetchData}
                defaultType="income"
            />

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Επεξεργασία Εσόδου</DialogTitle>
                    </DialogHeader>
                    {editingInvoice && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Πελάτης/Πηγή</label>
                                <input
                                    value={editingInvoice.merchant || ""}
                                    onChange={(e) => setEditingInvoice({ ...editingInvoice, merchant: e.target.value })}
                                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Ποσό (€)</label>
                                    <input
                                        type="number"
                                        value={editingInvoice.amount || 0}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: parseFloat(e.target.value) })}
                                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Ημερομηνία</label>
                                    <input
                                        type="date"
                                        value={editingInvoice.invoice_date || ""}
                                        onChange={(e) => setEditingInvoice({ ...editingInvoice, invoice_date: e.target.value })}
                                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">Ακύρωση</Button>
                        <Button onClick={handleUpdate} disabled={saving} className="rounded-xl">
                            {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{selectedInvoice?.merchant}</strong> ({selectedInvoice?.amount ? `€${selectedInvoice.amount.toFixed(2)}` : 'amount unknown'}). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
