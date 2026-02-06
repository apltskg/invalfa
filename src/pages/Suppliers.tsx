import { useState, useEffect } from "react";
import { Plus, Building2, Mail, Phone, MapPin, Edit, Trash2, Search, AlertTriangle, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/types/database";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ExtendedSupplier extends Supplier {
    vat_number?: string | null;
    tax_office?: string | null;
    iban?: string | null;
    default_category_id?: string | null;
}

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<ExtendedSupplier[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [duplicateWarning, setDuplicateWarning] = useState<ExtendedSupplier | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        vat_number: "",
        tax_office: "",
        iban: "",
        default_category_id: "",
        notes: "",
        invoice_instructions: "",
    });

    useEffect(() => {
        fetchSuppliers();
        fetchCategories();
    }, []);

    async function fetchSuppliers() {
        try {
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setSuppliers((data as ExtendedSupplier[]) || []);
        } catch (error: any) {
            console.error("Error fetching suppliers:", error);
            toast.error("Αποτυχία φόρτωσης προμηθευτών");
        } finally {
            setLoading(false);
        }
    }

    async function fetchCategories() {
        const { data } = await supabase
            .from('expense_categories')
            .select('*')
            .order('sort_order', { ascending: true });
        if (data) setExpenseCategories(data);
    }

    const checkDuplicate = (vat: string) => {
        if (!vat || vat.length < 9) {
            setDuplicateWarning(null);
            return;
        }
        
        const existing = suppliers.find(s => 
            s.vat_number === vat && s.id !== editingId
        );
        
        setDuplicateWarning(existing || null);
    };

    const handleVatChange = (vat: string) => {
        setFormData({ ...formData, vat_number: vat });
        checkDuplicate(vat);
    };

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Το όνομα προμηθευτή είναι υποχρεωτικό");
            return;
        }
        
        if (duplicateWarning && !editingId) {
            toast.error("Υπάρχει ήδη προμηθευτής με αυτό το ΑΦΜ");
            return;
        }
        
        setSaving(true);
        try {
            const dataToSave = {
                name: formData.name,
                contact_person: formData.contact_person || null,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                vat_number: formData.vat_number || null,
                tax_office: formData.tax_office || null,
                iban: formData.iban || null,
                default_category_id: formData.default_category_id || null,
                notes: formData.notes || null,
                invoice_instructions: formData.invoice_instructions || null,
            };

            if (editingId) {
                const { error } = await supabase
                    .from("suppliers")
                    .update(dataToSave)
                    .eq("id", editingId);

                if (error) throw error;
                toast.success("Προμηθευτής ενημερώθηκε!");
            } else {
                const { error } = await supabase
                    .from("suppliers")
                    .insert([dataToSave]);

                if (error) throw error;
                toast.success("Προμηθευτής προστέθηκε!");
            }

            setDialogOpen(false);
            resetForm();
            fetchSuppliers();
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || "Αποτυχία αποθήκευσης");
        } finally {
            setSaving(false);
        }
    }

    async function handleUpdateExisting() {
        if (!duplicateWarning) return;
        
        setSaving(true);
        try {
            const { error } = await supabase
                .from("suppliers")
                .update({
                    name: formData.name,
                    contact_person: formData.contact_person || duplicateWarning.contact_person,
                    email: formData.email || duplicateWarning.email,
                    phone: formData.phone || duplicateWarning.phone,
                    address: formData.address || duplicateWarning.address,
                    notes: formData.notes || duplicateWarning.notes,
                })
                .eq("id", duplicateWarning.id);

            if (error) throw error;
            toast.success("Ο υπάρχων προμηθευτής ενημερώθηκε!");
            setDialogOpen(false);
            resetForm();
            fetchSuppliers();
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error("Αποτυχία ενημέρωσης");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον προμηθευτή;")) return;

        try {
            const { error } = await supabase
                .from("suppliers")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Προμηθευτής διαγράφηκε!");
            fetchSuppliers();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(`Αποτυχία διαγραφής προμηθευτή: ${error.message}`);
        }
    }

    function handleEdit(supplier: ExtendedSupplier) {
        setEditingId(supplier.id);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            vat_number: supplier.vat_number || "",
            tax_office: supplier.tax_office || "",
            iban: supplier.iban || "",
            default_category_id: supplier.default_category_id || "",
            notes: supplier.notes || "",
            invoice_instructions: supplier.invoice_instructions || "",
        });
        setDuplicateWarning(null);
        setDialogOpen(true);
    }

    function resetForm() {
        setEditingId(null);
        setDuplicateWarning(null);
        setFormData({
            name: "",
            contact_person: "",
            email: "",
            phone: "",
            address: "",
            vat_number: "",
            tax_office: "",
            iban: "",
            default_category_id: "",
            notes: "",
            invoice_instructions: "",
        });
    }

    // Get invoice count for each supplier
    const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});
    
    useEffect(() => {
        async function fetchCounts() {
            const { data } = await supabase
                .from('invoices')
                .select('supplier_id')
                .not('supplier_id', 'is', null);
            
            if (data) {
                const counts: Record<string, number> = {};
                data.forEach((item: any) => {
                    if (item.supplier_id) {
                        counts[item.supplier_id] = (counts[item.supplier_id] || 0) + 1;
                    }
                });
                setInvoiceCounts(counts);
            }
        }
        fetchCounts();
    }, []);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.vat_number?.includes(searchQuery)
    );

    const getCategoryName = (categoryId: string | null | undefined) => {
        if (!categoryId) return null;
        const cat = expenseCategories.find(c => c.id === categoryId);
        return cat?.name_el || null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Προμηθευτές</h1>
                    <p className="mt-1 text-muted-foreground">Διαχείριση παρόχων ταξιδιωτικών υπηρεσιών</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-5 w-5" />
                            Προσθήκη Προμηθευτή
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] rounded-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">{editingId ? "Επεξεργασία Προμηθευτή" : "Νέος Προμηθευτής"}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Επωνυμία Εταιρείας *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="π.χ., Aegean Airlines"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vat">ΑΦΜ</Label>
                                    <Input
                                        id="vat"
                                        value={formData.vat_number}
                                        onChange={(e) => handleVatChange(e.target.value)}
                                        placeholder="000000000"
                                        className={`rounded-xl h-11 ${duplicateWarning ? 'border-amber-500 focus-visible:ring-amber-500' : ''}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tax_office">Δ.Ο.Υ.</Label>
                                    <Input
                                        id="tax_office"
                                        value={formData.tax_office}
                                        onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                                        placeholder="π.χ., Α' Αθηνών"
                                        className="rounded-xl h-11"
                                    />
                                </div>
                            </div>

                            {/* Duplicate Warning */}
                            {duplicateWarning && (
                                <Card className="p-4 rounded-xl border-amber-200 bg-amber-50">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-amber-800">Υπάρχει ήδη προμηθευτής με αυτό το ΑΦΜ</p>
                                            <p className="text-sm text-amber-700 mt-1">
                                                "{duplicateWarning.name}"
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-3 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
                                                onClick={handleUpdateExisting}
                                                disabled={saving}
                                            >
                                                <Check className="h-4 w-4 mr-2" />
                                                Ενημέρωση υπάρχοντος
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="contact">Υπεύθυνος Επικοινωνίας</Label>
                                <Input
                                    id="contact"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="π.χ., Γιάννης Παπαδόπουλος"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="supplier@example.com"
                                        className="rounded-xl h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Τηλέφωνο</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+30 123 456 7890"
                                        className="rounded-xl h-11"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Διεύθυνση</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Οδός, Πόλη, Χώρα"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="iban">IBAN</Label>
                                <Input
                                    id="iban"
                                    value={formData.iban}
                                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                                    placeholder="GR..."
                                    className="rounded-xl h-11 font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Προεπιλεγμένη Κατηγορία Εξόδων</Label>
                                <Select 
                                    value={formData.default_category_id} 
                                    onValueChange={(v) => setFormData({ ...formData, default_category_id: v })}
                                >
                                    <SelectTrigger className="rounded-xl h-11">
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
                                <Label htmlFor="invoice_instructions">Οδηγίες Παραλαβής Τιμολογίων</Label>
                                <Textarea
                                    id="invoice_instructions"
                                    value={formData.invoice_instructions}
                                    onChange={(e) => setFormData({ ...formData, invoice_instructions: e.target.value })}
                                    placeholder="π.χ., Αποστολή με email στο invoices@company.com"
                                    className="rounded-xl min-h-[60px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Σημειώσεις</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Πρόσθετες πληροφορίες..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-11">
                                Ακύρωση
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving || (!!duplicateWarning && !editingId)} 
                                className="rounded-xl h-11 px-8"
                            >
                                {saving ? "Αποθήκευση..." : (editingId ? "Ενημέρωση" : "Δημιουργία")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Αναζήτηση με όνομα, email ή ΑΦΜ..."
                    className="pl-10 rounded-2xl h-12 bg-muted/50"
                />
            </div>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-48 animate-pulse rounded-3xl bg-muted/50" />
                    ))}
                </div>
            ) : filteredSuppliers.length === 0 ? (
                <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-16 bg-muted/20">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">Δεν βρέθηκαν προμηθευτές</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">
                        {searchQuery ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης" : "Ξεκινήστε προσθέτοντας τον πρώτο σας προμηθευτή"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                            Προσθήκη Πρώτου Προμηθευτή
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSuppliers.map((supplier, index) => (
                        <motion.div
                            key={supplier.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="p-6 rounded-3xl hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-secondary/20">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{supplier.name}</h3>
                                            {supplier.vat_number && (
                                                <p className="text-xs text-muted-foreground font-mono">ΑΦΜ: {supplier.vat_number}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(supplier)}
                                            className="h-8 w-8 rounded-xl"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(supplier.id)}
                                            className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {supplier.contact_person && (
                                        <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <span className="truncate">{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            <span>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {supplier.address && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span className="truncate">{supplier.address}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Category & invoice count */}
                                <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                                    {getCategoryName(supplier.default_category_id) && (
                                        <Badge variant="secondary">
                                            {getCategoryName(supplier.default_category_id)}
                                        </Badge>
                                    )}
                                    {invoiceCounts[supplier.id] && (
                                        <Badge variant="outline" className="gap-1">
                                            <FileText className="h-3 w-3" />
                                            {invoiceCounts[supplier.id]} έξοδα
                                        </Badge>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
