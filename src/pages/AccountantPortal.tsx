import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Package, Invoice, BankTransaction } from "@/types/database";
import { CheckCircle2, AlertCircle, FileText, CreditCard } from "lucide-react";

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
                        Μηνιαία Αναφορά - {format(new Date(`${monthYear}-01`), "MMMM yyyy")}
                    </h1>
                    <p className="text-muted-foreground">Προβολή Μόνο Για Λογιστή</p>
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
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Έξοδα</h4>
                                                {pkg.invoices
                                                    .filter((i) => i.type === "expense")
                                                    .map((inv) => (
                                                        <div key={inv.id} className="flex justify-between text-sm py-1">
                                                            <span className="text-gray-600">{inv.merchant || inv.category}</span>
                                                            <span className="font-medium">€{(inv.amount || 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                {pkg.invoices.filter((i) => i.type === "expense").length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic">Δεν υπάρχουν</p>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">Έσοδα</h4>
                                                {pkg.invoices
                                                    .filter((i) => i.type === "income")
                                                    .map((inv) => (
                                                        <div key={inv.id} className="flex justify-between text-sm py-1">
                                                            <span className="text-gray-600">{inv.merchant || inv.category}</span>
                                                            <span className="font-medium text-green-600">€{(inv.amount || 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                {pkg.invoices.filter((i) => i.type === "income").length === 0 && (
                                                    <p className="text-sm text-muted-foreground italic">Δεν υπάρχουν</p>
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
