import { useState, useEffect } from "react";
import { Plus, Building2, Mail, Phone, MapPin, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "@/types/database";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false); // Added saving state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null); // Changed to editingId
    const [searchQuery, setSearchQuery] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        invoice_instructions: "", // NEW: How to receive invoices from this supplier
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    async function fetchSuppliers() {
        try {
            const { data, error } = await supabase
                .from("suppliers")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setSuppliers((data as Supplier[]) || []); // Changed error handling slightly
        } catch (error: any) {
            console.error("Error fetching suppliers:", error);
            toast.error("Αποτυχία φόρτωσης προμηθευτών"); // Translated
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!formData.name.trim()) {
            toast.error("Το όνομα προμηθευτή είναι υποχρεωτικό"); // Translated
            return;
        }
        setSaving(true); // Set saving to true
        try {
            if (editingId) { // Changed to editingId
                const { error } = await supabase
                    .from("suppliers")
                    .update({ // Explicitly list fields
                        name: formData.name,
                        contact_person: formData.contact_person,
                        email: formData.email,
                        phone: formData.phone,
                        address: formData.address,
                        notes: formData.notes,
                        invoice_instructions: formData.invoice_instructions,
                    })
                    .eq("id", editingId); // Changed to editingId

                if (error) throw error;
                toast.success("Προμηθευτής ενημερώθηκε!"); // Translated
            } else {
                const { error } = await supabase
                    .from("suppliers")
                    .insert([ // Explicitly list fields
                        {
                            name: formData.name,
                            contact_person: formData.contact_person,
                            email: formData.email,
                            phone: formData.phone,
                            address: formData.address,
                            notes: formData.notes,
                            invoice_instructions: formData.invoice_instructions,
                        },
                    ]);

                if (error) throw error;
                toast.success("Προμηθευτής προστέθηκε!"); // Translated
            }

            setDialogOpen(false);
            resetForm(); // Use resetForm to clear form and editingId
            fetchSuppliers();
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(error.message || "Αποτυχία αποθήκευσης"); // Translated
        } finally {
            setSaving(false); // Reset saving
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον προμηθευτή;")) return; // Translated

        try {
            const { error } = await supabase
                .from("suppliers")
                .delete()
                .eq("id", id);

            if (error) throw error;
            toast.success("Προμηθευτής διαγράφηκε!"); // Translated
            fetchSuppliers();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(`Αποτυχία διαγραφής προμηθευτή: ${error.message}`); // Translated
        }
    }

    function handleEdit(supplier: Supplier) { // Renamed from openEditDialog
        setEditingId(supplier.id); // Changed to setEditingId
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            notes: supplier.notes || "",
            invoice_instructions: supplier.invoice_instructions || "", // Added
        });
        setDialogOpen(true);
    }

    function resetForm() {
        setEditingId(null); // Changed to setEditingId
        setFormData({
            name: "",
            contact_person: "",
            email: "",
            phone: "",
            address: "",
            notes: "",
            invoice_instructions: "", // Added
        });
    }

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                    <p className="mt-1 text-muted-foreground">Manage your travel service providers</p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20">
                            <Plus className="h-5 w-5" />
                            Add Supplier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Company Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Aegean Airlines"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contact">Contact Person</Label>
                                <Input
                                    id="contact"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="e.g., John Doe"
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
                                    <Label htmlFor="phone">Phone</Label>
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
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Street, City, Country"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional information..."
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-11">
                                Cancel
                            </Button>
                            <Button onClick={handleSave} className="rounded-xl h-11 px-8">
                                {editingSupplier ? "Update" : "Create"}
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
                    placeholder="Search suppliers..."
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
                    <h3 className="text-xl font-medium mb-2">No suppliers found</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">
                        {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first supplier"}
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                            Add First Supplier
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
                                            {supplier.contact_person && (
                                                <p className="text-sm text-muted-foreground">{supplier.contact_person}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => openEditDialog(supplier)}
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

                                {supplier.notes && (
                                    <p className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground line-clamp-2">
                                        {supplier.notes}
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
