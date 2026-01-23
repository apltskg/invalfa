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

export default function AccountantPortal() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [monthYear, setMonthYear] = useState("");
    const [packages, setPackages] = useState<(Package & { invoices: Invoice[] })[]>([]);
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);

    useEffect(() => {
        verifyAndFetch();
    }, [token]);

    async function verifyAndFetch() {
        try {
            // Verify magic link token
            const { data: link } = await supabase
                .from("accountant_magic_links")
                .select("*")
                .eq("token", token)
                .single();

            if (!link || new Date(link.expires_at) < new Date()) {
                setAuthorized(false);
                setLoading(false);
                return;
            }

            setAuthorized(true);
            setMonthYear(link.month_year);

            // Fetch packages for this month
            const { data: pkgs } = await supabase
                .from("packages")
                .select("*")
                .gte("start_date", `${link.month_year}-01`)
                .lt("start_date", `${getNextMonth(link.month_year)}-01`);

            const { data: invs } = await supabase.from("invoices").select("*");
            const { data: txns } = await supabase.from("bank_transactions").select("*");

            const packagesWithInvoices = (pkgs || []).map((pkg) => ({
                ...pkg,
                invoices: ((invs || []) as any[]).filter((inv) => inv.package_id === pkg.id),
            })) as (Package & { invoices: Invoice[] })[];

            setPackages(packagesWithInvoices);
            setTransactions((txns as BankTransaction[]) || []);
        } catch (error) {
            console.error("Error verifying magic link:", error);
            setAuthorized(false);
        } finally {
            setLoading(false);
        }
    }

    function getNextMonth(monthYear: string) {
        const [year, month] = monthYear.split("-");
        const next = new Date(parseInt(year), parseInt(month), 1);
        return format(next, "yyyy-MM");
    }

    async function postFeedback(invoiceId: string, type: 'comment' | 'doubt', content: string) {
        try {
            await supabase.from('invoice_comments').insert([{
                invoice_id: invoiceId,
                comment_text: content,
                is_from_accountant: true,
                is_doubt: type === 'doubt'
            }]);

            // Also create a notification
            await supabase.from('notifications').insert([{
                type: type === 'doubt' ? 'warning' : 'info',
                title: type === 'doubt' ? 'Αμφισβήτηση από Λογιστή' : 'Νέο Σχόλιο Λογιστή',
                message: content,
                invoice_id: invoiceId
            }]);

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
        (sum, pkg) => sum + pkg.invoices.filter((i) => i.type === "income").reduce((s, i) => s + (i.amount || 0), 0),
        0
    );

    const totalExpenses = packages.reduce(
        (sum, pkg) => sum + pkg.invoices.filter((i) => i.type === "expense").reduce((s, i) => s + (i.amount || 0), 0),
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
                        Μηνιαία Αναφορά - {format(new Date(`${monthYear}-01`), "MMMM yyyy")}
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
                                    .filter((i) => i.type === "income")
                                    .reduce((s, i) => s + (i.amount || 0), 0);
                                const pkgExpenses = pkg.invoices
                                    .filter((i) => i.type === "expense")
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
                                                    {((pkgProfit / pkgIncome) * 100).toFixed(1)}% περιθώριο
                                                </p>
                                            </div>
                                        </div>

                                        {/* Invoices */}
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-red-600 mb-2 uppercase tracking-tight">Έξοδα</h4>
                                                <div className="space-y-2">
                                                    {pkg.invoices
                                                        .filter((i) => i.type === "expense")
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
                                                {pkg.invoices.filter((i) => i.type === "expense").length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic p-2">Δεν υπάρχουν έξοδα</p>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-green-600 mb-2 uppercase tracking-tight">Έσοδα</h4>
                                                <div className="space-y-2">
                                                    {pkg.invoices
                                                        .filter((i) => i.type === "income")
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
                                                {pkg.invoices.filter((i) => i.type === "income").length === 0 && (
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
                    <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-600">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CreditCard className="h-6 w-6" />
                            Τραπεζικές Συναλλαγές ({transactions.length})
                        </h2>
                    </div>

                    <div className="p-6">
                        <div className="grid gap-2">
                            {transactions.slice(0, 10).map((txn) => (
                                <div key={txn.id} className="flex justify-between items-center text-sm py-2 border-b">
                                    <div>
                                        <p className="font-medium">{txn.description}</p>
                                        <p className="text-xs text-muted-foreground">{txn.transaction_date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${txn.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            €{Math.abs(txn.amount).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Footer */}
                <div className="text-center text-sm text-muted-foreground pt-8 pb-4">
                    <p>© TravelDocs - Αυτός ο σύνδεσμος θα λήξει σύντομα</p>
                </div>
            </div>
        </div>
    );
}
