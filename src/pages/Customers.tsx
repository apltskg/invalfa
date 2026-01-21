import { useState, useEffect } from "react";
import { Plus, Users, Mail, Phone, MapPin, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Το όνομα πελάτη είναι υποχρεωτικό");
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
        setDialogOpen(true);
    }

    function resetForm() {
        setEditingId(null);
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

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Πελάτες</h1>
                    <p className="mt-1 text-muted-foreground">Διαχείριση πελατολογίου</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-5 w-5" />
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

                            <div className="space-y-2">
                                <Label htmlFor="contact">Υπεύθυνος Επικοινωνίας</Label>
                                <Input
                                    id="contact"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="π.χ., Γραμματεία"
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vat">ΑΦΜ</Label>
                                    <Input
                                        id="vat"
                                        value={formData.vat_number}
                                        onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                                        placeholder="000000000"
                                        className="rounded-xl h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Διεύθυνση</Label>
                                    <Input
                                        id="address"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Οδός, Αριθμός"
                                        className="rounded-xl h-11"
                                    />
                                </div>
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
                            <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-8">
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
                    placeholder="Αναζήτηση πελατών..."
                    className="pl-10 rounded-2xl h-12 bg-muted/50"
                />
            </div>

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-48 animate-pulse rounded-3xl bg-muted/50" />
                    ))}
                </div>
            ) : filteredCustomers.length === 0 ? (
                <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-16 bg-muted/20">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">Δεν βρέθηκαν πελάτες</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">
                        {searchQuery ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης" : "Ξεκινήστε προσθέτοντας τον πρώτο σας πελάτη"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                            Προσθήκη Πρώτου Πελάτη
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCustomers.map((customer, index) => (
                        <motion.div
                            key={customer.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="p-6 rounded-3xl hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-secondary/20">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                            <Users className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{customer.name}</h3>
                                            {customer.contact_person && (
                                                <p className="text-sm text-muted-foreground">{customer.contact_person}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEdit(customer)}
                                            className="h-8 w-8 rounded-xl"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDelete(customer.id)}
                                            className="h-8 w-8 rounded-xl text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    )}
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {(customer.address || customer.vat_number) && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span className="truncate">
                                                {customer.address} {customer.vat_number ? `(ΑΦΜ: ${customer.vat_number})` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {customer.notes && (
                                    <p className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground line-clamp-2">
                                        {customer.notes}
                                    </p>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
