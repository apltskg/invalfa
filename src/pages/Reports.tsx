import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Download,
    FileSpreadsheet,
    Clock,
    DollarSign,
    Users,
    AlertTriangle,
    TrendingUp,
    BarChart3,
    Loader2,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { el } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getAgedReceivables, getOverdueInvoices } from "@/lib/payment-reminders";
import { toast } from "sonner";

interface PaymentHistoryItem {
    id: string;
    date: string;
    type: 'income' | 'expense';
    description: string;
    amount: number;
    invoiceId: string | null;
    customerOrSupplier: string;
}

export default function Reports() {
    const [loading, setLoading] = useState(true);
    const [agedReceivables, setAgedReceivables] = useState<Awaited<ReturnType<typeof getAgedReceivables>> | null>(null);
    const [overdueData, setOverdueData] = useState<Awaited<ReturnType<typeof getOverdueInvoices>> | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("3m");
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subMonths(new Date(), 3),
        to: new Date(),
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        loadPaymentHistory();
    }, [dateRange]);

    async function loadData() {
        setLoading(true);
        try {
            const [aged, overdue] = await Promise.all([
                getAgedReceivables(),
                getOverdueInvoices(30),
            ]);
            setAgedReceivables(aged);
            setOverdueData(overdue);
        } catch (error) {
            console.error("Error loading report data:", error);
            toast.error("Σφάλμα φόρτωσης αναφορών");
        } finally {
            setLoading(false);
        }
    }

    async function loadPaymentHistory() {
        try {
            // Get matched transactions (these are "payments")
            const { data: matches } = await supabase
                .from("invoice_transaction_matches")
                .select(`
          id,
          matched_at,
          invoices (
            id,
            type,
            amount,
            merchant,
            customer_id,
            customers (name)
          ),
          bank_transactions (
            id,
            transaction_date,
            description,
            amount
          )
        `)
                .gte("matched_at", dateRange.from.toISOString())
                .lte("matched_at", dateRange.to.toISOString())
                .order("matched_at", { ascending: false });

            const history: PaymentHistoryItem[] = (matches || []).map((match: any) => {
                const inv = match.invoices;
                const txn = match.bank_transactions;
                const customer = inv?.customers as any;

                return {
                    id: match.id,
                    date: txn?.transaction_date || match.matched_at,
                    type: inv?.type || 'income',
                    description: txn?.description || "",
                    amount: Math.abs(txn?.amount || inv?.amount || 0),
                    invoiceId: inv?.id,
                    customerOrSupplier: customer?.name || inv?.merchant || "Άγνωστος",
                };
            });

            setPaymentHistory(history);
        } catch (error) {
            console.error("Error loading payment history:", error);
        }
    }

    function handlePeriodChange(period: string) {
        setSelectedPeriod(period);
        const now = new Date();
        let from: Date;

        switch (period) {
            case "1m":
                from = subMonths(now, 1);
                break;
            case "3m":
                from = subMonths(now, 3);
                break;
            case "6m":
                from = subMonths(now, 6);
                break;
            case "1y":
                from = subMonths(now, 12);
                break;
            default:
                from = subMonths(now, 3);
        }

        setDateRange({ from, to: now });
    }

    async function exportToCSV(type: 'aged' | 'payments') {
        let csv = "";
        let filename = "";

        if (type === 'aged' && agedReceivables) {
            filename = `aged_receivables_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            csv = "Πελάτης,Τρέχον,1-30 ημ,31-60 ημ,61-90 ημ,90+ ημ,Σύνολο\n";

            for (const customer of agedReceivables.byCustomer) {
                csv += `"${customer.customerName}",${customer.current.toFixed(2)},${customer.days30.toFixed(2)},${customer.days60.toFixed(2)},${customer.days90.toFixed(2)},${customer.days90Plus.toFixed(2)},${customer.total.toFixed(2)}\n`;
            }

            csv += `\n"ΣΥΝΟΛΟ",${agedReceivables.current.amount.toFixed(2)},${agedReceivables.days30.amount.toFixed(2)},${agedReceivables.days60.amount.toFixed(2)},${agedReceivables.days90.amount.toFixed(2)},${agedReceivables.days90Plus.amount.toFixed(2)},${agedReceivables.total.amount.toFixed(2)}\n`;
        } else if (type === 'payments') {
            filename = `payment_history_${format(new Date(), 'yyyy-MM-dd')}.csv`;
            csv = "Ημερομηνία,Τύπος,Πελάτης/Προμηθευτής,Περιγραφή,Ποσό\n";

            for (const item of paymentHistory) {
                csv += `"${format(new Date(item.date), 'dd/MM/yyyy')}","${item.type === 'income' ? 'Είσπραξη' : 'Πληρωμή'}","${item.customerOrSupplier}","${item.description}",${item.amount.toFixed(2)}\n`;
            }
        }

        // Download
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();

        toast.success("Το αρχείο εξήχθη επιτυχώς!");
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            </div>
        );
    }

    const incomePayments = paymentHistory.filter(p => p.type === 'income');
    const expensePayments = paymentHistory.filter(p => p.type === 'expense');
    const totalCollected = incomePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = expensePayments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Αναφορές</h1>
                <p className="text-slate-500 text-sm mt-1">
                    Οικονομικές αναφορές και στατιστικά πληρωμών
                </p>
            </div>

            <Tabs defaultValue="aged" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-10">
                    <TabsTrigger value="aged" className="rounded-lg gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        Ηλικιακή Ανάλυση
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-lg gap-2 text-sm">
                        <DollarSign className="h-4 w-4" />
                        Ιστορικό Πληρωμών
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="rounded-lg gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Εκκρεμότητες
                    </TabsTrigger>
                </TabsList>

                {/* Aged Receivables Tab */}
                <TabsContent value="aged" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Ηλικιακή Ανάλυση Απαιτήσεων</h2>
                        <Button onClick={() => exportToCSV('aged')} className="gap-2 rounded-xl">
                            <Download className="h-4 w-4" />
                            Εξαγωγή CSV
                        </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">Τρέχον</div>
                            <div className="text-2xl font-bold text-green-600 mt-1">
                                €{agedReceivables?.current.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.current.count || 0} τιμ.
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">1-30 ημέρες</div>
                            <div className="text-2xl font-bold text-yellow-600 mt-1">
                                €{agedReceivables?.days30.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.days30.count || 0} τιμ.
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">31-60 ημέρες</div>
                            <div className="text-2xl font-bold text-orange-600 mt-1">
                                €{agedReceivables?.days60.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.days60.count || 0} τιμ.
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">61-90 ημέρες</div>
                            <div className="text-2xl font-bold text-red-500 mt-1">
                                €{agedReceivables?.days90.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.days90.count || 0} τιμ.
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">90+ ημέρες</div>
                            <div className="text-2xl font-bold text-red-700 mt-1">
                                €{agedReceivables?.days90Plus.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.days90Plus.count || 0} τιμ.
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl bg-primary/5">
                            <div className="text-sm text-muted-foreground">Σύνολο</div>
                            <div className="text-2xl font-bold mt-1">
                                €{agedReceivables?.total.amount.toFixed(0) || 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {agedReceivables?.total.count || 0} τιμ.
                            </div>
                        </Card>
                    </div>

                    {/* By Customer Table */}
                    <Card className="rounded-2xl overflow-hidden">
                        <div className="p-4 border-b bg-muted/30">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Ανά Πελάτη
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 text-sm">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Πελάτης</th>
                                        <th className="text-right p-3 font-medium">Τρέχον</th>
                                        <th className="text-right p-3 font-medium">1-30</th>
                                        <th className="text-right p-3 font-medium">31-60</th>
                                        <th className="text-right p-3 font-medium">61-90</th>
                                        <th className="text-right p-3 font-medium">90+</th>
                                        <th className="text-right p-3 font-medium">Σύνολο</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {agedReceivables?.byCustomer.slice(0, 20).map((customer, i) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="p-3 font-medium">{customer.customerName}</td>
                                            <td className="p-3 text-right text-green-600">
                                                {customer.current > 0 ? `€${customer.current.toFixed(0)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right text-yellow-600">
                                                {customer.days30 > 0 ? `€${customer.days30.toFixed(0)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right text-orange-600">
                                                {customer.days60 > 0 ? `€${customer.days60.toFixed(0)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right text-red-500">
                                                {customer.days90 > 0 ? `€${customer.days90.toFixed(0)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right text-red-700">
                                                {customer.days90Plus > 0 ? `€${customer.days90Plus.toFixed(0)}` : '-'}
                                            </td>
                                            <td className="p-3 text-right font-semibold">
                                                €{customer.total.toFixed(0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* Payment History Tab */}
                <TabsContent value="payments" className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-xl font-semibold">Ιστορικό Πληρωμών</h2>
                        <div className="flex items-center gap-4">
                            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                                <SelectTrigger className="w-[140px] rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1m">Τελευταίος μήνας</SelectItem>
                                    <SelectItem value="3m">3 μήνες</SelectItem>
                                    <SelectItem value="6m">6 μήνες</SelectItem>
                                    <SelectItem value="1y">1 έτος</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={() => exportToCSV('payments')} variant="outline" className="gap-2 rounded-xl">
                                <Download className="h-4 w-4" />
                                Εξαγωγή
                            </Button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <ArrowUpRight className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Εισπράξεις</div>
                                    <div className="text-2xl font-bold text-green-600">€{totalCollected.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">{incomePayments.length} συναλλαγές</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <ArrowDownRight className="h-6 w-6 text-red-600" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Πληρωμές</div>
                                    <div className="text-2xl font-bold text-red-600">€{totalPaid.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">{expensePayments.length} συναλλαγές</div>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-6 rounded-2xl bg-primary/5">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Καθαρή Ροή</div>
                                    <div className={`text-2xl font-bold ${totalCollected - totalPaid >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        €{(totalCollected - totalPaid).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {format(dateRange.from, 'dd/MM')} - {format(dateRange.to, 'dd/MM/yyyy')}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Payment History Table */}
                    <Card className="rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 text-sm">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Ημερομηνία</th>
                                        <th className="text-left p-3 font-medium">Τύπος</th>
                                        <th className="text-left p-3 font-medium">Πελάτης/Προμηθευτής</th>
                                        <th className="text-left p-3 font-medium">Περιγραφή</th>
                                        <th className="text-right p-3 font-medium">Ποσό</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {paymentHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                Δεν βρέθηκαν πληρωμές για την επιλεγμένη περίοδο
                                            </td>
                                        </tr>
                                    ) : (
                                        paymentHistory.slice(0, 50).map((item) => (
                                            <tr key={item.id} className="hover:bg-muted/30">
                                                <td className="p-3">
                                                    {format(new Date(item.date), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant={item.type === 'income' ? 'default' : 'secondary'} className="rounded-lg">
                                                        {item.type === 'income' ? 'Είσπραξη' : 'Πληρωμή'}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-medium">{item.customerOrSupplier}</td>
                                                <td className="p-3 text-muted-foreground text-sm max-w-[200px] truncate">
                                                    {item.description}
                                                </td>
                                                <td className={`p-3 text-right font-medium ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {item.type === 'income' ? '+' : '-'}€{item.amount.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* Overdue Tab */}
                <TabsContent value="overdue" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Εκκρεμείς Πληρωμές</h2>
                        <Badge variant="destructive" className="text-sm px-3 py-1 rounded-lg">
                            {overdueData?.stats.total || 0} εκκρεμότητες
                        </Badge>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">30-60 ημέρες</div>
                            <div className="text-2xl font-bold text-yellow-600 mt-1">
                                {overdueData?.stats.overdue30 || 0}
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">60-90 ημέρες</div>
                            <div className="text-2xl font-bold text-orange-600 mt-1">
                                {overdueData?.stats.overdue60 || 0}
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl">
                            <div className="text-sm text-muted-foreground">90+ ημέρες</div>
                            <div className="text-2xl font-bold text-red-600 mt-1">
                                {overdueData?.stats.overdue90Plus || 0}
                            </div>
                        </Card>
                        <Card className="p-4 rounded-2xl bg-red-500/5">
                            <div className="text-sm text-muted-foreground">Συνολικό Ποσό</div>
                            <div className="text-2xl font-bold text-red-600 mt-1">
                                €{overdueData?.stats.totalAmount.toFixed(0) || 0}
                            </div>
                        </Card>
                    </div>

                    {/* Overdue List */}
                    <Card className="rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 text-sm">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Πελάτης</th>
                                        <th className="text-left p-3 font-medium">Τιμολόγιο</th>
                                        <th className="text-left p-3 font-medium">Ημερομηνία</th>
                                        <th className="text-right p-3 font-medium">Ποσό</th>
                                        <th className="text-right p-3 font-medium">Ημέρες</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {overdueData?.reminders.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                Δεν υπάρχουν εκκρεμείς πληρωμές 🎉
                                            </td>
                                        </tr>
                                    ) : (
                                        overdueData?.reminders.slice(0, 30).map((reminder) => (
                                            <tr key={reminder.id} className="hover:bg-muted/30">
                                                <td className="p-3">
                                                    <div className="font-medium">{reminder.customerName}</div>
                                                    {reminder.customerEmail && (
                                                        <div className="text-xs text-muted-foreground">{reminder.customerEmail}</div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-muted-foreground">
                                                    {reminder.invoiceNumber || '-'}
                                                </td>
                                                <td className="p-3">
                                                    {format(new Date(reminder.invoiceDate), 'dd/MM/yyyy')}
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    €{reminder.amount.toFixed(2)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <Badge
                                                        variant={reminder.daysPastDue >= 90 ? 'destructive' : reminder.daysPastDue >= 60 ? 'default' : 'secondary'}
                                                        className="rounded-lg"
                                                    >
                                                        {reminder.daysPastDue} ημ.
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
