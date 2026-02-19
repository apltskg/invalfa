import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Invoice, BankTransaction } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    FileText, CreditCard, TrendingUp, TrendingDown,
    ArrowUpRight, ArrowDownRight, Calendar, Building2,
    Loader2, BarChart3
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMonth } from "@/contexts/MonthContext";

interface TimelineItem {
    id: string;
    date: string;
    type: "invoice" | "transaction";
    data: Invoice | BankTransaction;
    packageName?: string;
}

export default function Dashboard() {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { startDate, endDate, displayLabel } = useMonth();

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    async function fetchData() {
        setLoading(true);
        try {
            const [{ data: invoices }, { data: transactions }, { data: packages }] =
                await Promise.all([
                    supabase
                        .from("invoices")
                        .select("*")
                        .gte("invoice_date", startDate)
                        .lte("invoice_date", endDate)
                        .order("invoice_date", { ascending: false }),
                    supabase
                        .from("bank_transactions")
                        .select("*")
                        .gte("transaction_date", startDate)
                        .lte("transaction_date", endDate)
                        .order("transaction_date", { ascending: false }),
                    supabase.from("packages").select("*"),
                ]);

            const packageMap = new Map((packages || []).map((p) => [p.id, p.client_name]));

            const timeline: TimelineItem[] = [
                ...((invoices as Invoice[]) || []).map((inv) => ({
                    id: inv.id,
                    date: inv.invoice_date || inv.created_at,
                    type: "invoice" as const,
                    data: inv,
                    packageName: inv.package_id ? packageMap.get(inv.package_id) : undefined,
                })),
                ...((transactions as BankTransaction[]) || []).map((txn) => ({
                    id: txn.id,
                    date: txn.transaction_date,
                    type: "transaction" as const,
                    data: txn,
                    packageName: txn.package_id ? packageMap.get(txn.package_id) : undefined,
                })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setItems(timeline);
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    const totalIncome = items
        .filter((i) => i.type === "invoice" && (i.data as Invoice).type === "income")
        .reduce((s, i) => s + ((i.data as Invoice).amount || 0), 0);

    const totalExpenses = items
        .filter((i) => i.type === "invoice" && (i.data as Invoice).type === "expense")
        .reduce((s, i) => s + ((i.data as Invoice).amount || 0), 0);

    const bankCredit = items
        .filter((i) => i.type === "transaction" && (i.data as BankTransaction).amount > 0)
        .reduce((s, i) => s + (i.data as BankTransaction).amount, 0);

    const bankDebit = items
        .filter((i) => i.type === "transaction" && (i.data as BankTransaction).amount < 0)
        .reduce((s, i) => s + Math.abs((i.data as BankTransaction).amount), 0);

    const profit = totalIncome - totalExpenses;

    const groupedByDate = items.reduce((acc, item) => {
        const date = format(parseISO(item.date), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, TimelineItem[]>);

    // ── Stat card ────────────────────────────────────────────────────────────
    const StatCard = ({
        label, value, sub, icon: Icon, color, accent
    }: {
        label: string; value: string; sub?: string;
        icon: any; color: string; accent: string;
    }) => (
        <Card className={cn("rounded-2xl border border-slate-200 bg-white overflow-hidden")}>
            <div className={cn("h-1 w-full", accent)} />
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                        <p className={cn("text-2xl font-bold mt-1 tabular-nums", color)}>{value}</p>
                        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
                    </div>
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", accent.replace("bg-", "bg-").replace("-500", "-50").replace("-600", "-50"))}>
                        <Icon className={cn("h-5 w-5", color)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Αρχική</h1>
                    <p className="text-sm text-slate-500 mt-0.5 capitalize">{displayLabel}</p>
                </div>
                <Badge variant="outline" className="gap-1.5 text-xs border-slate-200 text-slate-600">
                    <BarChart3 className="h-3 w-3" />
                    {items.length} εγγραφές
                </Badge>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Έσοδα"
                    value={`€${totalIncome.toFixed(0)}`}
                    sub={`${items.filter(i => i.type === "invoice" && (i.data as Invoice).type === "income").length} παραστ.`}
                    icon={TrendingUp}
                    color="text-emerald-600"
                    accent="bg-emerald-500"
                />
                <StatCard
                    label="Έξοδα"
                    value={`€${totalExpenses.toFixed(0)}`}
                    sub={`${items.filter(i => i.type === "invoice" && (i.data as Invoice).type === "expense").length} παραστ.`}
                    icon={TrendingDown}
                    color="text-rose-600"
                    accent="bg-rose-500"
                />
                <StatCard
                    label="Κέρδος"
                    value={`€${profit.toFixed(0)}`}
                    sub={profit >= 0 ? "Θετικό αποτέλεσμα" : "Αρνητικό αποτέλεσμα"}
                    icon={profit >= 0 ? ArrowUpRight : ArrowDownRight}
                    color={profit >= 0 ? "text-emerald-600" : "text-rose-600"}
                    accent={profit >= 0 ? "bg-emerald-500" : "bg-rose-500"}
                />
                <StatCard
                    label="Τράπεζα"
                    value={`€${(bankCredit - bankDebit).toFixed(0)}`}
                    sub={`+${bankCredit.toFixed(0)} / -${bankDebit.toFixed(0)}`}
                    icon={CreditCard}
                    color="text-blue-600"
                    accent="bg-blue-500"
                />
            </div>

            {/* P&L Banner */}
            {!loading && (
                <div className={cn(
                    "rounded-2xl border px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    profit >= 0
                        ? "bg-emerald-50 border-emerald-200"
                        : "bg-rose-50 border-rose-200"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            profit >= 0 ? "bg-emerald-100" : "bg-rose-100"
                        )}>
                            {profit >= 0
                                ? <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                                : <ArrowDownRight className="h-5 w-5 text-rose-600" />}
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Καθαρό Αποτέλεσμα περιόδου</p>
                            <p className={cn(
                                "text-3xl font-bold tabular-nums leading-tight",
                                profit >= 0 ? "text-emerald-700" : "text-rose-700"
                            )}>
                                {profit >= 0 ? "+" : ""}€{profit.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <p className="text-xs text-slate-400">Μαρζινάλε</p>
                            <p className={cn("font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : "0.0"}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400">Κατάσταση</p>
                            <p className={cn("font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {profit >= 0 ? "Υγιές" : "Προσοχή"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Timeline */}
            <Card className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-5 py-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Χρονολόγιο Κινήσεων
                    </CardTitle>
                </CardHeader>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    </div>
                ) : Object.keys(groupedByDate).length === 0 ? (
                    <div className="p-16 text-center">
                        <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Δεν υπάρχουν κινήσεις αυτόν τον μήνα</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {Object.entries(groupedByDate).map(([date, dayItems], gi) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: gi * 0.04 }}
                            >
                                {/* Date header */}
                                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 capitalize">
                                        {format(parseISO(date), "EEEE, d MMMM yyyy", { locale: el })}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-400">
                                        {dayItems.length}
                                    </Badge>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-slate-50">
                                    {dayItems.map((item, idx) => {
                                        if (item.type === "invoice") {
                                            const inv = item.data as Invoice;
                                            const isIncome = inv.type === "income";
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                        isIncome ? "bg-emerald-50" : "bg-rose-50"
                                                    )}>
                                                        <FileText className={cn("h-4 w-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">
                                                            {inv.merchant || "Άγνωστος"}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-slate-400">{inv.category}</span>
                                                            {item.packageName && (
                                                                <Badge variant="secondary" className="text-[10px] py-0 h-4">{item.packageName}</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-semibold text-sm tabular-nums shrink-0", isIncome ? "text-emerald-600" : "text-rose-600")}>
                                                        {isIncome ? "+" : "-"}€{(inv.amount || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        } else {
                                            const txn = item.data as BankTransaction;
                                            const isCredit = txn.amount > 0;
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                        <CreditCard className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{txn.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(txn as any).bank_name && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                                                    <Building2 className="h-3 w-3" />
                                                                    {(txn as any).bank_name}
                                                                </span>
                                                            )}
                                                            {item.packageName && (
                                                                <Badge variant="secondary" className="text-[10px] py-0 h-4">{item.packageName}</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-semibold text-sm tabular-nums shrink-0", isCredit ? "text-emerald-600" : "text-slate-700")}>
                                                        {isCredit ? "+" : ""}€{txn.amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
