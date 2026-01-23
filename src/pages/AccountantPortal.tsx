import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Package, Invoice, BankTransaction } from "@/types/database";
import { CheckCircle2, AlertCircle, FileText, CreditCard, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PackageWithInvoices extends Package {
    invoices: Invoice[];
}

interface PortalResponse {
    authorized: boolean;
    monthYear?: string;
    packages?: PackageWithInvoices[];
    transactions?: BankTransaction[];
    error?: string;
}

export default function AccountantPortal() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [monthYear, setMonthYear] = useState("");
    const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);

    useEffect(() => {
        verifyAndFetch();
    }, [token]);

    async function verifyAndFetch() {
        if (!token) {
            setAuthorized(false);
            setLoading(false);
            return;
        }

        try {
            // Use edge function for server-side token validation
            const { data, error } = await supabase.functions.invoke<PortalResponse>('accountant-portal-access', {
                body: { token, action: 'get_data' }
            });

            if (error) {
                console.error("Portal access error:", error);
                setAuthorized(false);
                setLoading(false);
                return;
            }

            if (!data?.authorized) {
                console.log("Not authorized:", data?.error);
                setAuthorized(false);
                setLoading(false);
                return;
            }

            setAuthorized(true);
            setMonthYear(data.monthYear || "");
            setPackages(data.packages || []);
            setTransactions(data.transactions || []);
        } catch (error) {
            console.error("Error verifying magic link:", error);
            setAuthorized(false);
        } finally {
            setLoading(false);
        }
    }

    async function postFeedback(invoiceId: string, type: 'comment' | 'doubt', content: string) {
        if (!token) return;

        try {
            const { data, error } = await supabase.functions.invoke('accountant-portal-access', {
                body: { 
                    token, 
                    action: 'post_comment',
                    invoiceId,
                    commentText: content,
                    isDoubt: type === 'doubt'
                }
            });

            if (error || !data?.success) {
                throw new Error(error?.message || 'Failed to post feedback');
            }

            toast.success("Τα σχόλιά σας υποβλήθηκαν επιτυχώς");
        } catch (error) {
            console.error("Error posting feedback:", error);
            toast.error("Αποτυχία υποβολής σχολίων");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <p className="text-lg text-muted-foreground">Φόρτωση...</p>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
                <Card className="p-12 max-w-md text-center rounded-3xl">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Μη Έγκυρος Σύνδεσμος</h2>
                    <p className="text-muted-foreground">
                        Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Παρακαλώ ζητήστε νέο σύνδεσμο από το γραφείο.
                    </p>
                </Card>
            </div>
        );
    }

    const totalIncome = packages.reduce(
        (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0),
        0
    );

    const totalExpenses = packages.reduce(
        (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0),
        0
    );

    const profit = totalIncome - totalExpenses;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        ALFA Μονοπρόσωπη Ι.Κ.Ε.
                    </h1>
                    <p className="text-muted-foreground">
                        Μηνιαία Αναφορά - {monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy") : ""}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>📞 +30 694 207 2312</span>
                        <span>•</span>
                        <span>✉️ business@atravel.gr</span>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-6 md:grid-cols-3 mb-8">
                    <Card className="p-6 rounded-3xl bg-white shadow-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Συνολικά Έσοδα</p>
                        <p className="text-3xl font-bold text-green-600">€{totalIncome.toFixed(2)}</p>
                    </Card>

                    <Card className="p-6 rounded-3xl bg-white shadow-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Συνολικά Έξοδα</p>
                        <p className="text-3xl font-bold text-red-600">€{totalExpenses.toFixed(2)}</p>
                    </Card>

                    <Card className="p-6 rounded-3xl bg-white shadow-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Καθαρό Κέρδος</p>
                        <p className={`text-3xl font-bold ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            €{profit.toFixed(2)}
                        </p>
                    </Card>
                </div>

                {/* Packages List */}
                <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
                    <div className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <FileText className="h-6 w-6" />
                            Πακέτα ({packages.length})
                        </h2>
                    </div>

                    <div className="divide-y">
                        {packages.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                                <p>Δεν υπάρχουν πακέτα για αυτόν τον μήνα</p>
                            </div>
                        ) : (
                            packages.map((pkg) => {
                                const pkgIncome = pkg.invoices
                                    .filter((i) => (i.type || 'expense') === "income")
                                    .reduce((s, i) => s + (i.amount || 0), 0);
                                const pkgExpenses = pkg.invoices
                                    .filter((i) => (i.type || 'expense') === "expense")
                                    .reduce((s, i) => s + (i.amount || 0), 0);
                                const pkgProfit = pkgIncome - pkgExpenses;

                                return (
                                    <div key={pkg.id} className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold">{pkg.client_name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(pkg.start_date), "dd MMM")} -{" "}
                                                    {format(new Date(pkg.end_date), "dd MMM yyyy")}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">€{pkgProfit.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {pkgIncome > 0 ? ((pkgProfit / pkgIncome) * 100).toFixed(1) : 0}% περιθώριο
                                                </p>
                                            </div>
                                        </div>

                                        {/* Invoices */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-red-600 mb-2 uppercase tracking-tight">Έξοδα</h4>
                                                <div className="space-y-2">
                                                    {pkg.invoices
                                                        .filter((i) => (i.type || 'expense') === "expense")
                                                        .map((inv) => (
                                                            <div key={inv.id} className="group bg-muted/30 p-3 rounded-2xl transition-all hover:bg-muted/50">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-sm">{inv.merchant || inv.category}</p>
                                                                        <p className="text-xs text-muted-foreground">{inv.invoice_date || "No date"}</p>
                                                                    </div>
                                                                    <span className="font-bold text-red-600">€{(inv.amount || 0).toFixed(2)}</span>
                                                                </div>
                                                                <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-[10px] rounded-lg px-2"
                                                                        onClick={() => {
                                                                            const comment = prompt("Προσθέστε ένα σχόλιο ή ερώτηση για αυτό το έξοδο:");
                                                                            if (comment) postFeedback(inv.id, 'comment', comment);
                                                                        }}
                                                                    >
                                                                        Σχόλιο
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-7 text-[10px] rounded-lg px-2 bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500 hover:text-white"
                                                                        onClick={() => {
                                                                            if (confirm("Θέλετε να επισημάνετε αυτό το έξοδο ως αμφίβολο;")) {
                                                                                postFeedback(inv.id, 'doubt', 'Ο λογιστής επισήμανε αυτό το έξοδο ως αμφίβολο.');
                                                                            }
                                                                        }}
                                                                    >
                                                                        Αμφισβήτηση
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                                {pkg.invoices.filter((i) => (i.type || 'expense') === "expense").length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic p-2">Δεν υπάρχουν έξοδα</p>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-green-600 mb-2 uppercase tracking-tight">Έσοδα</h4>
                                                <div className="space-y-2">
                                                    {pkg.invoices
                                                        .filter((i) => (i.type || 'expense') === "income")
                                                        .map((inv) => (
                                                            <div key={inv.id} className="group bg-muted/30 p-3 rounded-2xl transition-all hover:bg-muted/50">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="font-semibold text-sm">{inv.merchant || inv.category}</p>
                                                                        <p className="text-xs text-muted-foreground">{inv.invoice_date || "No date"}</p>
                                                                    </div>
                                                                    <span className="font-bold text-green-600">€{(inv.amount || 0).toFixed(2)}</span>
                                                                </div>
                                                                <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 text-[10px] rounded-lg px-2"
                                                                        onClick={() => {
                                                                            const comment = prompt("Προσθέστε ένα σχόλιο ή ερώτηση για αυτό το έσοδο:");
                                                                            if (comment) postFeedback(inv.id, 'comment', comment);
                                                                        }}
                                                                    >
                                                                        Σχόλιο
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                                {pkg.invoices.filter((i) => (i.type || 'expense') === "income").length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic p-2">Δεν υπάρχουν έσοδα</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Card>

                {/* Bank Transactions Summary */}
                <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
                    <div className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CreditCard className="h-6 w-6" />
                            Τραπεζικές Κινήσεις ({transactions.length})
                        </h2>
                    </div>

                    <div className="p-6">
                        {transactions.length === 0 ? (
                            <p className="text-center text-muted-foreground">Δεν υπάρχουν καταγεγραμμένες κινήσεις</p>
                        ) : (
                            <div className="space-y-3">
                                {transactions.slice(0, 10).map((txn) => (
                                    <div key={txn.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                        <div>
                                            <p className="font-medium text-sm">{txn.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(txn.transaction_date), "dd MMM yyyy")}
                                            </p>
                                        </div>
                                        <span className={`font-bold ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            €{Math.abs(txn.amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                {transactions.length > 10 && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        ... και {transactions.length - 10} ακόμη κινήσεις
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground py-8">
                    <p>Αυτή η αναφορά δημιουργήθηκε αυτόματα από το TravelDocs.</p>
                    <p className="mt-1">Για απορίες επικοινωνήστε με το γραφείο.</p>
                </div>
            </div>
        </div>
    );
}
