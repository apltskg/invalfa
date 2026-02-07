import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    Filter,
    Calendar as CalendarIcon,
    Building2,
    FileText,
    Eye,
    Download,
    Send,
    Inbox,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Plus,
    RefreshCw,
    ExternalLink,
    MailOpen,
    Mail
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { el } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types for the B2B invoice exchange
interface ExchangeInvoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    issue_date: string;
    sender_company: string;
    sender_vat: string;
    receiver_company: string;
    receiver_vat: string;
    amount: number;
    vat_amount: number;
    total_amount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'read';
    direction: 'incoming' | 'outgoing';
    file_url: string | null;
    mydata_mark: string | null;
    created_at: string;
    read_at: string | null;
}

// Invoice type codes (similar to AADE/myDATA)
const INVOICE_TYPES: Record<string, string> = {
    "1.1": "Τιμολόγιο Πώλησης",
    "1.2": "Τιμολόγιο Παροχής Υπηρεσιών",
    "1.6": "Πιστωτικό Τιμολόγιο",
    "2.1": "Απόδειξη Λιανικής",
    "11.1": "ΑΠΥ Πώλησης",
    "11.2": "ΑΠΥ Παροχής Υπηρεσιών",
};

export default function InvoiceExchange() {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState<ExchangeInvoice[]>([]);
    const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedInvoice, setSelectedInvoice] = useState<ExchangeInvoice | null>(null);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, [activeTab, dateRange]);

    async function fetchInvoices() {
        setLoading(true);
        try {
            // For now, we'll simulate data - in production, this would query exchange_invoices table
            const mockInvoices: ExchangeInvoice[] = [
                {
                    id: "1",
                    invoice_number: "ΧΔ-37167T",
                    invoice_type: "2.1",
                    issue_date: "2026-02-03T23:51:00Z",
                    sender_company: "ΑΥΤΟΚΙΝΗΤΟΔΡΟΜΟΣ ΑΙΓΑΙΟΥ Α.Ε.",
                    sender_vat: "099559637",
                    receiver_company: "ALFA MONOPROSOPI IKE",
                    receiver_vat: "801234567",
                    amount: 43.38,
                    vat_amount: 10.41,
                    total_amount: 53.79,
                    status: "pending",
                    direction: "incoming",
                    file_url: null,
                    mydata_mark: "400001234567890",
                    created_at: new Date().toISOString(),
                    read_at: null,
                },
                {
                    id: "2",
                    invoice_number: "ΧΤΡΟM-179446",
                    invoice_type: "2.1",
                    issue_date: "2026-01-30T16:41:00Z",
                    sender_company: "EUROBANK S.A.",
                    sender_vat: "094014201",
                    receiver_company: "ALFA MONOPROSOPI IKE",
                    receiver_vat: "801234567",
                    amount: 3.06,
                    vat_amount: 0.74,
                    total_amount: 3.80,
                    status: "read",
                    direction: "incoming",
                    file_url: null,
                    mydata_mark: "400001234567891",
                    created_at: new Date().toISOString(),
                    read_at: new Date().toISOString(),
                },
                {
                    id: "3",
                    invoice_number: "ΧΔΑΡ-32783",
                    invoice_type: "2.1",
                    issue_date: "2026-01-30T14:08:00Z",
                    sender_company: "EUROBANK S.A.",
                    sender_vat: "094014201",
                    receiver_company: "ALFA MONOPROSOPI IKE",
                    receiver_vat: "801234567",
                    amount: 2.90,
                    vat_amount: 0.70,
                    total_amount: 3.60,
                    status: "accepted",
                    direction: "incoming",
                    file_url: null,
                    mydata_mark: "400001234567892",
                    created_at: new Date().toISOString(),
                    read_at: new Date().toISOString(),
                },
                {
                    id: "4",
                    invoice_number: "ΧΑ-27066",
                    invoice_type: "2.1",
                    issue_date: "2026-01-30T12:34:00Z",
                    sender_company: "EUROBANK S.A.",
                    sender_vat: "094014201",
                    receiver_company: "ALFA MONOPROSOPI IKE",
                    receiver_vat: "801234567",
                    amount: 100.81,
                    vat_amount: 24.19,
                    total_amount: 125.00,
                    status: "pending",
                    direction: "incoming",
                    file_url: null,
                    mydata_mark: "400001234567893",
                    created_at: new Date().toISOString(),
                    read_at: null,
                },
                {
                    id: "5",
                    invoice_number: "ΟΤΛΑ-74",
                    invoice_type: "1.1",
                    issue_date: "2026-01-26T14:53:00Z",
                    sender_company: "ΣΤΕΦΑΝΟΣ ΚΟΚΚΙΝΟΠΑΝΤΗΣ ΚΑΙ ΣΙΑ Ε.Ε.",
                    sender_vat: "082456789",
                    receiver_company: "ALFA MONOPROSOPI IKE",
                    receiver_vat: "801234567",
                    amount: 40.32,
                    vat_amount: 9.68,
                    total_amount: 50.00,
                    status: "pending",
                    direction: "incoming",
                    file_url: null,
                    mydata_mark: "400001234567894",
                    created_at: new Date().toISOString(),
                    read_at: null,
                },
            ];

            // Filter by direction
            const filtered = mockInvoices.filter(inv => inv.direction === activeTab);
            setInvoices(filtered);
        } catch (error) {
            console.error("Error fetching invoices:", error);
            toast.error("Σφάλμα φόρτωσης παραστατικών");
        } finally {
            setLoading(false);
        }
    }

    // Filter invoices
    const filteredInvoices = invoices.filter(inv => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (
                !inv.invoice_number.toLowerCase().includes(query) &&
                !inv.sender_company.toLowerCase().includes(query) &&
                !inv.sender_vat.includes(query)
            ) {
                return false;
            }
        }

        // Type filter
        if (typeFilter !== "all" && inv.invoice_type !== typeFilter) {
            return false;
        }

        // Status filter
        if (statusFilter !== "all" && inv.status !== statusFilter) {
            return false;
        }

        return true;
    });

    // Stats
    const stats = {
        total: invoices.length,
        pending: invoices.filter(i => i.status === 'pending').length,
        unread: invoices.filter(i => !i.read_at).length,
        totalAmount: invoices.reduce((sum, i) => sum + i.total_amount, 0),
    };

    // Mark as read
    async function markAsRead(invoice: ExchangeInvoice) {
        // In production, update the database
        setInvoices(prev => prev.map(i =>
            i.id === invoice.id ? { ...i, status: 'read' as const, read_at: new Date().toISOString() } : i
        ));
        setSelectedInvoice({ ...invoice, status: 'read', read_at: new Date().toISOString() });
    }

    // Accept invoice
    async function acceptInvoice(invoice: ExchangeInvoice) {
        setInvoices(prev => prev.map(i =>
            i.id === invoice.id ? { ...i, status: 'accepted' as const } : i
        ));
        toast.success("Το παραστατικό αποδέχτηκε");
        setSelectedInvoice(null);
    }

    // Reject invoice
    async function rejectInvoice(invoice: ExchangeInvoice) {
        setInvoices(prev => prev.map(i =>
            i.id === invoice.id ? { ...i, status: 'rejected' as const } : i
        ));
        toast.success("Το παραστατικό απορρίφθηκε");
        setSelectedInvoice(null);
    }

    const getStatusBadge = (status: ExchangeInvoice['status']) => {
        switch (status) {
            case 'pending':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-700 rounded-lg">Εκκρεμεί</Badge>;
            case 'read':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-700 rounded-lg">Αναγνώσθηκε</Badge>;
            case 'accepted':
                return <Badge variant="secondary" className="bg-green-100 text-green-700 rounded-lg">Αποδεκτό</Badge>;
            case 'rejected':
                return <Badge variant="destructive" className="rounded-lg">Απορρίφθηκε</Badge>;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoice Hub</h1>
                    <p className="text-muted-foreground mt-1">
                        Ανταλλαγή ηλεκτρονικών παραστατικών με άλλες επιχειρήσεις
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchInvoices} className="rounded-xl gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Ανανέωση
                    </Button>
                    <Button onClick={() => setSendDialogOpen(true)} className="rounded-xl gap-2">
                        <Send className="h-4 w-4" />
                        Αποστολή Παραστατικού
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-5 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Σύνολο</p>
                            <p className="text-3xl font-bold">{stats.total}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Εκκρεμούν</p>
                            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Νέα</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.unread}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Αξία</p>
                            <p className="text-2xl font-bold">€{stats.totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="rounded-2xl overflow-hidden">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'incoming' | 'outgoing')}>
                    <div className="p-4 border-b bg-muted/30">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <TabsList className="rounded-xl">
                                <TabsTrigger value="incoming" className="rounded-lg gap-2 px-4">
                                    <ArrowDownLeft className="h-4 w-4" />
                                    Εισερχόμενα
                                    {stats.unread > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-md">
                                            {stats.unread}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="outgoing" className="rounded-lg gap-2 px-4">
                                    <ArrowUpRight className="h-4 w-4" />
                                    Εξερχόμενα
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Αναζήτηση..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 w-[200px] rounded-xl"
                                    />
                                </div>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[160px] rounded-xl">
                                        <SelectValue placeholder="Τύπος" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                                        {Object.entries(INVOICE_TYPES).map(([code, name]) => (
                                            <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] rounded-xl">
                                        <SelectValue placeholder="Κατάσταση" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Όλες</SelectItem>
                                        <SelectItem value="pending">Εκκρεμή</SelectItem>
                                        <SelectItem value="read">Αναγνωσμένα</SelectItem>
                                        <SelectItem value="accepted">Αποδεκτά</SelectItem>
                                        <SelectItem value="rejected">Απορριφθέντα</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <TabsContent value="incoming" className="m-0">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredInvoices.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <Inbox className="h-12 w-12 mb-4 opacity-50" />
                                <p className="font-medium">Δεν βρέθηκαν παραστατικά</p>
                                <p className="text-sm">Τα εισερχόμενα παραστατικά θα εμφανιστούν εδώ</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 text-sm font-medium text-muted-foreground">
                                    <div className="col-span-2">Σειρά-Αριθμός</div>
                                    <div className="col-span-1">Τύπος</div>
                                    <div className="col-span-2">Ημ/νία Έκδοσης</div>
                                    <div className="col-span-4">Επωνυμία</div>
                                    <div className="col-span-1 text-right">Αξία</div>
                                    <div className="col-span-1 text-center">Κατάσταση</div>
                                    <div className="col-span-1 text-right">Ενέργειες</div>
                                </div>

                                {/* Table Rows */}
                                {filteredInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className={cn(
                                            "grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer",
                                            !invoice.read_at && "bg-blue-50/50"
                                        )}
                                        onClick={() => {
                                            setSelectedInvoice(invoice);
                                            if (!invoice.read_at) markAsRead(invoice);
                                        }}
                                    >
                                        <div className="col-span-2">
                                            <div className="flex items-center gap-2">
                                                {!invoice.read_at && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                )}
                                                <span className="font-medium text-primary hover:underline">
                                                    {invoice.invoice_number}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <span className="text-primary hover:underline">{invoice.invoice_type}</span>
                                        </div>
                                        <div className="col-span-2 text-muted-foreground text-sm">
                                            {format(new Date(invoice.issue_date), 'dd/MM/yyyy HH:mm')}
                                        </div>
                                        <div className="col-span-4">
                                            <span className="text-primary hover:underline">{invoice.sender_company}</span>
                                        </div>
                                        <div className="col-span-1 text-right font-medium">
                                            €{invoice.total_amount.toFixed(2)}
                                        </div>
                                        <div className="col-span-1 text-center">
                                            {getStatusBadge(invoice.status)}
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-lg"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedInvoice(invoice);
                                                }}
                                            >
                                                Προβολή
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="outgoing" className="m-0">
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Send className="h-12 w-12 mb-4 opacity-50" />
                            <p className="font-medium">Δεν έχετε στείλει παραστατικά</p>
                            <p className="text-sm mb-4">Αποστείλτε παραστατικά σε άλλες επιχειρήσεις</p>
                            <Button onClick={() => setSendDialogOpen(true)} className="rounded-xl">
                                <Plus className="h-4 w-4 mr-2" />
                                Αποστολή Παραστατικού
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Invoice Detail Dialog */}
            <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
                <DialogContent className="max-w-2xl rounded-2xl">
                    {selectedInvoice && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Παραστατικό {selectedInvoice.invoice_number}
                                </DialogTitle>
                                <DialogDescription>
                                    {INVOICE_TYPES[selectedInvoice.invoice_type] || selectedInvoice.invoice_type}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                                {/* Status */}
                                <div className="flex items-center justify-between">
                                    {getStatusBadge(selectedInvoice.status)}
                                    <span className="text-sm text-muted-foreground">
                                        ΜΑΡΚ: {selectedInvoice.mydata_mark}
                                    </span>
                                </div>

                                <Separator />

                                {/* Sender Info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Αποστολέας</p>
                                        <p className="font-semibold">{selectedInvoice.sender_company}</p>
                                        <p className="text-sm text-muted-foreground">ΑΦΜ: {selectedInvoice.sender_vat}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Ημερομηνία Έκδοσης</p>
                                        <p className="font-semibold">
                                            {format(new Date(selectedInvoice.issue_date), "dd MMMM yyyy, HH:mm", { locale: el })}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Amounts */}
                                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Καθαρή Αξία</span>
                                        <span>€{selectedInvoice.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ΦΠΑ</span>
                                        <span>€{selectedInvoice.vat_amount.toFixed(2)}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Σύνολο</span>
                                        <span>€{selectedInvoice.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="flex-col sm:flex-row gap-2">
                                {selectedInvoice.status === 'pending' && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            onClick={() => rejectInvoice(selectedInvoice)}
                                            className="rounded-xl gap-2"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Απόρριψη
                                        </Button>
                                        <Button
                                            onClick={() => acceptInvoice(selectedInvoice)}
                                            className="rounded-xl gap-2 bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Αποδοχή
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" className="rounded-xl gap-2">
                                    <Download className="h-4 w-4" />
                                    Λήψη PDF
                                </Button>
                                <Button variant="outline" className="rounded-xl gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    Άνοιγμα στο myDATA
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Send Invoice Dialog */}
            <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
                <DialogContent className="max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Αποστολή Παραστατικού</DialogTitle>
                        <DialogDescription>
                            Αποστείλτε παραστατικό σε άλλη επιχείρηση μέσω του δικτύου eInvoicing
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">ΑΦΜ Παραλήπτη</label>
                            <Input placeholder="π.χ. 123456789" className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Αριθμός Τιμολογίου</label>
                            <Input placeholder="π.χ. ΤΙΜ-001" className="rounded-xl" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Τύπος Παραστατικού</label>
                            <Select>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Επιλέξτε τύπο" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(INVOICE_TYPES).map(([code, name]) => (
                                        <SelectItem key={code} value={code}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Καθαρή Αξία</label>
                                <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">ΦΠΑ</label>
                                <Input type="number" step="0.01" placeholder="0.00" className="rounded-xl" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSendDialogOpen(false)} className="rounded-xl">
                            Ακύρωση
                        </Button>
                        <Button className="rounded-xl gap-2">
                            <Send className="h-4 w-4" />
                            Αποστολή
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
