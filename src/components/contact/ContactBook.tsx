import { useState, useEffect, useMemo } from "react";
import {
    Plus, Search, Edit, Trash2, Mail, Phone, MapPin,
    Building2, Users, FileText, TrendingUp, TrendingDown,
    AlertTriangle, Check, X, ChevronRight, Star,
    Receipt, CreditCard, Hash, Landmark, ArrowUpRight,
    ArrowDownRight, Clock, CheckCircle2, ExternalLink,
    SlidersHorizontal, MoreHorizontal, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Customer, Supplier } from "@/types/database";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ─── types ────────────────────────────────────────────────────────── */
type Mode = "customers" | "suppliers";

interface InvoiceRow {
    id: string;
    merchant: string | null;
    amount: number | null;
    invoice_date: string | null;
    category: string | null;
    type: string | null;
    file_path: string | null;
}

interface EntityStats {
    totalAmount: number;
    invoiceCount: number;
    lastActivity: string | null;
    avgAmount: number;
}

/* ─── helpers ──────────────────────────────────────────────────────── */
function initials(name: string) {
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
    const colors = [
        "from-blue-500 to-blue-600",
        "from-violet-500 to-purple-600",
        "from-emerald-500 to-teal-600",
        "from-amber-500 to-orange-600",
        "from-rose-500 to-pink-600",
        "from-cyan-500 to-blue-600",
        "from-indigo-500 to-blue-600",
    ];
    const i = name.charCodeAt(0) % colors.length;
    return colors[i];
}

function fmt(n: number) {
    return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

/* ─── Contact Book (shared by Customers + Suppliers) ──────────────── */
interface ContactBookProps {
    mode: Mode;
}

export default function ContactBook({ mode }: ContactBookProps) {
    const isCustomers = mode === "customers";

    /* list state */
    const [entities, setEntities] = useState<(Customer | Supplier)[]>([]);
    const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "amount" | "activity">("name");

    /* panel state */
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [panelTab, setPanelTab] = useState<"overview" | "invoices">("overview");

    /* form state */
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<any | null>(null);

    const emptyForm = {
        name: "", contact_person: "", email: "", phone: "",
        address: "", vat_number: "", notes: "",
        // supplier-only
        tax_office: "", iban: "", default_category_id: "", invoice_instructions: "",
    };
    const [formData, setFormData] = useState(emptyForm);

    /* ── fetch ─────────────────────────────────────────────────────── */
    useEffect(() => { fetchAll(); }, [mode]);

    async function fetchAll() {
        setLoading(true);
        const table = isCustomers ? "customers" : "suppliers";
        const [entResult, invResult, catResult] = await Promise.all([
            supabase.from(table).select("*").order("name"),
            supabase.from("invoices")
                .select("id,merchant,amount,invoice_date,category,type,file_path," + (isCustomers ? "customer_id" : "supplier_id"))
                .eq("type", isCustomers ? "income" : "expense"),
            isCustomers ? Promise.resolve({ data: [] }) :
                supabase.from("expense_categories").select("id,name_el,color").order("sort_order"),
        ]);

        if (entResult.data) setEntities(entResult.data as any);
        if (invResult.data) setInvoices(invResult.data as any);
        if (catResult.data) setExpenseCategories(catResult.data);
        setLoading(false);
    }

    /* ── derived ────────────────────────────────────────────────────── */
    const entitiesWithStats = useMemo(() => {
        const idKey = isCustomers ? "customer_id" : "supplier_id";
        return entities.map(e => {
            const rows = (invoices as any[]).filter(inv => inv[idKey] === e.id);
            const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);
            const lastRow = rows.sort((a, b) =>
                (b.invoice_date || "").localeCompare(a.invoice_date || ""))[0];
            return {
                ...e,
                stats: {
                    totalAmount,
                    invoiceCount: rows.length,
                    lastActivity: lastRow?.invoice_date || null,
                    avgAmount: rows.length ? totalAmount / rows.length : 0,
                } as EntityStats,
            };
        });
    }, [entities, invoices, mode]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        let list = entitiesWithStats.filter(e =>
            e.name.toLowerCase().includes(q) ||
            (e as any).email?.toLowerCase().includes(q) ||
            (e as any).vat_number?.includes(q) ||
            (e as any).contact_person?.toLowerCase().includes(q)
        );
        if (sortBy === "amount") list = [...list].sort((a, b) => b.stats.totalAmount - a.stats.totalAmount);
        if (sortBy === "activity") list = [...list].sort((a, b) =>
            (b.stats.lastActivity || "").localeCompare(a.stats.lastActivity || ""));
        return list;
    }, [entitiesWithStats, searchQuery, sortBy]);

    const selected = entitiesWithStats.find(e => e.id === selectedId);
    const selectedInvoices = useMemo(() => {
        if (!selectedId) return [];
        const idKey = isCustomers ? "customer_id" : "supplier_id";
        return (invoices as any[])
            .filter(inv => inv[idKey] === selectedId)
            .sort((a, b) => (b.invoice_date || "").localeCompare(a.invoice_date || ""));
    }, [selectedId, invoices, mode]);

    /* ── CRUD ──────────────────────────────────────────────────────── */
    function checkDuplicate(vat: string) {
        if (!vat || vat.length < 9) { setDuplicateWarning(null); return; }
        const existing = entities.find((e: any) => e.vat_number === vat && e.id !== editingId);
        setDuplicateWarning(existing || null);
    }

    async function handleSave() {
        if (!formData.name.trim()) { toast.error("Το όνομα είναι υποχρεωτικό"); return; }
        if (duplicateWarning && !editingId) { toast.error("Υπάρχει ήδη με αυτό το ΑΦΜ"); return; }

        setSaving(true);
        const table = isCustomers ? "customers" : "suppliers";
        const payload: any = {
            name: formData.name, contact_person: formData.contact_person || null,
            email: formData.email || null, phone: formData.phone || null,
            address: formData.address || null, vat_number: formData.vat_number || null,
            notes: formData.notes || null,
        };
        if (!isCustomers) {
            payload.tax_office = formData.tax_office || null;
            payload.iban = formData.iban || null;
            payload.default_category_id = formData.default_category_id || null;
            payload.invoice_instructions = formData.invoice_instructions || null;
        }

        try {
            const { error } = editingId
                ? await supabase.from(table).update(payload).eq("id", editingId)
                : await supabase.from(table).insert([payload]);
            if (error) throw error;
            toast.success(editingId ? "Ενημερώθηκε!" : "Προστέθηκε!");
            setDialogOpen(false);
            resetForm();
            fetchAll();
        } catch (e: any) { toast.error(e.message || "Σφάλμα"); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Διαγραφή; Η ενέργεια δεν αναιρείται.")) return;
        const table = isCustomers ? "customers" : "suppliers";
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) { toast.error("Αποτυχία διαγραφής"); return; }
        toast.success("Διαγράφηκε");
        if (selectedId === id) setSelectedId(null);
        fetchAll();
    }

    function openEdit(e: any) {
        setEditingId(e.id);
        setFormData({
            name: e.name || "", contact_person: e.contact_person || "",
            email: e.email || "", phone: e.phone || "",
            address: e.address || "", vat_number: e.vat_number || "",
            notes: e.notes || "", tax_office: e.tax_office || "",
            iban: e.iban || "", default_category_id: e.default_category_id || "",
            invoice_instructions: e.invoice_instructions || "",
        });
        setDuplicateWarning(null);
        setDialogOpen(true);
    }

    function resetForm() {
        setEditingId(null);
        setDuplicateWarning(null);
        setFormData(emptyForm);
    }

    /* ── render ─────────────────────────────────────────────────────── */
    return (
        <div className="flex h-[calc(100vh-56px)] gap-0 -mx-6 -my-6">

            {/* ═══ LEFT: LIST PANEL ═══════════════════════════════════ */}
            <div className={cn(
                "flex flex-col border-r border-slate-100 bg-white transition-all duration-300",
                selectedId ? "w-[380px] shrink-0" : "flex-1"
            )}>
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">
                                {isCustomers ? "Πελάτες" : "Προμηθευτές"}
                            </h1>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {filtered.length} {filtered.length === 1 ? (isCustomers ? "πελάτης" : "προμηθευτής") : (isCustomers ? "πελάτες" : "προμηθευτές")}
                            </p>
                        </div>
                        <Button
                            onClick={() => { resetForm(); setDialogOpen(true); }}
                            className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-700 text-white gap-1.5 text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            Νέος
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Αναζήτηση..."
                                className="pl-8 h-9 text-sm rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                            />
                        </div>
                        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="h-9 w-auto px-3 rounded-xl border-slate-200 bg-slate-50 text-sm gap-1.5">
                                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Α-Ω</SelectItem>
                                <SelectItem value="amount">Κατά ποσό</SelectItem>
                                <SelectItem value="activity">Τελευταία δρ.</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                            {isCustomers
                                ? <Users className="h-10 w-10 text-slate-200 mb-3" />
                                : <Building2 className="h-10 w-10 text-slate-200 mb-3" />}
                            <p className="text-sm font-medium text-slate-500 mb-1">
                                {searchQuery ? "Δεν βρέθηκαν αποτελέσματα" : `Δεν υπάρχουν ${isCustomers ? "πελάτες" : "προμηθευτές"}`}
                            </p>
                            {!searchQuery && (
                                <Button
                                    size="sm"
                                    onClick={() => { resetForm(); setDialogOpen(true); }}
                                    className="mt-3 rounded-xl text-xs"
                                >
                                    Προσθήκη
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="p-2">
                            {filtered.map((entity, idx) => (
                                <motion.button
                                    key={entity.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    onClick={() => { setSelectedId(entity.id); setPanelTab("overview"); }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                                        selectedId === entity.id
                                            ? "bg-slate-900 text-white"
                                            : "hover:bg-slate-50 text-slate-900"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={cn(
                                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold",
                                        selectedId === entity.id
                                            ? "bg-white/20"
                                            : `bg-gradient-to-br ${avatarColor(entity.name)}`
                                    )}>
                                        {initials(entity.name)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm font-semibold truncate", selectedId === entity.id ? "text-white" : "text-slate-900")}>
                                            {entity.name}
                                        </p>
                                        <p className={cn("text-xs truncate mt-0.5", selectedId === entity.id ? "text-white/60" : "text-slate-400")}>
                                            {(entity as any).email || (entity as any).vat_number
                                                ? ((entity as any).email || `ΑΦΜ ${(entity as any).vat_number}`)
                                                : (entity.stats.invoiceCount > 0
                                                    ? `${entity.stats.invoiceCount} ${isCustomers ? "τιμολόγια" : "έξοδα"}`
                                                    : "Χωρίς ιστορικό"
                                                )}
                                        </p>
                                    </div>

                                    {/* Amount */}
                                    {entity.stats.totalAmount > 0 && (
                                        <div className="text-right shrink-0">
                                            <p className={cn("text-sm font-bold tabular-nums", selectedId === entity.id ? "text-white" : "text-slate-800")}>
                                                {fmt(entity.stats.totalAmount)}
                                            </p>
                                            <p className={cn("text-[10px]", selectedId === entity.id ? "text-white/50" : "text-slate-400")}>
                                                {entity.stats.invoiceCount} αρχεία
                                            </p>
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ RIGHT: DETAIL PANEL ════════════════════════════════ */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex-1 flex flex-col bg-slate-50 overflow-hidden"
                    >
                        {/* Panel header */}
                        <div className="bg-white border-b border-slate-100 px-8 pt-8 pb-0">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    {/* Big avatar */}
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shrink-0",
                                        `bg-gradient-to-br ${avatarColor(selected.name)}`
                                    )}>
                                        {initials(selected.name)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {(selected as any).vat_number && (
                                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    ΑΦΜ {(selected as any).vat_number}
                                                </span>
                                            )}
                                            {(selected as any).email && (
                                                <a href={`mailto:${(selected as any).email}`}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />{(selected as any).email}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEdit(selected)}
                                        className="rounded-xl h-8 px-3 text-xs gap-1.5 border-slate-200"
                                    >
                                        <Edit className="h-3.5 w-3.5" /> Επεξεργασία
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedId(null)}
                                        className="rounded-xl h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* KPI strip */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[
                                    {
                                        label: isCustomers ? "Σύνολο εσόδων" : "Σύνολο εξόδων",
                                        value: fmt(selected.stats.totalAmount),
                                        icon: isCustomers ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
                                        color: isCustomers ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
                                    },
                                    {
                                        label: "Αριθμός εγγραφών",
                                        value: String(selected.stats.invoiceCount),
                                        icon: <FileText className="h-4 w-4" />,
                                        color: "text-blue-600 bg-blue-50",
                                    },
                                    {
                                        label: "Μέσο ποσό",
                                        value: selected.stats.avgAmount > 0 ? fmt(selected.stats.avgAmount) : "—",
                                        icon: <Receipt className="h-4 w-4" />,
                                        color: "text-violet-600 bg-violet-50",
                                    },
                                ].map((kpi, i) => (
                                    <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3", kpi.color)}>
                                            {kpi.icon}
                                        </div>
                                        <p className="text-xl font-black text-slate-900 tabular-nums">{kpi.value}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 -mb-px">
                                {(["overview", "invoices"] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setPanelTab(tab)}
                                        className={cn(
                                            "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                                            panelTab === tab
                                                ? "border-slate-900 text-slate-900"
                                                : "border-transparent text-slate-400 hover:text-slate-700"
                                        )}
                                    >
                                        {tab === "overview" ? "Πληροφορίες" : `Ιστορικό (${selectedInvoices.length})`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Panel body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {panelTab === "overview" && (
                                <div className="space-y-6">
                                    {/* Contact details grid */}
                                    <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Στοιχεία επικοινωνίας</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { icon: <User className="h-4 w-4 text-slate-400" />, label: "Υπεύθυνος", val: (selected as any).contact_person },
                                                { icon: <Mail className="h-4 w-4 text-slate-400" />, label: "Email", val: (selected as any).email },
                                                { icon: <Phone className="h-4 w-4 text-slate-400" />, label: "Τηλέφωνο", val: (selected as any).phone },
                                                { icon: <MapPin className="h-4 w-4 text-slate-400" />, label: "Διεύθυνση", val: (selected as any).address },
                                                { icon: <Hash className="h-4 w-4 text-slate-400" />, label: "ΑΦΜ", val: (selected as any).vat_number },
                                                !isCustomers && { icon: <Landmark className="h-4 w-4 text-slate-400" />, label: "IBAN", val: (selected as any).iban },
                                                !isCustomers && { icon: <Building2 className="h-4 w-4 text-slate-400" />, label: "Δ.Ο.Υ.", val: (selected as any).tax_office },
                                            ].filter(Boolean).map((item: any, i) => (
                                                item.val ? (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                                                            {item.icon}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{item.label}</p>
                                                            <p className="text-sm text-slate-800 font-medium mt-0.5">{item.val}</p>
                                                        </div>
                                                    </div>
                                                ) : null
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {(selected as any).notes && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                                            <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wide">Σημειώσεις</p>
                                            <p className="text-sm text-amber-800 leading-relaxed">{(selected as any).notes}</p>
                                        </div>
                                    )}

                                    {/* Supplier: invoice instructions */}
                                    {!isCustomers && (selected as any).invoice_instructions && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                                            <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Οδηγίες τιμολογίων</p>
                                            <p className="text-sm text-blue-800 leading-relaxed">{(selected as any).invoice_instructions}</p>
                                        </div>
                                    )}

                                    {/* Recent invoices preview */}
                                    {selectedInvoices.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-slate-100 p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-semibold text-slate-700">Πρόσφατες συναλλαγές</h3>
                                                <button
                                                    onClick={() => setPanelTab("invoices")}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    Όλες <ChevronRight className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {selectedInvoices.slice(0, 4).map(inv => (
                                                    <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                            isCustomers ? "bg-emerald-50" : "bg-rose-50"
                                                        )}>
                                                            {isCustomers
                                                                ? <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                                                                : <ArrowUpRight className="h-4 w-4 text-rose-600" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                                {inv.merchant || "—"}
                                                            </p>
                                                            {inv.invoice_date && (
                                                                <p className="text-xs text-slate-400">
                                                                    {format(parseISO(inv.invoice_date), "d MMM yyyy", { locale: el })}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {inv.amount != null && (
                                                            <p className={cn(
                                                                "text-sm font-bold tabular-nums",
                                                                isCustomers ? "text-emerald-600" : "text-rose-600"
                                                            )}>
                                                                {isCustomers ? "+" : "-"}{fmt(inv.amount)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Delete zone */}
                                    <div className="border border-red-100 rounded-2xl p-5 bg-red-50/50">
                                        <p className="text-sm font-semibold text-red-700 mb-1">Επικίνδυνη ζώνη</p>
                                        <p className="text-xs text-red-500 mb-3">Η διαγραφή δεν μπορεί να αναιρεθεί. Τα τιμολόγια δεν θα διαγραφούν.</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(selected.id)}
                                            className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl text-xs h-8"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                            Διαγραφή {isCustomers ? "πελάτη" : "προμηθευτή"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {panelTab === "invoices" && (
                                <div className="space-y-3">
                                    {selectedInvoices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <FileText className="h-10 w-10 text-slate-200 mb-3" />
                                            <p className="text-sm text-slate-400">
                                                {isCustomers ? "Δεν υπάρχουν έσοδα από αυτόν τον πελάτη" : "Δεν υπάρχουν έξοδα από αυτόν τον προμηθευτή"}
                                            </p>
                                        </div>
                                    ) : (
                                        selectedInvoices.map((inv, i) => (
                                            <motion.div
                                                key={inv.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                                        isCustomers ? "bg-emerald-50" : "bg-rose-50"
                                                    )}>
                                                        {isCustomers
                                                            ? <ArrowDownRight className="h-5 w-5 text-emerald-600" />
                                                            : <ArrowUpRight className="h-5 w-5 text-rose-600" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">
                                                            {inv.merchant || "Χωρίς περιγραφή"}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {inv.invoice_date && (
                                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {format(parseISO(inv.invoice_date), "d MMM yyyy", { locale: el })}
                                                                </span>
                                                            )}
                                                            {inv.category && (
                                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                                                    {inv.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        {inv.amount != null && (
                                                            <p className={cn(
                                                                "text-base font-black tabular-nums",
                                                                isCustomers ? "text-emerald-600" : "text-rose-500"
                                                            )}>
                                                                {isCustomers ? "+" : "-"}€{inv.amount.toLocaleString("el-GR", { minimumFractionDigits: 2 })}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state when nothing selected */}
            {!selectedId && !loading && filtered.length > 0 && (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-center p-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        {isCustomers ? <Users className="h-7 w-7 text-slate-300" /> : <Building2 className="h-7 w-7 text-slate-300" />}
                    </div>
                    <p className="text-sm font-medium text-slate-400">Επίλεξε {isCustomers ? "πελάτη" : "προμηθευτή"} για να δεις την καρτέλα</p>
                </div>
            )}

            {/* ═══ DIALOG: Add / Edit ══════════════════════════════════ */}
            <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[520px] rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {editingId
                                ? `Επεξεργασία ${isCustomers ? "Πελάτη" : "Προμηθευτή"}`
                                : `Νέος ${isCustomers ? "Πελάτης" : "Προμηθευτής"}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Επωνυμία *</Label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder={isCustomers ? "π.χ., Γιώργος Παπαδόπουλος" : "π.χ., Aegean Airlines"}
                                className="h-11 rounded-xl" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* VAT */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ΑΦΜ</Label>
                                <Input
                                    value={formData.vat_number}
                                    onChange={e => { setFormData({ ...formData, vat_number: e.target.value }); checkDuplicate(e.target.value); }}
                                    placeholder="000000000"
                                    className={cn("h-11 rounded-xl font-mono", duplicateWarning ? "border-amber-400" : "")}
                                />
                            </div>
                            {/* Contact */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Υπεύθυνος</Label>
                                <Input value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Όνομα" className="h-11 rounded-xl" />
                            </div>
                        </div>

                        {/* Duplicate warning */}
                        {duplicateWarning && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    Υπάρχει ήδη <strong>{duplicateWarning.name}</strong> με αυτό το ΑΦΜ.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</Label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    type="email" placeholder="email@example.com" className="h-11 rounded-xl" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Τηλέφωνο</Label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+30 690 000 0000" className="h-11 rounded-xl" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Διεύθυνση</Label>
                            <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Οδός, Αριθμός, Πόλη" className="h-11 rounded-xl" />
                        </div>

                        {/* Supplier-only fields */}
                        {!isCustomers && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Δ.Ο.Υ.</Label>
                                        <Input value={formData.tax_office} onChange={e => setFormData({ ...formData, tax_office: e.target.value })}
                                            placeholder="Α' Αθηνών" className="h-11 rounded-xl" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">IBAN</Label>
                                        <Input value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })}
                                            placeholder="GR..." className="h-11 rounded-xl font-mono" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Προεπιλεγμένη κατηγορία εξόδου</Label>
                                    <Select value={formData.default_category_id} onValueChange={v => setFormData({ ...formData, default_category_id: v })}>
                                        <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                                        <SelectContent>
                                            {expenseCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name_el}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Οδηγίες τιμολογίων</Label>
                                    <Textarea value={formData.invoice_instructions}
                                        onChange={e => setFormData({ ...formData, invoice_instructions: e.target.value })}
                                        placeholder="π.χ., Αποστολή με email στο invoices@..." className="rounded-xl min-h-[60px]" />
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Σημειώσεις</Label>
                            <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Πρόσθετες πληροφορίες..." className="rounded-xl min-h-[80px]" />
                        </div>
                    </div>

                    <DialogFooter className="pt-4 gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl h-11 flex-1">
                            Ακύρωση
                        </Button>
                        <Button onClick={handleSave} disabled={saving || (!!duplicateWarning && !editingId)}
                            className="rounded-xl h-11 flex-1 bg-slate-900 hover:bg-slate-700">
                            {saving ? "Αποθήκευση..." : (editingId ? "Ενημέρωση" : "Δημιουργία")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
