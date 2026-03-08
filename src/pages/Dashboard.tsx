import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Invoice, BankTransaction } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    FileText, CreditCard, TrendingUp, TrendingDown,
    ArrowUpRight, ArrowDownRight, Calendar, Building2,
    Loader2, BarChart3, ClipboardCheck, ChevronRight, X,
    AlertCircle, Receipt, ArrowLeftRight, LayoutDashboard
} from "lucide-react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMonth } from "@/contexts/MonthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart } from "recharts";
import { RecurringExpensesWidget } from "@/components/dashboard/RecurringExpensesWidget";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";

interface TimelineItem {
    id: string;
    date: string;
    type: "invoice" | "transaction";
    data: Invoice | BankTransaction;
    packageName?: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissedBanner, setDismissedBanner] = useState(false);
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [pendingExpenses, setPendingExpenses] = useState(0);
    const [trendData, setTrendData] = useState<{ month: string; income: number; expenses: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
    const { startDate, endDate, displayLabel } = useMonth();

    // Show monthly closing banner in the first 10 days of the month
    const now = new Date();
    const isMonthStart = now.getDate() <= 10;
    const prevMonthLabel = format(subMonths(now, 1), "MMMM", { locale: el });
    const showBanner = isMonthStart && !dismissedBanner;

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

            const unmatched = (transactions || []).filter((t: any) => t.match_status === "unmatched").length;
            setUnmatchedCount(unmatched);

            const pendingExp = (invoices || []).filter((i: any) => i.type === "expense" && !i.supplier_id).length;
            setPendingExpenses(pendingExp);

            fetchTrend();
            fetchCategories();
        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTrend() {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        const rangeStart = format(startOfMonth(sixMonthsAgo), "yyyy-MM-dd");
        const rangeEnd = format(endOfMonth(now), "yyyy-MM-dd");

        // Single query for all 6 months
        const { data: invs } = await supabase
            .from("invoices")
            .select("amount, type, invoice_date")
            .gte("invoice_date", rangeStart)
            .lte("invoice_date", rangeEnd);

        const months: { month: string; income: number; expenses: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const target = subMonths(now, i);
            const mStart = startOfMonth(target).getTime();
            const mEnd = endOfMonth(target).getTime();
            const label = format(target, "MMM", { locale: el });

            const monthInvs = (invs || []).filter((inv: any) => {
                const d = new Date(inv.invoice_date).getTime();
                return d >= mStart && d <= mEnd;
            });

            const income = monthInvs.filter((i: any) => i.type === "income").reduce((s: number, i: any) => s + (i.amount || 0), 0);
            const expenses = monthInvs.filter((i: any) => i.type === "expense").reduce((s: number, i: any) => s + (i.amount || 0), 0);
            months.push({ month: label, income, expenses });
        }
        setTrendData(months);
    }

    async function fetchCategories() {
        const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
        const { data: cats } = await supabase
            .from("invoices")
            .select("amount, expense_category_id, category")
            .eq("type", "expense")
            .gte("invoice_date", startDate)
            .lte("invoice_date", endDate);

        if (!cats || cats.length === 0) {
            setCategoryData([]);
            return;
        }

        const { data: expCats } = await supabase.from("expense_categories").select("id, name_el");
        const catMap = new Map((expCats || []).map(c => [c.id, c.name_el]));

        const grouped: Record<string, number> = {};
        for (const inv of cats) {
            const name = (inv.expense_category_id && catMap.get(inv.expense_category_id)) || inv.category || "Άλλο";
            grouped[name] = (grouped[name] || 0) + (inv.amount || 0);
        }

        const sorted = Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value], i) => ({ name, value: Math.round(value), color: COLORS[i % COLORS.length] }));

        setCategoryData(sorted);
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
        <Card className={cn("rounded-2xl border border-border bg-card overflow-hidden")}>
            <div className={cn("h-1 w-full", accent)} />
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                        <p className={cn("text-2xl font-bold mt-1 tabular-nums", color)}>{value}</p>
                        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
                    </div>
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-muted")}>
                        <Icon className={cn("h-5 w-5", color)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return <PageSkeleton variant="dashboard" />;
    }

    // Onboarding empty state when no data exists
    const hasNoData = items.length === 0 && trendData.every(t => t.income === 0 && t.expenses === 0);
    if (hasNoData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Αρχική</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">{displayLabel}</p>
                </div>
                <EmptyState
                    icon={LayoutDashboard}
                    title="Καλωσήρθατε στο Always First!"
                    description="Ξεκινήστε δημιουργώντας τον πρώτο σας φάκελο ταξιδιού ή ανεβάζοντας τα πρώτα παραστατικά."
                    actionLabel="Δημιουργία Φακέλου"
                    onAction={() => navigate("/packages")}
                    secondaryLabel="Ανέβασμα Εξόδου"
                    onSecondary={() => navigate("/general-expenses")}
                    hints={[
                        "Δημιουργήστε φακέλους ταξιδιών για κάθε γκρουπ",
                        "Ανεβάστε παραστατικά (PDF/JPG) — η AI τα αναγνωρίζει αυτόματα",
                        "Εισάγετε extrait τράπεζας και αντιστοιχίστε κινήσεις",
                        "Στείλτε τα πάντα στον λογιστή με ένα κλικ"
                    ]}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Αρχική</h1>
                    <p className="text-sm text-muted-foreground mt-0.5 capitalize">{displayLabel}</p>
                </div>
                <Badge variant="outline" className="gap-1.5 text-xs border-border text-muted-foreground">
                    <BarChart3 className="h-3 w-3" />
                    {items.length} εγγραφές
                </Badge>
            </div>

            {/* Monthly Closing Banner */}
            {showBanner && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="rounded-2xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <ClipboardCheck className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground">
                                    Ώρα για κλείσιμο {prevMonthLabel}!
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ανεβάστε τα παραστατικά, αντιστοιχίστε τις κινήσεις και στείλτε στον λογιστή
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => navigate("/monthly-closing")}
                                className="rounded-xl gap-1.5 text-xs shrink-0"
                            >
                                Ξεκινήστε
                                <ChevronRight className="h-3 w-3" />
                            </Button>
                            <button
                                onClick={() => setDismissedBanner(true)}
                                className="p-1 rounded-lg hover:bg-muted shrink-0"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

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
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-rose-500/10 border-rose-500/30"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            profit >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"
                        )}>
                            {profit >= 0
                                ? <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                                : <ArrowDownRight className="h-5 w-5 text-rose-600" />}
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Καθαρό Αποτέλεσμα περιόδου</p>
                            <p className={cn(
                                "text-3xl font-bold tabular-nums leading-tight",
                                profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                            )}>
                                {profit >= 0 ? "+" : ""}€{profit.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground/70">Μαρζινάλε</p>
                            <p className={cn("font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : "0.0"}%
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground/70">Κατάσταση</p>
                            <p className={cn("font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {profit >= 0 ? "Υγιές" : "Προσοχή"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Insights Widgets */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Unmatched Transactions */}
                    <Card className={cn(
                        "rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
                        unmatchedCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
                    )} onClick={() => navigate("/bank-sync")}>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Χωρίς Αντιστοίχιση</p>
                                    <p className={cn("text-3xl font-bold mt-1 tabular-nums", unmatchedCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                                        {unmatchedCount}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">τραπεζικές κινήσεις</p>
                                </div>
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", unmatchedCount > 0 ? "bg-amber-500/15" : "bg-emerald-500/10")}>
                                    <ArrowLeftRight className={cn("h-5 w-5", unmatchedCount > 0 ? "text-amber-600" : "text-emerald-600")} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Expenses */}
                    <Card className={cn(
                        "rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md transition-shadow",
                        pendingExpenses > 0 ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-card"
                    )} onClick={() => navigate("/general-expenses")}>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Έξοδα χωρίς Προμηθευτή</p>
                                    <p className={cn("text-3xl font-bold mt-1 tabular-nums", pendingExpenses > 0 ? "text-blue-600" : "text-emerald-600")}>
                                        {pendingExpenses}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">χρειάζονται ενημέρωση</p>
                                </div>
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", pendingExpenses > 0 ? "bg-blue-500/15" : "bg-emerald-500/10")}>
                                    <Receipt className={cn("h-5 w-5", pendingExpenses > 0 ? "text-blue-600" : "text-emerald-600")} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Invoices Count */}
                    <Card className="rounded-2xl border border-border bg-card overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/invoice-list")}>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Παραστατικά Μήνα</p>
                                    <p className="text-3xl font-bold mt-1 tabular-nums text-foreground">
                                        {items.filter(i => i.type === "invoice").length}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                                        {items.filter(i => i.type === "invoice" && (i.data as Invoice).type === "income").length} έσοδα / {items.filter(i => i.type === "invoice" && (i.data as Invoice).type === "expense").length} έξοδα
                                    </p>
                                </div>
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-muted">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Recurring Expenses Detection */}
            {!loading && (
                <RecurringExpensesWidget startDate={startDate} endDate={endDate} />
            )}

            {/* Charts Grid */}
            {(trendData.length > 0 || categoryData.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* 6-Month Trend Area Chart */}
                    {trendData.length > 0 && (
                        <Card className="rounded-2xl border border-border bg-card overflow-hidden">
                            <CardHeader className="px-5 py-4 border-b border-border">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                    Τάση Εσόδων / Εξόδων (6 μήνες)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                                        <Tooltip
                                            formatter={(value: number, name: string) => [`€${value.toFixed(0)}`, name === "income" ? "Έσοδα" : "Έξοδα"]}
                                            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                                        />
                                        <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} fill="url(#gradIncome)" name="income" />
                                        <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} fill="url(#gradExpense)" name="expenses" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <div className="flex items-center justify-center gap-6 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                        <span className="text-xs text-muted-foreground">Έσοδα</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-rose-500" />
                                        <span className="text-xs text-muted-foreground">Έξοδα</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Top Categories Pie Chart */}
                    {categoryData.length > 0 && (
                        <Card className="rounded-2xl border border-border bg-card overflow-hidden">
                            <CardHeader className="px-5 py-4 border-b border-border">
                                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-muted-foreground" />
                                    Κορυφαίες Κατηγορίες Εξόδων
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                            nameKey="name"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => [`€${value.toLocaleString()}`, ""]}
                                            contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                                    {categoryData.map((cat) => (
                                        <div key={cat.name} className="flex items-center gap-1.5">
                                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                            <span className="text-[11px] text-muted-foreground">{cat.name}</span>
                                            <span className="text-[10px] font-medium text-muted-foreground/70">€{cat.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Timeline */}
            <Card className="rounded-2xl border border-border bg-card overflow-hidden">
                <CardHeader className="px-5 py-4 border-b border-border">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Χρονολόγιο Κινήσεων
                    </CardTitle>
                </CardHeader>

                {loading ? (
                    <div className="flex items-center justify-center p-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
                    </div>
                ) : Object.keys(groupedByDate).length === 0 ? (
                    <div className="p-16 text-center">
                        <Calendar className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Δεν υπάρχουν κινήσεις αυτόν τον μήνα</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {Object.entries(groupedByDate).map(([date, dayItems], gi) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: gi * 0.04 }}
                            >
                                {/* Date header */}
                                <div className="px-5 py-2.5 bg-muted/50 border-b border-border flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground capitalize">
                                        {format(parseISO(date), "EEEE, d MMMM yyyy", { locale: el })}
                                    </p>
                                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground/70">
                                        {dayItems.length}
                                    </Badge>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-border/50">
                                    {dayItems.map((item, idx) => {
                                        if (item.type === "invoice") {
                                            const inv = item.data as Invoice;
                                            const isIncome = inv.type === "income";
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                        isIncome ? "bg-emerald-500/10" : "bg-rose-500/10"
                                                    )}>
                                                        <FileText className={cn("h-4 w-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {inv.merchant || "Άγνωστος"}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-muted-foreground">{inv.category}</span>
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
                                                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50 transition-colors">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                                        <CreditCard className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{txn.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(txn as any).bank_name && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <Building2 className="h-3 w-3" />
                                                                    {(txn as any).bank_name}
                                                                </span>
                                                            )}
                                                            {item.packageName && (
                                                                <Badge variant="secondary" className="text-[10px] py-0 h-4">{item.packageName}</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-semibold text-sm tabular-nums shrink-0", isCredit ? "text-emerald-600" : "text-foreground")}>
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
