import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Inbox, Clock, Check, X, Eye, FileText, Hash, Building2,
    CreditCard, Mail, Phone, MapPin, MessageSquare,
    Loader2, RefreshCw, Link2, Copy, CheckCheck,
    Send, Calendar, ExternalLink, Info, Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ─── types ─── */
interface InvoiceRequestRow {
    id: string; created_at: string;
    status: "pending" | "processing" | "done" | "rejected";
    lang: "el" | "en";
    full_name: string; company_name: string | null;
    vat_number: string; tax_office: string | null;
    address: string | null; email: string; phone: string | null;
    transaction_date: string | null; bank_transaction_ref: string | null;
    amount: number | null; service_description: string; notes: string | null;
    receipt_url: string | null;
}

const STATUS = {
    pending: { label: "Εκκρεμεί", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    processing: { label: "Σε επεξεργασία", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    done: { label: "Ολοκληρώθηκε", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "Απορρίφθηκε", cls: "bg-red-100 text-red-700 border-red-200" },
};

function StatusBadge({ status }: { status: InvoiceRequestRow["status"] }) {
    const c = STATUS[status];
    return <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${c.cls}`}>{c.label}</span>;
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
    const [copied, setCopied] = useState(false);
    if (!value) return null;
    return (
        <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
                <p className={`text-sm text-gray-800 ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className={`shrink-0 p-1.5 rounded-lg transition-colors mt-1 ${copied ? "text-emerald-600 bg-emerald-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}>
                {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            </button>
        </div>
    );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2200); }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${copied ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? "Αντιγράφηκε!" : label}
        </button>
    );
}

/* ─── Main ─── */
export default function InvoiceRequestsInbox() {
    const [tab, setTab] = useState<"requests" | "setup">("requests");
    const [requests, setRequests] = useState<InvoiceRequestRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<InvoiceRequestRow | null>(null);
    const [filterStatus, setFilterStatus] = useState("all");
    const [emailBody, setEmailBody] = useState("");
    const [sendingEmail, setSendingEmail] = useState(false);

    const publicUrl = `${window.location.origin}/invoice-request`;

    const iframeCode = `<iframe\n  src="${publicUrl}"\n  width="100%"\n  height="820px"\n  style="border:none; border-radius:12px;"\n  title="Invoice Request"\n></iframe>`;

    useEffect(() => { fetchRequests(); }, []);

    async function fetchRequests() {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("invoice_requests").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            setRequests((data as unknown as InvoiceRequestRow[]) ?? []);
        } catch { toast.error("Αποτυχία φόρτωσης"); }
        finally { setLoading(false); }
    }

    async function updateStatus(id: string, status: InvoiceRequestRow["status"]) {
        try {
            const { error } = await (supabase as any).from("invoice_requests").update({ status }).eq("id", id);
            if (error) throw error;
            setRequests(r => r.map(x => x.id === id ? { ...x, status } : x));
            if (selected?.id === id) setSelected(s => s ? { ...s, status } : null);
            toast.success("Ενημερώθηκε");
        } catch { toast.error("Σφάλμα ενημέρωσης"); }
    }

    async function sendReply() {
        if (!selected || !emailBody.trim()) return;
        setSendingEmail(true);
        try {
            const { error } = await supabase.functions.invoke("send-invoice-reply", {
                body: { to: selected.email, name: selected.full_name, message: emailBody, requestId: selected.id },
            });
            if (error) throw error;
            toast.success(`Email εστάλη στο ${selected.email}`);
            setEmailBody("");
            if (selected.status === "pending") await updateStatus(selected.id, "processing");
        } catch {
            // fallback: open mail client
            const subject = encodeURIComponent(`Αίτηση Παραστατικού - ΑΦΜ ${selected.vat_number}`);
            const body = encodeURIComponent(emailBody);
            window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`);
        } finally { setSendingEmail(false); }
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

    function defaultReply(r: InvoiceRequestRow) {
        return r.lang === "el"
            ? `Αγαπητέ/η ${r.full_name},\n\nΣας ευχαριστούμε για το αίτημά σας. Το τιμολόγιο θα εκδοθεί σύντομα και θα σας αποσταλεί.\n\nΕπικοινωνήστε μαζί μας για οποιαδήποτε διευκρίνιση.\n\nΜε εκτίμηση,\nALFA Travel`
            : `Dear ${r.full_name},\n\nThank you for your request. Your invoice will be issued shortly and sent to you.\n\nPlease contact us for any clarifications.\n\nBest regards,\nALFA Travel`;
    }

    return (
        <div className="space-y-5 max-w-5xl">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Αιτήματα Παραστατικών</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Αιτήματα έκδοσης τιμολογίου από πελάτες</p>
                </div>
                <div className="flex gap-2">
                    <CopyBtn text={publicUrl} label="Αντιγραφή Link Φόρμας" />
                    <Button size="sm" variant="outline" onClick={fetchRequests} className="rounded-xl gap-1.5">
                        <RefreshCw size={13} /> Ανανέωση
                    </Button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-gray-200 gap-1">
                {[
                    { key: "requests", label: "Αιτήματα", icon: <Inbox size={14} /> },
                    { key: "setup", label: "Ρύθμιση & Οδηγίες", icon: <Info size={14} /> },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                        {t.icon} {t.label}
                        {t.key === "requests" && counts.pending > 0 && (
                            <span className="ml-1 text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">{counts.pending}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ══ TAB: REQUESTS ══ */}
            {tab === "requests" && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3">
                        {(["pending", "processing", "done", "rejected"] as const).map(s => (
                            <button key={s} onClick={() => setFilterStatus(s === filterStatus ? "all" : s)}
                                className={`p-4 rounded-xl border text-left transition-all ${filterStatus === s ? "ring-2 ring-offset-1 ring-blue-500 border-blue-200 bg-blue-50" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                                <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{STATUS[s].label}</p>
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <Card className="rounded-2xl border-gray-200 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700">
                                {filterStatus === "all" ? "Όλα" : STATUS[filterStatus as keyof typeof STATUS]?.label}
                                <span className="ml-2 text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{filtered.length}</span>
                            </p>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-40 h-8 text-xs rounded-lg border-gray-200">
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
                        </div>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex items-center justify-center py-14 text-gray-400">
                                    <Loader2 className="animate-spin mr-2" size={17} /> Φόρτωση...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                                    <Inbox size={30} className="mb-3 opacity-30" />
                                    <p className="text-sm">Δεν υπάρχουν αιτήματα</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filtered.map(req => (
                                        <div key={req.id} onClick={() => { setSelected(req); setEmailBody(defaultReply(req)); }}
                                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {req.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{req.full_name}</p>
                                                    {req.company_name && <span className="text-xs text-gray-400 truncate">· {req.company_name}</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{req.service_description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <StatusBadge status={req.status} />
                                                <p className="text-[11px] text-gray-400">{fmtDate(req.created_at)}</p>
                                            </div>
                                            {req.amount != null && (
                                                <div className="text-right shrink-0 min-w-[65px]">
                                                    <p className="text-sm font-bold text-gray-900">€{req.amount.toFixed(2)}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ══ TAB: SETUP ══ */}
            {tab === "setup" && (
                <div className="space-y-4">

                    {/* SQL */}
                    <Card className="rounded-2xl border-gray-200 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Code2 size={14} className="text-gray-400" /> 1. SQL Migration (Supabase)
                            </p>
                        </div>
                        <CardContent className="p-5 space-y-3">
                            <p className="text-sm text-gray-600">
                                Πήγαινε <strong>Supabase → SQL Editor → New query</strong>, κόψε-κόλλησε τον παρακάτω κώδικα και πάτα <strong>Run</strong>.
                            </p>
                            <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-gray-200 overflow-auto max-h-72 leading-relaxed">
                                <pre>{`CREATE TABLE IF NOT EXISTS invoice_requests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    status               TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','done','rejected')),
    lang                 TEXT NOT NULL DEFAULT 'el',
    full_name            TEXT NOT NULL,
    company_name         TEXT,
    vat_number           TEXT NOT NULL,
    tax_office           TEXT,
    address              TEXT,
    email                TEXT NOT NULL,
    phone                TEXT,
    transaction_date     DATE,
    bank_transaction_ref TEXT,
    amount               NUMERIC(12,2),
    service_description  TEXT NOT NULL,
    notes                TEXT,
    receipt_url          TEXT
);

ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert"
ON invoice_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Authorized read"
ON invoice_requests FOR SELECT
USING (is_authorized_user(auth.uid()));

CREATE POLICY "Authorized update"
ON invoice_requests FOR UPDATE
USING (is_authorized_user(auth.uid()));

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-receipts', 'invoice-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public upload receipts"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoice-receipts');

CREATE POLICY "Public read receipts"
ON storage.objects FOR SELECT USING (bucket_id = 'invoice-receipts');`}</pre>
                            </div>
                            <CopyBtn text={`CREATE TABLE IF NOT EXISTS invoice_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','rejected')),
    lang TEXT NOT NULL DEFAULT 'el',
    full_name TEXT NOT NULL,
    company_name TEXT,
    vat_number TEXT NOT NULL,
    tax_office TEXT,
    address TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    transaction_date DATE,
    bank_transaction_ref TEXT,
    amount NUMERIC(12,2),
    service_description TEXT NOT NULL,
    notes TEXT,
    receipt_url TEXT
);
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert" ON invoice_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Authorized read" ON invoice_requests FOR SELECT USING (is_authorized_user(auth.uid()));
CREATE POLICY "Authorized update" ON invoice_requests FOR UPDATE USING (is_authorized_user(auth.uid()));
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-receipts', 'invoice-receipts', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoice-receipts');
CREATE POLICY "Public read receipts" ON storage.objects FOR SELECT USING (bucket_id = 'invoice-receipts');`} label="Αντιγραφή SQL" />
                        </CardContent>
                    </Card>

                    {/* Share link */}
                    <Card className="rounded-2xl border-gray-200 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Link2 size={14} className="text-gray-400" /> 2. Link προς φόρμα
                            </p>
                        </div>
                        <CardContent className="p-5 space-y-3">
                            <p className="text-sm text-gray-600">Στείλε αυτόν τον σύνδεσμο στους πελάτες σου ή πρόσθεσέ τον στο site σου.</p>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <p className="flex-1 text-sm font-mono text-blue-600 truncate">{publicUrl}</p>
                                <CopyBtn text={publicUrl} label="Αντιγραφή" />
                                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 shrink-0">
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Embed */}
                    <Card className="rounded-2xl border-gray-200 overflow-hidden">
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Code2 size={14} className="text-gray-400" /> 3. Embed στο website σου (iframe)
                            </p>
                        </div>
                        <CardContent className="p-5 space-y-3">
                            <p className="text-sm text-gray-600">
                                Πρόσθεσε τον παρακάτω κώδικα στο WordPress, Wix, Squarespace ή οποιοδήποτε site.
                            </p>
                            <div className="bg-gray-900 rounded-xl p-4 text-xs font-mono text-gray-200">
                                <pre>{iframeCode}</pre>
                            </div>
                            <CopyBtn text={iframeCode} label="Αντιγραφή κώδικα" />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Detail Dialog ── */}
            <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
                <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                {selected?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                                <p className="text-base font-bold">{selected?.full_name}</p>
                                {selected?.company_name && <p className="text-xs text-gray-400 font-normal">{selected.company_name}</p>}
                            </div>
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={selected?.status ?? "pending"} />
                                <span className="text-xs text-gray-400">{selected ? fmtDate(selected.created_at) : ""}</span>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4 mt-2">
                            {/* Details */}
                            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden px-4">
                                <InfoRow label="ΑΦΜ / VAT" value={selected.vat_number} mono />
                                <InfoRow label="ΔΟΥ" value={selected.tax_office} />
                                <InfoRow label="Διεύθυνση" value={selected.address} />
                                <InfoRow label="Email" value={selected.email} />
                                <InfoRow label="Τηλέφωνο" value={selected.phone} />
                                <InfoRow label="Ημ. Συναλλαγής" value={selected.transaction_date} />
                                <InfoRow label="Ref. Συναλλαγής" value={selected.bank_transaction_ref} mono />
                                <InfoRow label="Υπηρεσία" value={selected.service_description} />
                                {selected.notes && <InfoRow label="Σχόλια" value={selected.notes} />}
                            </div>

                            {/* Amount */}
                            {selected.amount != null && (
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                                    <span className="text-sm text-gray-600">Ποσό</span>
                                    <span className="text-xl font-bold text-gray-900">€{selected.amount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Receipt */}
                            {selected.receipt_url && (
                                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                    <FileText size={16} className="text-blue-500 shrink-0" />
                                    <p className="text-sm text-blue-700 flex-1">Επισυναπτόμενη απόδειξη</p>
                                    <a href={selected.receipt_url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800">
                                        <ExternalLink size={12} /> Άνοιγμα
                                    </a>
                                </div>
                            )}

                            {/* Status actions */}
                            <div className="flex flex-wrap gap-2">
                                {selected.status !== "processing" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => updateStatus(selected.id, "processing")}>
                                        <Clock size={12} /> Σε Επεξεργασία
                                    </Button>
                                )}
                                {selected.status !== "done" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                        onClick={() => updateStatus(selected.id, "done")}>
                                        <Check size={12} /> Ολοκληρώθηκε
                                    </Button>
                                )}
                                {selected.status !== "rejected" && (
                                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                                        onClick={() => updateStatus(selected.id, "rejected")}>
                                        <X size={12} /> Απόρριψη
                                    </Button>
                                )}
                            </div>

                            {/* Email reply */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                                    <Mail size={13} className="text-gray-400" />
                                    <p className="text-xs font-semibold text-gray-700">Απάντηση → {selected.email}</p>
                                </div>
                                <div className="p-3">
                                    <Textarea
                                        value={emailBody}
                                        onChange={e => setEmailBody(e.target.value)}
                                        className="text-sm rounded-lg border-gray-200 resize-none"
                                        rows={6}
                                    />
                                    <div className="flex gap-2 mt-2">
                                        <Button size="sm" className="gap-1.5 rounded-xl" onClick={sendReply} disabled={sendingEmail}>
                                            {sendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                            {sendingEmail ? "Αποστολή..." : "Αποστολή Email"}
                                        </Button>
                                        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-gray-500"
                                            onClick={() => setEmailBody(defaultReply(selected))}>
                                            Επαναφορά
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
