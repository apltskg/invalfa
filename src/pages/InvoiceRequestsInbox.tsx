import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Inbox, Clock, Check, X, Eye, FileText, Hash, Building2,
    CreditCard, Mail, Phone, MapPin, MessageSquare, ChevronDown,
    Loader2, RefreshCw, Link2, Copy, CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

/* ─── types ─── */
interface InvoiceRequestRow {
    id: string;
    created_at: string;
    status: "pending" | "processing" | "done" | "rejected";
    lang: "el" | "en";
    full_name: string;
    company_name: string | null;
    vat_number: string;
    tax_office: string | null;
    address: string | null;
    email: string;
    phone: string | null;
    bank_transaction_ref: string | null;
    amount: number | null;
    service_description: string;
    notes: string | null;
}

const STATUS_CONFIG = {
    pending: { label: "Εκκρεμεί", color: "bg-amber-100 text-amber-700 border-amber-200" },
    processing: { label: "Σε επεξεργασία", color: "bg-blue-100 text-blue-700 border-blue-200" },
    done: { label: "Ολοκληρώθηκε", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "Απορρίφθηκε", color: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: InvoiceRequestRow["status"] }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
    const [copied, setCopied] = useState(false);
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <span className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-slate-700 break-words">{value}</p>
            </div>
            <button
                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${copied ? "text-emerald-600 bg-emerald-50" : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"}`}
                onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            >
                {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            </button>
        </div>
    );
}

export default function InvoiceRequestsInbox() {
    const [requests, setRequests] = useState<InvoiceRequestRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<InvoiceRequestRow | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [linkCopied, setLinkCopied] = useState(false);

    const publicUrl = `${window.location.origin}/invoice-request`;

    useEffect(() => { fetchRequests(); }, []);

    async function fetchRequests() {
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from("invoice_requests")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setRequests((data as unknown as InvoiceRequestRow[]) ?? []);
        } catch (e) {
            console.error(e);
            toast.error("Αποτυχία φόρτωσης αιτημάτων");
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, status: InvoiceRequestRow["status"]) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("invoice_requests").update({ status }).eq("id", id);
            if (error) throw error;
            setRequests(r => r.map(x => x.id === id ? { ...x, status } : x));
            if (selected?.id === id) setSelected(s => s ? { ...s, status } : null);
            toast.success("Ενημερώθηκε");
        } catch (e) {
            toast.error("Σφάλμα ενημέρωσης");
        }
    }

    const filtered = filterStatus === "all" ? requests : requests.filter(r => r.status === filterStatus);
    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        processing: requests.filter(r => r.status === "processing").length,
        done: requests.filter(r => r.status === "done").length,
        rejected: requests.filter(r => r.status === "rejected").length,
    };

    function fmtDate(iso: string) {
        return new Date(iso).toLocaleString("el-GR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Αιτήματα Παραστατικών</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Αιτήματα από πελάτες για έκδοση τιμολογίου</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { navigator.clipboard.writeText(publicUrl); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500); }}
                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-all ${linkCopied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                        {linkCopied ? <CheckCheck size={14} /> : <Link2 size={14} />}
                        {linkCopied ? "Αντιγράφηκε!" : "Αντιγραφή Link Πελατών"}
                    </button>
                    <Button size="sm" variant="outline" onClick={fetchRequests} className="rounded-xl gap-2">
                        <RefreshCw size={14} />
                        Ανανέωση
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
                {(["pending", "processing", "done", "rejected"] as const).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
                        className={`p-4 rounded-2xl border text-left transition-all ${filterStatus === s ? "ring-2 ring-offset-1 ring-blue-500 border-blue-200 bg-blue-50" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                    >
                        <p className="text-2xl font-bold text-slate-900">{counts[s]}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{STATUS_CONFIG[s].label}</p>
                    </button>
                ))}
            </div>

            {/* Filter + List */}
            <Card className="rounded-2xl border-slate-200 overflow-hidden">
                <CardHeader className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Inbox size={15} className="text-slate-400" />
                        {filterStatus === "all" ? "Όλα τα αιτήματα" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}
                        <span className="ml-1 text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">{filtered.length}</span>
                    </CardTitle>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-40 h-8 text-xs rounded-lg border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Όλα ({counts.all})</SelectItem>
                            <SelectItem value="pending">Εκκρεμεί ({counts.pending})</SelectItem>
                            <SelectItem value="processing">Σε επεξεργασία ({counts.processing})</SelectItem>
                            <SelectItem value="done">Ολοκληρώθηκε ({counts.done})</SelectItem>
                            <SelectItem value="rejected">Απορρίφθηκε ({counts.rejected})</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 className="animate-spin mr-2" size={18} /> Φόρτωση...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Inbox size={32} className="mb-3 opacity-40" />
                            <p className="text-sm">Δεν υπάρχουν αιτήματα</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map(req => (
                                <div key={req.id}
                                    onClick={() => setSelected(req)}
                                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                        {req.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{req.full_name}</p>
                                            {req.company_name && <span className="text-xs text-slate-400 truncate">· {req.company_name}</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {req.service_description}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        <StatusBadge status={req.status} />
                                        <p className="text-[11px] text-slate-400">{fmtDate(req.created_at)}</p>
                                    </div>
                                    {req.amount != null && (
                                        <div className="text-right flex-shrink-0 min-w-[70px]">
                                            <p className="text-sm font-bold text-slate-900">€{req.amount.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <DialogContent className="max-w-xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {selected?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                                <p className="text-base font-bold">{selected?.full_name}</p>
                                {selected?.company_name && <p className="text-xs text-slate-400 font-normal">{selected.company_name}</p>}
                            </div>
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div>
                                <div className="flex items-center gap-2 mt-2">
                                    <StatusBadge status={selected?.status ?? "pending"} />
                                    <span className="text-xs text-slate-400">{selected ? fmtDate(selected.created_at) : ""}</span>
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4">
                            {/* Details */}
                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                                <InfoRow icon={<Hash size={14} />} label="ΑΦΜ / VAT" value={selected.vat_number} />
                                <InfoRow icon={<Building2 size={14} />} label="ΔΟΥ" value={selected.tax_office} />
                                <InfoRow icon={<MapPin size={14} />} label="Διεύθυνση" value={selected.address} />
                                <InfoRow icon={<Mail size={14} />} label="Email" value={selected.email} />
                                <InfoRow icon={<Phone size={14} />} label="Τηλέφωνο" value={selected.phone} />
                                <InfoRow icon={<CreditCard size={14} />} label="Ref. Τραπεζικής Συναλλαγής" value={selected.bank_transaction_ref} />
                                <InfoRow icon={<FileText size={14} />} label="Περιγραφή Υπηρεσίας" value={selected.service_description} />
                                {selected.notes && <InfoRow icon={<MessageSquare size={14} />} label="Σχόλια" value={selected.notes} />}
                            </div>

                            {selected.amount != null && (
                                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                    <span className="text-sm text-slate-600">Ποσό</span>
                                    <span className="text-xl font-bold text-slate-900">€{selected.amount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {selected.status !== "processing" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => updateStatus(selected.id, "processing")}>
                                        <Clock size={13} /> Σε Επεξεργασία
                                    </Button>
                                )}
                                {selected.status !== "done" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                        onClick={() => updateStatus(selected.id, "done")}>
                                        <Check size={13} /> Ολοκληρώθηκε
                                    </Button>
                                )}
                                {selected.status !== "rejected" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-2 text-red-500 border-red-200 hover:bg-red-50"
                                        onClick={() => updateStatus(selected.id, "rejected")}>
                                        <X size={13} /> Απόρριψη
                                    </Button>
                                )}
                                {selected.email && (
                                    <a href={`mailto:${selected.email}?subject=Αίτηση Παραστατικού - ${selected.vat_number}`}
                                        className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                        <Mail size={13} /> Απάντηση Email
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
