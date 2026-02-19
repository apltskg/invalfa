import { useState, useEffect } from "react";
import { Plus, Users, Mail, Phone, MapPin, Edit, Trash2, Search, FileSpreadsheet, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/types/database";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [duplicateWarning, setDuplicateWarning] = useState<Customer | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        vat_number: "",
        notes: "",
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        try {
            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setCustomers((data as Customer[]) || []);
        } catch (error: any) {
            console.error("Error fetching customers:", error);
            toast.error("Αποτυχία φόρτωσης πελατών");
        } finally {
            setLoading(false);
        }
    }

    // Check for duplicate VAT number
    const checkDuplicate = (vat: string) => {
        if (!vat || vat.length < 9) {
            setDuplicateWarning(null);
            return;
        }

        const existing = customers.find(c =>
            c.vat_number === vat && c.id !== editingId
        );

        setDuplicateWarning(existing || null);
    };

    const handleVatChange = (vat: string) => {
        setFormData({ ...formData, vat_number: vat });
        checkDuplicate(vat);
    };

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Το όνομα πελάτη είναι υποχρεωτικό");
            return;
        }

        // If there's a duplicate, ask for confirmation
        if (duplicateWarning && !editingId) {
            toast.error("Υπάρχει ήδη πελάτης με αυτό το ΑΦΜ. Επιλέξτε 'Ενημέρωση υπάρχοντος' ή αλλάξτε το ΑΦΜ.");
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from("customers")
                    .update({
                        name: formData.name,
                        contact_person: formData.contact_person,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        vat_number: formData.vat_number,
                        notes: formData.notes,
                    })
                    .eq("id", editingId);

                if (error) throw error;
                toast.success("Ο πελάτης ενημερώθηκε!");
            } else {
                const { error } = await supabase
                    .from("customers")
                    .insert([
                        {
                            name: formData.name,
                            contact_person: formData.contact_person,
                            email: formData.email,
                            phone: formData.phone,
                            address: formData.address,
                            vat_number: formData.vat_number,
                            notes: formData.notes,
                        },
                    ]);

                if (error) throw error;
                toast.success("Ο πελάτης προστέθηκε!");
            }

            setDialogOpen(false);
            resetForm();
            fetchCustomers();
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
                .from("customers")
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
            toast.success("Ο υπάρχων πελάτης ενημερώθηκε!");
            setDialogOpen(false);
            resetForm();
            fetchCustomers();
        } catch (error: any) {
            console.error("Update error:", error);
            toast.error("Αποτυχία ενημέρωσης");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;")) return;

        try {
            const { error } = await supabase
                .from("customers")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Ο πελάτης διαγράφηκε!");
            fetchCustomers();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(`Αποτυχία διαγραφής πελάτη: ${error.message}`);
        }
    }

    function handleEdit(customer: Customer) {
        setEditingId(customer.id);
        setFormData({
            name: customer.name,
            contact_person: customer.contact_person || "",
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            vat_number: customer.vat_number || "",
            notes: customer.notes || "",
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
            notes: "",
        });
    }

    // Get invoice count for each customer (from invoice_list_items)
    const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        async function fetchCounts() {
            const { data } = await supabase
                .from('invoice_list_items')
                .select('client_id')
                .not('client_id', 'is', null);

            if (data) {
                const counts: Record<string, number> = {};
                data.forEach((item: any) => {
                    if (item.client_id) {
                        counts[item.client_id] = (counts[item.client_id] || 0) + 1;
                    }
                });
                setInvoiceCounts(counts);
            }
        }
        fetchCounts();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vat_number?.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Πελάτες</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Πελατολόγιο εταιρείας &mdash; {customers.length} σύνολο</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl gap-2 h-9 text-sm bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4" />
                            Προσθήκη Πελάτη
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">{editingId ? "Επεξεργασία Πελάτη" : "Νέος Πελάτης"}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Ονοματεπώνυμο / Επωνυμία *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="π.χ., Γιώργος Παπαδόπουλος"
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
                                    <Label htmlFor="contact">Υπεύθυνος</Label>
                                    <Input
                                        id="contact"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        placeholder="π.χ., Γραμματεία"
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
                                            <p className="font-medium text-amber-800">Υπάρχει ήδη πελάτης με αυτό το ΑΦΜ</p>
                                            <p className="text-sm text-amber-700 mt-1">
                                                "{duplicateWarning.name}" (ΑΦΜ: {duplicateWarning.vat_number})
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="customer@example.com"
                                        className="rounded-xl h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Τηλέφωνο</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+30 690 000 0000"
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
                                    placeholder="Οδός, Αριθμός, Πόλη"
                                    className="rounded-xl h-11"
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

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Αναζήτηση με όνομα, email ή ΑΦΜ..."
                    className="pl-9 rounded-xl border-slate-200 bg-white text-sm h-9"
                />
            </div>

            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100 border-slate-100" />
                    ))}
                </div>
            ) : filteredCustomers.length === 0 ? (
                <Card className="flex flex-col items-center justify-center rounded-2xl border-dashed border-slate-200 p-16">
                    <Users className="h-10 w-10 text-slate-200 mb-3" />
                    <h3 className="text-base font-semibold text-slate-700 mb-1">Πελάτες δεν βρέθηκαν</h3>
                    <p className="text-sm text-slate-400 text-center max-w-xs mb-5">
                        {searchQuery ? "Τροποποιήστε την αναζήτηση" : "Προσθέστε τον πρώτο σας πελάτη"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setDialogOpen(true)} className="rounded-xl text-sm h-9 bg-blue-600 hover:bg-blue-700">
                            Προσθήκη Πελάτη
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCustomers.map((customer, index) => (
                        <motion.div
                            key={customer.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                        >
                            <Card className="p-5 rounded-2xl bg-white border-slate-200 hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm text-slate-800">{customer.name}</h3>
                                            {customer.vat_number && (
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">ΑΦΜ: {customer.vat_number}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-0.5">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(customer)}
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700"
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(customer.id)}
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    {customer.contact_person && (
                                        <p className="text-xs text-slate-500">{customer.contact_person}</p>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Mail className="h-3 w-3 text-slate-300" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Phone className="h-3 w-3 text-slate-300" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.address && (
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <MapPin className="h-3 w-3 text-slate-300" />
                                            <span className="truncate">{customer.address}</span>
                                        </div>
                                    )}
                                </div>

                                {invoiceCounts[customer.id] && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <Badge variant="secondary" className="gap-1 text-xs rounded-md">
                                            <FileSpreadsheet className="h-3 w-3" />
                                            {invoiceCounts[customer.id]} τιμολόγια
                                        </Badge>
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
