import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Search, Plus, User, Plane, CreditCard, Phone, Mail,
    Calendar, Copy, ChevronRight, X, Check, Edit3, Trash2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface Traveller {
    id: string;
    first_name: string;
    last_name: string;
    passport_number: string | null;
    passport_expiry: string | null;
    id_number: string | null;
    id_expiration: string | null;
    birth_date: string | null;
    miles_bonus_card: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
}

const EMPTY: Traveller = {
    id: "", first_name: "", last_name: "", passport_number: null,
    passport_expiry: null, id_number: null, id_expiration: null,
    birth_date: null, miles_bonus_card: null, phone: null, email: null, notes: null,
};

function fmtDate(d: string | null) {
    if (!d) return "—";
    try { return format(new Date(d), "dd/MM/yyyy"); } catch { return d; }
}

function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
}

function getInitials(t: Traveller) {
    return `${t.first_name?.[0] || ""}${t.last_name?.[0] || ""}`.toUpperCase();
}

function getAge(birthDate: string | null) {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / 31557600000);
}

// ── Color palette for avatars ──
const AVATAR_COLORS = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-cyan-500 to-sky-600",
    "from-lime-500 to-green-600",
    "from-fuchsia-500 to-pink-600",
];

function avatarColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Copy-all summary ──
function buildSummary(t: Traveller) {
    const lines: string[] = [];
    lines.push(`${t.first_name} ${t.last_name}`);
    if (t.birth_date) lines.push(`DOB: ${fmtDate(t.birth_date)}`);
    if (t.passport_number) lines.push(`Passport: ${t.passport_number}${t.passport_expiry ? ` (exp: ${fmtDate(t.passport_expiry)})` : ""}`);
    if (t.id_number) lines.push(`ID: ${t.id_number}${t.id_expiration ? ` (exp: ${fmtDate(t.id_expiration)})` : ""}`);
    if (t.miles_bonus_card) lines.push(`Miles: ${t.miles_bonus_card}`);
    if (t.phone) lines.push(`Tel: ${t.phone}`);
    if (t.email) lines.push(`Email: ${t.email}`);
    return lines.join("\n");
}

export default function Travellers() {
    const [travellers, setTravellers] = useState<Traveller[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Traveller | null>(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<Traveller>(EMPTY);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchTravellers(); }, []);

    async function fetchTravellers() {
        const { data, error } = await (supabase as any)
            .from("travellers")
            .select("*")
            .order("last_name", { ascending: true });
        if (error) { toast.error("Αποτυχία φόρτωσης"); console.error(error); }
        else setTravellers(data || []);
        setLoading(false);
    }

    const filtered = useMemo(() => {
        if (!search.trim()) return travellers;
        const q = search.toLowerCase();
        return travellers.filter(t =>
            `${t.first_name} ${t.last_name}`.toLowerCase().includes(q) ||
            t.passport_number?.toLowerCase().includes(q) ||
            t.id_number?.toLowerCase().includes(q) ||
            t.phone?.includes(q) ||
            t.email?.toLowerCase().includes(q) ||
            t.miles_bonus_card?.includes(q)
        );
    }, [travellers, search]);

    async function handleSave() {
        setSaving(true);
        const payload = {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            passport_number: form.passport_number || null,
            passport_expiry: form.passport_expiry || null,
            id_number: form.id_number || null,
            id_expiration: form.id_expiration || null,
            birth_date: form.birth_date || null,
            miles_bonus_card: form.miles_bonus_card || null,
            phone: form.phone || null,
            email: form.email || null,
            notes: form.notes || null,
        };

        if (!payload.first_name || !payload.last_name) {
            toast.error("Όνομα και Επώνυμο απαιτούνται");
            setSaving(false);
            return;
        }

        if (form.id) {
            // Update
            const { error } = await (supabase as any)
                .from("travellers")
                .update(payload)
                .eq("id", form.id);
            if (error) { toast.error("Αποτυχία ενημέρωσης"); console.error(error); }
            else { toast.success("Ενημερώθηκε!"); setEditing(false); }
        } else {
            // Insert
            const { error } = await (supabase as any)
                .from("travellers")
                .insert(payload);
            if (error) { toast.error("Αποτυχία αποθήκευσης"); console.error(error); }
            else { toast.success("Αποθηκεύτηκε!"); setShowAdd(false); setForm(EMPTY); }
        }
        await fetchTravellers();
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Σίγουρα θέλετε να διαγράψετε;")) return;
        const { error } = await (supabase as any).from("travellers").delete().eq("id", id);
        if (error) toast.error("Αποτυχία διαγραφής");
        else { toast.success("Διαγράφηκε!"); setSelected(null); }
        await fetchTravellers();
    }

    // ── Detail Field ──
    const Field = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => {
        if (!value) return null;
        return (
            <div className="flex items-center justify-between py-2.5 px-1 group">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className={`text-sm text-slate-800 font-medium ${mono ? "font-mono tracking-wide" : ""}`}>{value}</p>
                </div>
                <button
                    onClick={() => copyText(value)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-slate-100"
                    title="Copy"
                >
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                </button>
            </div>
        );
    };

    // ── Form Field ──
    const FormField = ({ label, field, type = "text" }: { label: string; field: keyof Traveller; type?: string }) => (
        <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
            <Input
                type={type}
                value={(form[field] as string) || ""}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value || null }))}
                className="rounded-xl h-9 text-sm"
            />
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="h-8 w-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* ── Left: List ── */}
            <div className="w-[380px] border-r border-slate-100 flex flex-col bg-white">
                {/* Header */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Ταξιδιώτες</h1>
                            <p className="text-xs text-slate-400">{travellers.length} καταχωρήσεις</p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => { setForm(EMPTY); setShowAdd(true); }}
                            className="rounded-xl h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Νέος
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Αναζήτηση ονόματος, passport, τηλ..."
                            className="pl-9 rounded-xl h-9 text-sm bg-slate-50 border-slate-100 focus:bg-white"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                                <X className="h-3.5 w-3.5 text-slate-300" />
                            </button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
                            <User className="h-8 w-8 mb-2 opacity-30" />
                            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Κανένας ταξιδιώτης"}
                        </div>
                    ) : (
                        filtered.map(t => {
                            const isSelected = selected?.id === t.id;
                            const age = getAge(t.birth_date);
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => { setSelected(t); setEditing(false); }}
                                    className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-all duration-150 flex items-center gap-3 ${isSelected
                                            ? "bg-blue-50 border-l-2 border-l-blue-500"
                                            : "hover:bg-slate-50 border-l-2 border-l-transparent"
                                        }`}
                                >
                                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${avatarColor(t.id)} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm`}>
                                        {getInitials(t)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                                            {t.first_name} {t.last_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {t.passport_number && (
                                                <span className="text-[11px] text-slate-400 font-mono">{t.passport_number}</span>
                                            )}
                                            {age !== null && (
                                                <span className="text-[11px] text-slate-300">• {age} ετών</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-blue-400" : "text-slate-200"}`} />
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Right: Detail ── */}
            <div className="flex-1 bg-slate-50 overflow-y-auto">
                {!selected ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <User className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-sm">Επιλέξτε ταξιδιώτη</p>
                    </div>
                ) : editing ? (
                    /* ── Edit Mode ── */
                    <div className="max-w-lg mx-auto p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Επεξεργασία</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="rounded-xl h-8">
                                    <X className="h-3.5 w-3.5 mr-1" /> Ακύρωση
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-xl h-8 bg-blue-600 hover:bg-blue-700">
                                    <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Αποθήκευση"}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Όνομα" field="first_name" />
                                <FormField label="Επώνυμο" field="last_name" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Αρ. Διαβατηρίου" field="passport_number" />
                                <FormField label="Λήξη Διαβατηρίου" field="passport_expiry" type="date" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Αρ. Ταυτότητας" field="id_number" />
                                <FormField label="Λήξη Ταυτότητας" field="id_expiration" type="date" />
                            </div>
                            <FormField label="Ημ. Γέννησης" field="birth_date" type="date" />
                            <FormField label="Miles & Bonus" field="miles_bonus_card" />
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Τηλέφωνο" field="phone" />
                                <FormField label="Email" field="email" type="email" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 mb-1 block">Σημειώσεις</label>
                                <textarea
                                    value={form.notes || ""}
                                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value || null }))}
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── View Mode ── */
                    <div className="max-w-lg mx-auto p-8">
                        {/* Profile header */}
                        <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${avatarColor(selected.id)} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                                    {getInitials(selected)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {selected.first_name} {selected.last_name}
                                    </h2>
                                    {selected.birth_date && (
                                        <p className="text-sm text-slate-400 mt-0.5">
                                            {fmtDate(selected.birth_date)} • {getAge(selected.birth_date)} ετών
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1.5">
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => copyText(buildSummary(selected))}
                                    className="rounded-xl h-8 px-3 text-xs"
                                    title="Αντιγραφή όλων"
                                >
                                    <Copy className="h-3.5 w-3.5 mr-1" /> Όλα
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => { setForm(selected); setEditing(true); }}
                                    className="rounded-xl h-8 px-3 text-xs"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="outline" size="sm"
                                    onClick={() => handleDelete(selected.id)}
                                    className="rounded-xl h-8 px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Sections */}
                        <div className="space-y-1">
                            {/* Travel Documents */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Plane className="h-4 w-4 text-blue-500" />
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ταξιδιωτικά Έγγραφα</h3>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    <Field label="Αρ. Διαβατηρίου" value={selected.passport_number} mono />
                                    {selected.passport_expiry && (
                                        <Field label="Λήξη Διαβατηρίου" value={fmtDate(selected.passport_expiry)} />
                                    )}
                                    <Field label="Αρ. Ταυτότητας" value={selected.id_number} mono />
                                    {selected.id_expiration && (
                                        <Field label="Λήξη Ταυτότητας" value={fmtDate(selected.id_expiration)} />
                                    )}
                                </div>
                                {!selected.passport_number && !selected.id_number && (
                                    <p className="text-xs text-slate-300 italic py-2">Κανένα έγγραφο</p>
                                )}
                            </div>

                            {/* Miles & Bonus */}
                            {selected.miles_bonus_card && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="h-4 w-4 text-amber-500" />
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Miles & Bonus</h3>
                                    </div>
                                    <Field label="Αρ. Κάρτας" value={selected.miles_bonus_card} mono />
                                </div>
                            )}

                            {/* Contact */}
                            {(selected.phone || selected.email) && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Phone className="h-4 w-4 text-emerald-500" />
                                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Επικοινωνία</h3>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        <Field label="Τηλέφωνο" value={selected.phone} />
                                        <Field label="Email" value={selected.email} />
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selected.notes && (
                                <div className="bg-white rounded-2xl border border-slate-100 p-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Σημειώσεις</h3>
                                    <p className="text-sm text-slate-600">{selected.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Add Dialog ── */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Νέος Ταξιδιώτης</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Όνομα *" field="first_name" />
                            <FormField label="Επώνυμο *" field="last_name" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Αρ. Διαβατηρίου" field="passport_number" />
                            <FormField label="Λήξη Διαβατηρίου" field="passport_expiry" type="date" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Αρ. Ταυτότητας" field="id_number" />
                            <FormField label="Λήξη Ταυτότητας" field="id_expiration" type="date" />
                        </div>
                        <FormField label="Ημ. Γέννησης" field="birth_date" type="date" />
                        <FormField label="Miles & Bonus" field="miles_bonus_card" />
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Τηλέφωνο" field="phone" />
                            <FormField label="Email" field="email" type="email" />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowAdd(false)}>
                                Ακύρωση
                            </Button>
                            <Button className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                                {saving ? "Αποθήκευση..." : "Αποθήκευση"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
