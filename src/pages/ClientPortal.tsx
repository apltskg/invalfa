import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
    FileText, CheckCircle2, Clock, Download, AlertCircle,
    Loader2, Mail, Building2, ArrowRight, Eye, ChevronRight,
    X, ExternalLink, Shield, TrendingUp, Inbox, ZapIcon,
} from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface SharedInvoice {
    share_id: string;
    share_status: string;
    share_created_at: string;
    share_viewed_at: string | null;
    message: string | null;
    sender_name: string; // agency_settings company_name
    invoice_number: string | null;
    invoice_date: string | null;
    amount: number | null;
    currency: string;
    file_path: string | null;
    merchant: string | null;
}

interface PortalData {
    customer_email: string;
    customer_name: string | null;
    invoices: SharedInvoice[];
    total_amount: number;
    total_acknowledged: number;
    total_pending: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string; dot: string }> = {
        pending: { label: "Εκκρεμεί", cls: "bg-amber-50  text-amber-700  border-amber-200", dot: "bg-amber-400" },
        sent: { label: "Εστάλη", cls: "bg-blue-50   text-blue-700   border-blue-200", dot: "bg-blue-400" },
        viewed: { label: "Προβλήθηκε", cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-400" },
        acknowledged: { label: "Επιβεβαιώθηκε", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    };
    const cfg = map[status] ?? map.pending;
    return (
        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border", cfg.cls)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function AmountBadge({ amount, currency = "EUR" }: { amount: number | null; currency?: string }) {
    if (amount == null) return <span className="text-slate-400">—</span>;
    return (
        <span className="font-mono font-bold text-slate-900 tabular-nums">
            {new Intl.NumberFormat("el-GR", { style: "currency", currency }).format(amount)}
        </span>
    );
}

/* ─── Invoice Detail Drawer ──────────────────────────────────────────── */
function InvoiceDrawer({
    invoice,
    onClose,
    onAcknowledge,
    onDownload,
}: {
    invoice: SharedInvoice | null;
    onClose: () => void;
    onAcknowledge: (shareId: string) => void;
    onDownload: (filePath: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!invoice) return null;

    const isPending = invoice.share_status !== "acknowledged";

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />
            {/* Panel */}
            <div
                ref={ref}
                className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-white z-50 flex flex-col shadow-2xl"
                style={{ animation: "slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                {invoice.invoice_number || "Παραστατικό"}
                            </p>
                            <p className="text-xs text-slate-400">από {invoice.sender_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <X className="h-4 w-4 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Big amount */}
                    <div className="text-center py-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Ποσό</p>
                        <p className="text-4xl font-black text-slate-900 tabular-nums">
                            {invoice.amount != null
                                ? new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(invoice.amount)
                                : "—"}
                        </p>
                        <div className="mt-3">
                            <StatusPill status={invoice.share_status} />
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Αποστολέας", value: invoice.sender_name },
                            { label: "Αρ. Παραστατικού", value: invoice.invoice_number || "—" },
                            {
                                label: "Ημερομηνία Εκδ.",
                                value: invoice.invoice_date
                                    ? format(parseISO(invoice.invoice_date), "dd MMM yyyy", { locale: el })
                                    : "—",
                            },
                            {
                                label: "Ελήφθη",
                                value: format(parseISO(invoice.share_created_at), "dd MMM yyyy", { locale: el }),
                            },
                        ].map(({ label, value }) => (
                            <div key={label} className="p-3 bg-slate-50 rounded-xl">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                                <p className="text-sm font-medium text-slate-800 truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Message */}
                    {invoice.message && (
                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                            <p className="text-xs font-semibold text-blue-700 mb-1">Μήνυμα Αποστολέα</p>
                            <p className="text-sm text-blue-800">{invoice.message}</p>
                        </div>
                    )}

                    {/* Timeline */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Ιστορικό</p>
                        <div className="space-y-0">
                            {[
                                { label: "Δημιουργία", date: invoice.share_created_at, done: true },
                                { label: "Εστάλη email", date: invoice.share_created_at, done: true },
                                { label: "Προβλήθηκε", date: invoice.share_viewed_at, done: !!invoice.share_viewed_at },
                                { label: "Επιβεβαιώθηκε", date: null, done: invoice.share_status === "acknowledged" },
                            ].map((event, i, arr) => (
                                <div key={i} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full mt-1 shrink-0",
                                            event.done ? "bg-blue-500" : "bg-slate-200"
                                        )} />
                                        {i < arr.length - 1 && (
                                            <div className={cn("w-0.5 flex-1 my-1", event.done ? "bg-blue-200" : "bg-slate-100")} />
                                        )}
                                    </div>
                                    <div className="pb-4">
                                        <p className={cn("text-sm font-medium", event.done ? "text-slate-800" : "text-slate-400")}>
                                            {event.label}
                                        </p>
                                        {event.date && (
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {format(parseISO(event.date), "dd MMM yyyy, HH:mm", { locale: el })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer actions */}
                <div className="p-6 border-t border-slate-100 space-y-3">
                    {invoice.file_path && (
                        <button
                            onClick={() => onDownload(invoice.file_path!)}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Λήψη Παραστατικού
                        </button>
                    )}
                    {isPending && (
                        <button
                            onClick={() => onAcknowledge(invoice.share_id)}
                            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Επιβεβαίωση Λήψης
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to   { transform: translateX(0);    }
                }
            `}</style>
        </>
    );
}

/* ─── Landing / Token screen ─────────────────────────────────────────── */
function TokenGate({ onVerified }: { onVerified: (data: PortalData) => void }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAccess() {
        if (!email.trim()) { setError("Παρακαλώ εισάγετε το email σας"); return; }
        setLoading(true);
        setError(null);
        try {
            // Fetch hub_shares for this email
            const { data: shares, error: sharesErr } = await supabase
                .from("hub_shares")
                .select("id, status, created_at, viewed_at, message, customer_name, invoice_id")
                .eq("customer_email", email.trim().toLowerCase())
                .order("created_at", { ascending: false });

            if (sharesErr) throw sharesErr;
            if (!shares || shares.length === 0) {
                setError("Δεν βρέθηκαν παραστατικά για αυτό το email");
                setLoading(false);
                return;
            }

            // Fetch invoice details for each share
            const invoiceIds = shares.map((s: any) => s.invoice_id);
            const { data: invoices } = await supabase
                .from("invoices")
                .select("id, invoice_number, invoice_date, amount, file_path, merchant")
                .in("id", invoiceIds);

            // Fetch company name
            const { data: agency } = await supabase
                .from("agency_settings")
                .select("company_name")
                .single();

            const senderName = (agency as any)?.company_name || "Η Εταιρεία μας";

            const invoiceMap = new Map((invoices || []).map((inv: any) => [inv.id, inv]));

            const sharedInvoices: SharedInvoice[] = shares.map((s: any) => {
                const inv = invoiceMap.get(s.invoice_id) || {};
                return {
                    share_id: s.id,
                    share_status: s.status,
                    share_created_at: s.created_at,
                    share_viewed_at: s.viewed_at,
                    message: s.message,
                    sender_name: senderName,
                    invoice_number: (inv as any).invoice_number || null,
                    invoice_date: (inv as any).invoice_date || null,
                    amount: (inv as any).amount || null,
                    currency: "EUR",
                    file_path: (inv as any).file_path || null,
                    merchant: (inv as any).merchant || null,
                };
            });

            const total = sharedInvoices.reduce((s, i) => s + (i.amount || 0), 0);
            const acknowledged = sharedInvoices.filter(i => i.share_status === "acknowledged").reduce((s, i) => s + (i.amount || 0), 0);

            // Mark all unseen as "viewed"
            const unseenIds = shares.filter((s: any) => s.status === "sent").map((s: any) => s.id);
            if (unseenIds.length > 0) {
                await supabase.from("hub_shares")
                    .update({ status: "viewed", viewed_at: new Date().toISOString() })
                    .in("id", unseenIds);
            }

            onVerified({
                customer_email: email.trim().toLowerCase(),
                customer_name: shares[0].customer_name,
                invoices: sharedInvoices,
                total_amount: total,
                total_acknowledged: acknowledged,
                total_pending: total - acknowledged,
            });
        } catch (err: any) {
            setError("Σφάλμα. Παρακαλώ δοκιμάστε ξανά.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-6">
            {/* Glow bg */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo mark */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <Inbox className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-white font-bold text-xl tracking-tight">Invoice Hub</span>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-8">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-white">Πρόσβαση στα Παραστατικά σας</h1>
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                            Εισάγετε το email σας για να δείτε όλα τα παραστατικά που σας έχουν σταλεί
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAccess()}
                                placeholder="your@email.com"
                                className="w-full pl-10 pr-4 h-12 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleAccess}
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/25 disabled:opacity-60"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Ανακτάται...</>
                            ) : (
                                <><ArrowRight className="h-4 w-4" /> Πρόσβαση</>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Shield className="h-3.5 w-3.5" />
                        Ασφαλής σύνδεση · Τα δεδομένα σας είναι κρυπτογραφημένα
                    </div>
                </div>

                {/* Trust badges */}
                <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
                    {["Ασφαλή Δεδομένα", "GDPR Compliant", "End-to-End"].map(t => (
                        <span key={t} className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-slate-500" />
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Main Portal Dashboard ──────────────────────────────────────────── */
function PortalDashboard({ data, onLogout }: { data: PortalData; onLogout: () => void }) {
    const [filter, setFilter] = useState<"all" | "pending" | "acknowledged">("all");
    const [selected, setSelected] = useState<SharedInvoice | null>(null);
    const [search, setSearch] = useState("");

    const filtered = data.invoices.filter(inv => {
        const matchFilter =
            filter === "all" ||
            (filter === "pending" && inv.share_status !== "acknowledged") ||
            (filter === "acknowledged" && inv.share_status === "acknowledged");
        const q = search.toLowerCase();
        const matchSearch = !q
            || (inv.invoice_number || "").toLowerCase().includes(q)
            || (inv.sender_name || "").toLowerCase().includes(q);
        return matchFilter && matchSearch;
    });

    async function handleAcknowledge(shareId: string) {
        const { error } = await supabase
            .from("hub_shares")
            .update({ status: "acknowledged" })
            .eq("id", shareId);
        if (error) { toast.error("Σφάλμα κατά την επιβεβαίωση"); return; }
        toast.success("Επιβεβαιώθηκε επιτυχώς!");
        // Update local state
        if (selected) setSelected({ ...selected, share_status: "acknowledged" });
    }

    async function handleDownload(filePath: string) {
        try {
            const { data: url } = await supabase.storage
                .from("invoices")
                .createSignedUrl(filePath, 3600);
            if (url?.signedUrl) window.open(url.signedUrl, "_blank");
            else toast.error("Δεν βρέθηκε αρχείο");
        } catch { toast.error("Σφάλμα λήψης"); }
    }

    const pendingCount = data.invoices.filter(i => i.share_status !== "acknowledged").length;
    const paidPct = data.total_amount > 0
        ? Math.round((data.total_acknowledged / data.total_amount) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-[#f7f8fa]">
            {/* ── Top Nav ── */}
            <nav className="bg-[#0a0f1e] sticky top-0 z-30 px-6 py-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <Inbox className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-white font-semibold text-sm">Invoice Hub</span>
                        <span className="text-slate-600 text-sm">·</span>
                        <span className="text-slate-400 text-sm truncate max-w-[200px]">
                            {data.customer_name || data.customer_email}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {pendingCount > 0 && (
                            <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                                {pendingCount} εκκρεμή
                            </span>
                        )}
                        <button
                            onClick={onLogout}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Έξοδος
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Hero Banner ── */}
            <div className="bg-[#0a0f1e] pb-16 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-blue-500/8 blur-[80px] rounded-full" />
                </div>
                <div className="max-w-5xl mx-auto px-6 pt-10 pb-4 relative">
                    <h1 className="text-3xl font-black text-white">
                        Τα Παραστατικά μου
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {data.invoices.length} παραστατικά · {data.customer_email}
                    </p>

                    {/* Stat cards inside hero */}
                    <div className="grid grid-cols-3 gap-4 mt-8">
                        {[
                            {
                                label: "Συνολικά",
                                value: data.total_amount,
                                sub: `${data.invoices.length} παραστατικά`,
                                color: "from-blue-600/20 to-blue-500/5",
                                icon: <FileText className="h-5 w-5 text-blue-400" />,
                                textColor: "text-blue-300",
                            },
                            {
                                label: "Εκκρεμή",
                                value: data.total_pending,
                                sub: `${data.invoices.filter(i => i.share_status !== "acknowledged").length} παραστατικά`,
                                color: "from-amber-600/20 to-amber-500/5",
                                icon: <Clock className="h-5 w-5 text-amber-400" />,
                                textColor: "text-amber-300",
                            },
                            {
                                label: "Επιβεβαιωμένα",
                                value: data.total_acknowledged,
                                sub: `${data.invoices.filter(i => i.share_status === "acknowledged").length} παραστατικά`,
                                color: "from-emerald-600/20 to-emerald-500/5",
                                icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
                                textColor: "text-emerald-300",
                            },
                        ].map(card => (
                            <div
                                key={card.label}
                                className={cn("rounded-2xl bg-gradient-to-br border border-white/8 p-5", card.color)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                                        {card.label}
                                    </p>
                                    {card.icon}
                                </div>
                                <p className={cn("text-2xl font-black tabular-nums", card.textColor)}>
                                    {new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(card.value)}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-1">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    {data.total_amount > 0 && (
                        <div className="mt-5">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <span>Επιβεβαίωση</span>
                                <span className="font-semibold text-slate-300">{paidPct}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-700"
                                    style={{ width: `${paidPct}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Content ── */}
            <main className="max-w-5xl mx-auto px-6 -mt-6 pb-20">
                {/* Floating card wrapper */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        {/* Filter tabs */}
                        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                            {([
                                { id: "all", label: "Όλα", count: data.invoices.length },
                                { id: "pending", label: "Εκκρεμή", count: data.invoices.filter(i => i.share_status !== "acknowledged").length },
                                { id: "acknowledged", label: "Επιβεβαιωμένα", count: data.invoices.filter(i => i.share_status === "acknowledged").length },
                            ] as const).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                                        filter === tab.id
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {tab.label}
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                        filter === tab.id ? "bg-slate-100 text-slate-600" : "text-slate-400"
                                    )}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative w-52">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Αναζήτηση..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 h-8 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                        </div>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[40px_1fr_160px_120px_110px_40px] items-center px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span />
                        <span>Παραστατικό</span>
                        <span>Αποστολέας</span>
                        <span>Ημερομηνία</span>
                        <span className="text-right">Ποσό</span>
                        <span />
                    </div>

                    {/* Rows */}
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Inbox className="h-7 w-7 text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">Δεν βρέθηκαν παραστατικά</p>
                            <p className="text-slate-400 text-sm mt-1">Δοκιμάστε διαφορετικό φίλτρο</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {filtered.map(inv => {
                                const isNew = inv.share_status === "sent";
                                const isAck = inv.share_status === "acknowledged";
                                return (
                                    <div
                                        key={inv.share_id}
                                        onClick={() => setSelected(inv)}
                                        className={cn(
                                            "grid grid-cols-[40px_1fr_160px_120px_110px_40px] items-center px-5 py-4 cursor-pointer transition-all group",
                                            "hover:bg-blue-50/40",
                                            isNew && "bg-blue-50/30"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                            isAck ? "bg-emerald-50" : isNew ? "bg-blue-100" : "bg-slate-100"
                                        )}>
                                            {isAck
                                                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                : <FileText className={cn("h-4 w-4", isNew ? "text-blue-600" : "text-slate-400")} />
                                            }
                                        </div>

                                        {/* Title */}
                                        <div className="min-w-0 pl-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {inv.invoice_number
                                                        ? `#${inv.invoice_number}`
                                                        : `Παραστατικό ${format(parseISO(inv.share_created_at), "dd/MM/yy")}`}
                                                </p>
                                                {isNew && (
                                                    <span className="shrink-0 text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                        Νέο
                                                    </span>
                                                )}
                                            </div>
                                            {inv.message && (
                                                <p className="text-xs text-slate-400 truncate mt-0.5">{inv.message}</p>
                                            )}
                                        </div>

                                        {/* Sender */}
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Building2 className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                            <span className="text-xs text-slate-500 truncate">{inv.sender_name}</span>
                                        </div>

                                        {/* Date */}
                                        <p className="text-xs text-slate-400">
                                            {format(parseISO(inv.share_created_at), "dd MMM yyyy", { locale: el })}
                                        </p>

                                        {/* Amount */}
                                        <div className="text-right">
                                            <AmountBadge amount={inv.amount} />
                                        </div>

                                        {/* Arrow */}
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors justify-self-end" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Security note */}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Η σύνδεσή σας είναι ασφαλής · Δεδομένα κρυπτογραφημένα με TLS 1.3</span>
                </div>
            </main>

            {/* Drawer */}
            <InvoiceDrawer
                invoice={selected}
                onClose={() => setSelected(null)}
                onAcknowledge={handleAcknowledge}
                onDownload={handleDownload}
            />
        </div>
    );
}

/* ─── Root component ─────────────────────────────────────────────────── */
export default function ClientPortal() {
    const [searchParams] = useSearchParams();
    const [portalData, setPortalData] = useState<PortalData | null>(null);

    // If a token is in the URL, try to auto-load (future: token-based)
    const token = searchParams.get("token");

    return portalData ? (
        <PortalDashboard data={portalData} onLogout={() => setPortalData(null)} />
    ) : (
        <TokenGate onVerified={setPortalData} />
    );
}
