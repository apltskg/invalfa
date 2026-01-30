import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Package, Invoice, BankTransaction } from "@/types/database";
import { FileText, CreditCard, AlertCircle } from "lucide-react";
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
    generalInvoices?: Invoice[];
    error?: string;
}

export default function AccountantPortal() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [monthYear, setMonthYear] = useState("");
    const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
    const [generalInvoices, setGeneralInvoices] = useState<Invoice[]>([]);
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
            setGeneralInvoices(data.generalInvoices || []);
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-lg text-muted-foreground">Φόρτωση...</p>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="p-12 max-w-md text-center rounded-xl border-gray-200 shadow-sm">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Μη Έγκυρος Σύνδεσμος</h2>
                    <p className="text-muted-foreground">
                        Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Παρακαλώ ζητήστε νέο σύνδεσμο από το γραφείο.
                    </p>
                </Card>
            </div>
        );
    }

    const generalIncomeTotal = generalInvoices
        .filter(i => (i.type || 'expense') === 'income')
        .reduce((s, i) => s + (i.amount || 0), 0);

    const generalExpensesTotal = generalInvoices
        .filter(i => (i.type || 'expense') === 'expense')
        .reduce((s, i) => s + (i.amount || 0), 0);

    const totalIncome = packages.reduce(
        (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0),
        0
    ) + generalIncomeTotal;

    const totalExpenses = packages.reduce(
        (sum, pkg) => sum + pkg.invoices.filter((i) => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0),
        0
    ) + generalExpensesTotal;

    const profit = totalIncome - totalExpenses;

    const generalIncomeInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'income');
    const generalExpenseInvoices = generalInvoices.filter(i => (i.type || 'expense') === 'expense');

    return (
        <div className="min-h-screen bg-white text-gray-900 p-6 md:p-12">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">ALFA Μονοπρόσωπη Ι.Κ.Ε.</h1>
                        <p className="text-muted-foreground mt-1">
                            Μηνιαία Αναφορά - {monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy") : ""}
                        </p>
                    </div>
                    <div className="text-right mt-4 md:mt-0 text-sm text-gray-500">
                        <p>+30 694 207 2312</p>
                        <p>business@atravel.gr</p>
                    </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid gap-8 md:grid-cols-3">
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εσοδα</p>
                        <p className="text-3xl font-light mt-1">€{totalIncome.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Συνολικα Εξοδα</p>
                        <p className="text-3xl font-light mt-1">€{totalExpenses.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Καθαρο Κερδος</p>
                        <p className={`text-3xl font-medium mt-1 ${profit >= 0 ? "text-gray-900" : "text-red-600"}`}>
                            €{profit.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* General/Unassigned Section */}
                {(generalIncomeInvoices.length > 0 || generalExpenseInvoices.length > 0) && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* General Income */}
                        <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
                            <div className="p-6 bg-gradient-to-r from-emerald-500 to-green-600">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Γενικά Έσοδα
                                </h2>
                                <p className="text-white/80 text-sm mt-1">Εκτός Πακέτων</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {generalIncomeInvoices.map(inv => (
                                    <div key={inv.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                        <div>
                                            <p className="font-medium text-sm">{inv.merchant || 'Άγνωστο'}</p>
                                            <p className="text-xs text-muted-foreground">{inv.invoice_date}</p>
                                        </div>
                                        <span className="font-bold text-green-600">€{(inv.amount || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                {generalIncomeInvoices.length === 0 && <p className="text-sm text-muted-foreground italic">Κανένα γενικό έσοδο</p>}
                            </div>
                        </Card>

                        {/* General Expenses */}
                        <Card className="rounded-3xl overflow-hidden bg-white shadow-lg">
                            <div className="p-6 bg-gradient-to-r from-rose-500 to-red-600">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Γενικά Έξοδα
                                </h2>
                                <p className="text-white/80 text-sm mt-1">Λειτουργικά & Άλλα</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {generalExpenseInvoices.map(inv => (
                                    <div key={inv.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl">
                                        <div>
                                            <p className="font-medium text-sm">{inv.merchant || inv.category}</p>
                                            <p className="text-xs text-muted-foreground">{inv.invoice_date}</p>
                                        </div>
                                        <span className="font-bold text-red-600">€{(inv.amount || 0).toFixed(2)}</span>
                                    </div>
                                ))}
                                {generalExpenseInvoices.length === 0 && <p className="text-sm text-muted-foreground italic">Κανένα γενικό έξοδο</p>}
                            </div>
                        </Card>
                    </div>
                )}

                {/* Packages */}
                <div className="space-y-8">
                    <h2 className="text-xl font-bold border-b pb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Πακέτα & Κινήσεις
                    </h2>

                    {packages.length === 0 ? (
                        <p className="text-muted-foreground italic">Δεν υπάρχουν πακέτα για αυτόν τον μήνα.</p>
                    ) : (
                        <div className="grid gap-8">
                            {packages.map((pkg) => {
                                const pkgIncome = pkg.invoices.filter(i => (i.type || 'expense') === "income").reduce((s, i) => s + (i.amount || 0), 0);
                                const pkgExpenses = pkg.invoices.filter(i => (i.type || 'expense') === "expense").reduce((s, i) => s + (i.amount || 0), 0);
                                const pkgProfit = pkgIncome - pkgExpenses;

                                return (
                                    <div key={pkg.id} className="border rounded-xl p-6 hover:shadow-sm transition-shadow">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="font-bold text-lg">{pkg.client_name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(pkg.start_date), "dd MMM")} - {format(new Date(pkg.end_date), "dd MMM yyyy")}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block font-bold">€{pkgProfit.toFixed(2)}</span>
                                                <span className="text-xs text-muted-foreground">Κέρδος</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {pkg.invoices.map((inv) => (
                                                <div key={inv.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded px-2 -mx-2 group">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${inv.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                            <span className="font-medium text-sm">{inv.merchant || inv.category}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 pl-4">{inv.invoice_date || "-"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-medium">€{(inv.amount || 0).toFixed(2)}</span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                                                const comment = prompt("Σχόλιο:");
                                                                if (comment) postFeedback(inv.id, 'comment', comment);
                                                            }}>
                                                                <FileText className="h-3 w-3" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => {
                                                                if (confirm("Αμφισβήτηση?")) postFeedback(inv.id, 'doubt', 'Doubt');
                                                            }}>
                                                                <AlertCircle className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {pkg.invoices.length === 0 && <p className="text-sm text-muted-foreground">Κανένα παραστατικό</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Bank Transactions */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold border-b pb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Τραπεζικές Κινήσεις ({transactions.length})
                    </h2>
                    {transactions.length === 0 ? (
                        <p className="text-muted-foreground italic">Δεν υπάρχουν κινήσεις.</p>
                    ) : (
                        <div className="border rounded-xl divide-y">
                            {transactions.map((txn) => (
                                <div key={txn.id} className="flex justify-between items-center p-4 text-sm">
                                    <div className="space-y-1">
                                        <p className="font-medium">{txn.description}</p>
                                        <p className="text-gray-500 text-xs">{format(new Date(txn.transaction_date), "dd MMM yyyy")}</p>
                                    </div>
                                    <span className={`font-mono font-medium ${txn.amount >= 0 ? "text-gray-900" : "text-gray-900"}`}>
                                        €{Math.abs(txn.amount).toFixed(2)}
                                        <span className="text-xs text-gray-400 ml-1">{txn.amount >= 0 ? "CR" : "DR"}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-12 text-center text-xs text-gray-400">
                    <p>© {new Date().getFullYear()} TravelDocs. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}


