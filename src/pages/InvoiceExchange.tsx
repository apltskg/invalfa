import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Send, Inbox, Mail, Clock, Eye, CheckCircle2,
    FileText, Search, Plus, Loader2, Users, Share2,
    AlertCircle, MoreVertical, Download, Building2
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { el } from "date-fns/locale";

interface HubShare {
    id: string;
    invoice_id: string;
    customer_email: string;
    customer_name: string | null;
    message: string | null;
    status: string;
    email_sent_at: string | null;
    viewed_at: string | null;
    created_at: string | null;
    invoice?: {
        invoice_number: string | null;
        amount: number | null;
        invoice_date: string | null;
        merchant: string | null;
    };
}

interface Customer {
    id: string;
    name: string;
    email: string | null;
}

interface Invoice {
    id: string;
    invoice_number: string | null;
    amount: number | null;
    invoice_date: string | null;
    merchant: string | null;
    type: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Εκκρεμεί", color: "text-amber-600 bg-amber-50 border-amber-200", icon: <Clock className="h-3 w-3" /> },
    sent: { label: "Εστάλη", color: "text-blue-600 bg-blue-50 border-blue-200", icon: <Send className="h-3 w-3" /> },
    viewed: { label: "Προβλήθηκε", color: "text-purple-600 bg-purple-50 border-purple-200", icon: <Eye className="h-3 w-3" /> },
    acknowledged: { label: "Επιβεβαιώθηκε", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
};

export default function InvoiceExchange() {
    const [tab, setTab] = useState("sent");
    const [shares, setShares] = useState<HubShare[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);

    // Send form state
    const [form, setForm] = useState({
        invoice_id: "",
        customer_id: "",
        customer_email: "",
        customer_name: "",
        message: "",
    });

    useEffect(() => {
        fetchShares();
        fetchCustomers();
        fetchInvoices();
    }, []);

    async function fetchShares() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("hub_shares")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setShares((data as HubShare[]) || []);
        } catch (e) {
            console.error(e);
            toast.error("Αποτυχία φόρτωσης");
        } finally {
            setLoading(false);
        }
    }

    async function fetchCustomers() {
        const { data } = await supabase.from("customers").select("id,name,email").order("name");
        setCustomers((data as Customer[]) || []);
    }

    async function fetchInvoices() {
        const { data } = await supabase
            .from("invoices")
            .select("id,invoice_number,amount,invoice_date,merchant,type")
            .eq("type", "income")
            .is("package_id", null)
            .order("invoice_date", { ascending: false })
            .limit(100);
        setInvoices((data as Invoice[]) || []);
    }

    function handleCustomerSelect(customerId: string) {
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
            setForm(f => ({
                ...f,
                customer_id: customerId,
                customer_email: cust.email || "",
                customer_name: cust.name,
            }));
        }
    }

    async function handleSend() {
        if (!form.invoice_id) { toast.error("Επιλέξτε τιμολόγιο"); return; }
        if (!form.customer_email) { toast.error("Εισάγετε email παραλήπτη"); return; }

        setSending(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData?.session?.user?.id;

            // 1. Create hub_share record
            const { data: share, error: shareErr } = await supabase
                .from("hub_shares")
                .insert({
                    invoice_id: form.invoice_id,
                    customer_id: form.customer_id || null,
                    customer_email: form.customer_email.trim(),
                    customer_name: form.customer_name || null,
                    message: form.message || null,
                    status: "sent",
                    email_sent_at: new Date().toISOString(),
                    created_by: userId || null,
                })
                .select()
                .single();

            if (shareErr) throw shareErr;

            // 2. TODO: Trigger email via Supabase Edge Function
            // await supabase.functions.invoke("send-invoice-email", {
            //   body: { shareId: share.id }
            // });

            toast.success("Το τιμολόγιο εστάλη!", {
                description: `Ειδοποίηση στο ${form.customer_email}`,
            });

            setSendDialogOpen(false);
            setForm({ invoice_id: "", customer_id: "", customer_email: "", customer_name: "", message: "" });
            fetchShares();
        } catch (err: any) {
            toast.error(`Αποτυχία: ${err.message}`);
        } finally {
            setSending(false);
        }
    }

    const filtered = shares.filter(s => {
        const q = search.toLowerCase();
        return !q
            || (s.customer_name || "").toLowerCase().includes(q)
            || s.customer_email.toLowerCase().includes(q);
    });

    const stats = {
        total: shares.length,
        sent: shares.filter(s => s.status === "sent").length,
        viewed: shares.filter(s => s.status === "viewed").length,
        acknowledged: shares.filter(s => s.status === "acknowledged").length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Invoice Hub</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Αποστολή και παρακολούθηση τιμολογίων προς πελάτες
                    </p>
                </div>
                <Button
                    onClick={() => setSendDialogOpen(true)}
                    className="rounded-xl gap-2 h-9 text-sm bg-blue-600 hover:bg-blue-700"
                >
                    <Send className="h-4 w-4" />
                    Αποστολή Τιμολογίου
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Συνολικές Αποστολές</p>
                        <p className="text-2xl font-bold text-blue-600 mt-0.5">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-amber-400">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Εστάλησαν</p>
                        <p className="text-2xl font-bold text-amber-500 mt-0.5">{stats.sent}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-purple-400">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Προβλήθηκαν</p>
                        <p className="text-2xl font-bold text-purple-500 mt-0.5">{stats.viewed}</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-slate-500">Επιβεβαιώθηκαν</p>
                        <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.acknowledged}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Info banner */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
                <Share2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-700">
                    <strong>Πώς λειτουργεί το Invoice Hub:</strong> Επιλέγεις ένα τιμολόγιο εσόδου, βάζεις το email του πελάτη και το στέλνεις.
                    Ο πελάτης λαμβάνει email με ασφαλές link και βλέπει το τιμολόγιο στο δικό του dashboard —
                    χωρίς να χρειάζεται να εγγραφεί πουθενά.
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Αναζήτηση παραλήπτη..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 rounded-xl border-slate-200 bg-white text-sm h-9"
                />
            </div>

            {/* List */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_160px_120px_100px_44px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span>Παραλήπτης</span>
                    <span>Τιμολόγιο</span>
                    <span>Ημερομηνία</span>
                    <span>Κατάσταση</span>
                    <span />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center">
                        <Send className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-medium">
                            {search ? "Δεν βρέθηκαν αποτελέσματα" : "Δεν έχουν σταλεί τιμολόγια ακόμη"}
                        </p>
                        <p className="text-slate-300 text-xs mt-1">
                            Πατήστε «Αποστολή Τιμολογίου» για να ξεκινήσετε
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filtered.map(share => {
                            const statusCfg = STATUS_CONFIG[share.status] || STATUS_CONFIG.pending;
                            return (
                                <div key={share.id} className="grid grid-cols-[1fr_160px_120px_100px_44px] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                                    {/* Recipient */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                            <Building2 className="h-4 w-4 text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">
                                                {share.customer_name || share.customer_email}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">{share.customer_email}</p>
                                        </div>
                                    </div>

                                    {/* Invoice ref */}
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <FileText className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                        <span className="text-xs text-slate-500 truncate">
                                            {share.invoice_id.slice(0, 8)}…
                                        </span>
                                    </div>

                                    {/* Date */}
                                    <p className="text-sm text-slate-400">
                                        {share.created_at
                                            ? format(new Date(share.created_at), "dd/MM/yyyy")
                                            : "—"}
                                    </p>

                                    {/* Status badge */}
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                        {statusCfg.icon}
                                        {statusCfg.label}
                                    </span>

                                    {/* Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 rounded-lg">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                            <DropdownMenuItem className="gap-2 text-sm text-slate-600">
                                                <Eye className="h-4 w-4" /> Προβολή Link
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="gap-2 text-sm text-slate-600">
                                                <Mail className="h-4 w-4" /> Επανάληψη Email
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })}
                    </div>
                )}

                {filtered.length > 0 && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs text-slate-400">{filtered.length} αποστολές</span>
                    </div>
                )}
            </Card>

            {/* === Send Invoice Dialog === */}
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Send className="h-4 w-4 text-blue-500" />
                            Αποστολή Τιμολογίου σε Πελάτη
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Invoice picker */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500">ΤΙΜΟΛΟΓΙΟ *</Label>
                            <Select value={form.invoice_id} onValueChange={v => setForm(f => ({ ...f, invoice_id: v }))}>
                                <SelectTrigger className="rounded-xl border-slate-200 text-sm h-9">
                                    <SelectValue placeholder="Επιλέξτε τιμολόγιο..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-52">
                                    {invoices.map(inv => (
                                        <SelectItem key={inv.id} value={inv.id}>
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="font-medium">{inv.merchant || "Άγνωστος"}</span>
                                                <span className="text-slate-400 text-xs">
                                                    {inv.amount ? `€${inv.amount.toFixed(2)}` : ""}
                                                    {inv.invoice_date ? ` · ${format(new Date(inv.invoice_date), "dd/MM/yy")}` : ""}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <p className="text-xs font-semibold text-slate-500 mb-3">ΠΑΡΑΛΗΠΤΗΣ</p>

                            {/* From existing customer */}
                            <div className="space-y-1.5 mb-3">
                                <Label className="text-xs text-slate-400">Επιλογή από πελατολόγιο</Label>
                                <Select
                                    value={form.customer_id}
                                    onValueChange={handleCustomerSelect}
                                >
                                    <SelectTrigger className="rounded-xl border-slate-200 text-sm h-9">
                                        <SelectValue placeholder="Αναζήτηση πελάτη..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-48">
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{c.name}</span>
                                                    {c.email && <span className="text-xs text-slate-400">{c.email}</span>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="relative mb-3">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-100" />
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="text-[10px] text-slate-400 bg-white px-2">ή εισάγετε χειροκίνητα</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400">Όνομα</Label>
                                    <Input
                                        value={form.customer_name}
                                        onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                                        placeholder="Ονοματεπώνυμο"
                                        className="rounded-xl border-slate-200 text-sm h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400">Email *</Label>
                                    <Input
                                        type="email"
                                        value={form.customer_email}
                                        onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                                        placeholder="customer@example.com"
                                        className="rounded-xl border-slate-200 text-sm h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500">ΜΗΝΥΜΑ (ΠΡΟΑΙΡΕΤΙΚΟ)</Label>
                            <Textarea
                                value={form.message}
                                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="π.χ. Σας αποστέλλουμε το τιμολόγιο για τις υπηρεσίες μας..."
                                className="rounded-xl border-slate-200 text-sm resize-none"
                                rows={3}
                            />
                        </div>

                        {/* Preview of what will be sent */}
                        {form.customer_email && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                                <p className="font-semibold text-slate-700">Προεπισκόπηση αποστολής</p>
                                <p>📧 Προς: <span className="text-slate-800">{form.customer_email}</span></p>
                                <p>Ο παραλήπτης θα λάβει email με ασφαλές link για να δει το τιμολόγιο.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setSendDialogOpen(false)} className="rounded-xl text-sm border-slate-200">
                            Ακύρωση
                        </Button>
                        <Button onClick={handleSend} disabled={sending} className="rounded-xl text-sm bg-blue-600 hover:bg-blue-700 gap-2">
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            {sending ? "Αποστολή..." : "Αποστολή"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
