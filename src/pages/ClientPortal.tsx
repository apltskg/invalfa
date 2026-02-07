import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText,
    CheckCircle2,
    Clock,
    Download,
    Search,
    Building2,
    CreditCard,
    ArrowUpRight,
    AlertCircle,
    Loader2,
    Mail,
    Phone
} from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerInvoice {
    id: string;
    invoiceNumber: string | null;
    date: string;
    amount: number;
    status: 'paid' | 'pending';
    paidDate: string | null;
}

interface CustomerData {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    vatNumber: string | null;
    address: string | null;
    invoices: CustomerInvoice[];
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
}

export default function ClientPortal() {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(searchParams.get("vat") || "");
    const [customerData, setCustomerData] = useState<CustomerData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Auto-search if VAT is in URL
        const vatFromUrl = searchParams.get("vat");
        if (vatFromUrl) {
            setSearchTerm(vatFromUrl);
            handleSearch(vatFromUrl);
        }
    }, [searchParams]);

    async function handleSearch(vat?: string) {
        const searchVat = vat || searchTerm.trim();
        if (!searchVat) {
            setError("Παρακαλώ εισάγετε ΑΦΜ");
            return;
        }

        setLoading(true);
        setError(null);
        setCustomerData(null);

        try {
            // First find the customer by VAT
            const { data: customers, error: customerError } = await supabase
                .from("customers")
                .select("*")
                .eq("vat_number", searchVat);

            if (customerError) throw customerError;

            if (!customers || customers.length === 0) {
                setError("Δεν βρέθηκε πελάτης με αυτό το ΑΦΜ");
                setLoading(false);
                return;
            }

            const customer = customers[0];

            // Fetch invoices for this customer
            const { data: invoices, error: invoicesError } = await supabase
                .from("invoices")
                .select(`
          id,
          amount,
          invoice_date,
          extracted_data,
          type
        `)
                .eq("customer_id", customer.id)
                .eq("type", "income")
                .order("invoice_date", { ascending: false });

            if (invoicesError) throw invoicesError;

            // Get matched invoice IDs (paid)
            const invoiceIds = (invoices || []).map(i => i.id);
            let matchedInvoiceIds = new Set<string>();
            let matchDates: Record<string, string> = {};

            if (invoiceIds.length > 0) {
                const { data: matches } = await supabase
                    .from("invoice_transaction_matches")
                    .select("invoice_id, matched_at, bank_transactions(transaction_date)")
                    .in("invoice_id", invoiceIds);

                matchedInvoiceIds = new Set((matches || []).map(m => m.invoice_id));
                (matches || []).forEach((m: any) => {
                    matchDates[m.invoice_id] = m.bank_transactions?.transaction_date || m.matched_at;
                });
            }

            // Process invoices
            const processedInvoices: CustomerInvoice[] = (invoices || []).map((inv: any) => {
                const extractedData = inv.extracted_data as any;
                const isPaid = matchedInvoiceIds.has(inv.id);

                return {
                    id: inv.id,
                    invoiceNumber: extractedData?.invoice_number || null,
                    date: inv.invoice_date || "",
                    amount: inv.amount || 0,
                    status: isPaid ? 'paid' : 'pending',
                    paidDate: isPaid ? matchDates[inv.id] || null : null,
                };
            });

            const totalInvoiced = processedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
            const totalPaid = processedInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
            const totalPending = totalInvoiced - totalPaid;

            setCustomerData({
                id: customer.id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                vatNumber: customer.vat_number,
                address: customer.address,
                invoices: processedInvoices,
                totalInvoiced,
                totalPaid,
                totalPending,
            });

        } catch (err: any) {
            console.error("Error fetching customer data:", err);
            setError("Σφάλμα κατά την αναζήτηση. Δοκιμάστε ξανά.");
        } finally {
            setLoading(false);
        }
    }

    async function downloadInvoice(invoiceId: string) {
        try {
            const { data: invoice } = await supabase
                .from("invoices")
                .select("file_path")
                .eq("id", invoiceId)
                .single();

            if (invoice?.file_path) {
                const { data } = await supabase.storage
                    .from("invoices")
                    .createSignedUrl(invoice.file_path, 3600);

                if (data?.signedUrl) {
                    window.open(data.signedUrl, "_blank");
                }
            }
        } catch (err) {
            toast.error("Σφάλμα κατά τη λήψη του αρχείου");
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">Πύλη Πελατών</h1>
                            <p className="text-xs text-muted-foreground">Προβολή τιμολογίων & πληρωμών</p>
                        </div>
                    </div>
                    {customerData && (
                        <div className="text-right">
                            <p className="font-medium text-sm">{customerData.name}</p>
                            <p className="text-xs text-muted-foreground">ΑΦΜ: {customerData.vatNumber}</p>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Search Card */}
                {!customerData && (
                    <Card className="max-w-md mx-auto p-8 rounded-3xl shadow-xl">
                        <div className="text-center mb-6">
                            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">Αναζήτηση Λογαριασμού</h2>
                            <p className="text-muted-foreground mt-1">
                                Εισάγετε το ΑΦΜ σας για να δείτε τα τιμολόγια και τις πληρωμές σας
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                placeholder="Εισάγετε ΑΦΜ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="text-center text-lg h-14 rounded-xl"
                            />

                            {error && (
                                <div className="flex items-center gap-2 text-destructive text-sm justify-center">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={() => handleSearch()}
                                className="w-full h-12 rounded-xl text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Αναζήτηση...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Αναζήτηση
                                    </>
                                )}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Customer Dashboard */}
                {customerData && (
                    <div className="space-y-6">
                        {/* Back button */}
                        <Button
                            variant="ghost"
                            onClick={() => setCustomerData(null)}
                            className="rounded-xl"
                        >
                            ← Νέα αναζήτηση
                        </Button>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Συνολικά Τιμολόγια</div>
                                        <div className="text-2xl font-bold">€{customerData.totalInvoiced.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">{customerData.invoices.length} τιμολόγια</div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Εξοφλημένα</div>
                                        <div className="text-2xl font-bold text-green-600">€{customerData.totalPaid.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {customerData.invoices.filter(i => i.status === 'paid').length} τιμολόγια
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <Clock className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Εκκρεμές Υπόλοιπο</div>
                                        <div className="text-2xl font-bold text-orange-600">€{customerData.totalPending.toFixed(2)}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {customerData.invoices.filter(i => i.status === 'pending').length} τιμολόγια
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Contact Info */}
                        <Card className="p-4 rounded-2xl">
                            <div className="flex flex-wrap gap-6">
                                <div className="flex items-center gap-2 text-sm">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{customerData.name}</span>
                                </div>
                                {customerData.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{customerData.email}</span>
                                    </div>
                                )}
                                {customerData.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{customerData.phone}</span>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Invoices */}
                        <Tabs defaultValue="all" className="space-y-4">
                            <TabsList className="rounded-xl">
                                <TabsTrigger value="all" className="rounded-lg">
                                    Όλα ({customerData.invoices.length})
                                </TabsTrigger>
                                <TabsTrigger value="pending" className="rounded-lg">
                                    Εκκρεμή ({customerData.invoices.filter(i => i.status === 'pending').length})
                                </TabsTrigger>
                                <TabsTrigger value="paid" className="rounded-lg">
                                    Εξοφλημένα ({customerData.invoices.filter(i => i.status === 'paid').length})
                                </TabsTrigger>
                            </TabsList>

                            {['all', 'pending', 'paid'].map(tabValue => (
                                <TabsContent key={tabValue} value={tabValue}>
                                    <Card className="rounded-2xl overflow-hidden">
                                        <div className="divide-y">
                                            {customerData.invoices
                                                .filter(inv => tabValue === 'all' || inv.status === tabValue)
                                                .map((invoice) => (
                                                    <div
                                                        key={invoice.id}
                                                        className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${invoice.status === 'paid'
                                                                    ? 'bg-green-500/10 text-green-600'
                                                                    : 'bg-orange-500/10 text-orange-600'
                                                                }`}>
                                                                {invoice.status === 'paid' ? (
                                                                    <CheckCircle2 className="h-5 w-5" />
                                                                ) : (
                                                                    <Clock className="h-5 w-5" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">
                                                                    {invoice.invoiceNumber || `Τιμολόγιο ${format(new Date(invoice.date), 'dd/MM/yyyy')}`}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {format(new Date(invoice.date), 'dd MMMM yyyy', { locale: el })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="font-bold">€{invoice.amount.toFixed(2)}</div>
                                                                <Badge
                                                                    variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                                                                    className="text-xs rounded-lg"
                                                                >
                                                                    {invoice.status === 'paid' ? 'Εξοφλημένο' : 'Εκκρεμές'}
                                                                </Badge>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="rounded-xl"
                                                                onClick={() => downloadInvoice(invoice.id)}
                                                            >
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}

                                            {customerData.invoices.filter(inv => tabValue === 'all' || inv.status === tabValue).length === 0 && (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    Δεν βρέθηκαν τιμολόγια
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t mt-auto py-6 text-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Invalfa - Όλα τα δικαιώματα διατηρούνται</p>
            </footer>
        </div>
    );
}
