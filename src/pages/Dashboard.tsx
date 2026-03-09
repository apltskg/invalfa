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
    Loader2, ChevronRight, X, Receipt, ArrowLeftRight,
    LayoutDashboard, ClipboardCheck, ExternalLink
} from "lucide-react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { el } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMonth } from "@/contexts/MonthContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { RecurringExpensesWidget } from "@/components/dashboard/RecurringExpensesWidget";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

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
    const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("traveldocs_onboarded"));
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [pendingExpenses, setPendingExpenses] = useState(0);
    const [trendData, setTrendData] = useState<{ month: string; income: number; expenses: number }[]>([]);
    const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
    const { startDate, endDate, displayLabel } = useMonth();

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
                    supabase.from("invoices").select("*")
                        .gte("invoice_date", startDate).lte("invoice_date", endDate)
                        .order("invoice_date", { ascending: false }),
                    supabase.from("bank_transactions").select("*")
                        .gte("transaction_date", startDate).lte("transaction_date", endDate)
                        .order("transaction_date", { ascending: false }),
                    supabase.from("packages").select("*"),
                ]);

            const packageMap = new Map((packages || []).map((p) => [p.id, p.client_name]));
            const timeline: TimelineItem[] = [
                ...((invoices as Invoice[]) || []).map((inv) => ({
                    id: inv.id, date: inv.invoice_date || inv.created_at,
                    type: "invoice" as const, data: inv,
                    packageName: inv.package_id ? packageMap.get(inv.package_id) : undefined,
                })),
                ...((transactions as BankTransaction[]) || []).map((txn) => ({
                    id: txn.id, date: txn.transaction_date,
                    type: "transaction" as const, data: txn,
                    packageName: txn.package_id ? packageMap.get(txn.package_id) : undefined,
                })),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setItems(timeline);
            setUnmatchedCount((transactions || []).filter((t: any) => t.match_status === "unmatched").length);
            setPendingExpenses((invoices || []).filter((i: any) => i.type === "expense" && !i.supplier_id).length);
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
        const { data: invs } = await supabase.from("invoices")
            .select("amount, type, invoice_date")
            .gte("invoice_date", rangeStart).lte("invoice_date", rangeEnd);

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
        const COLORS = ["hsl(var(--primary))", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];
        const { data: cats } = await supabase.from("invoices")
            .select("amount, expense_category_id, category")
            .eq("type", "expense").gte("invoice_date", startDate).lte("invoice_date", endDate);
        if (!cats || cats.length === 0) { setCategoryData([]); return; }
        const { data: expCats } = await supabase.from("expense_categories").select("id, name_el");
        const catMap = new Map((expCats || []).map(c => [c.id, c.name_el]));
        const grouped: Record<string, number> = {};
        for (const inv of cats) {
            const name = (inv.expense_category_id && catMap.get(inv.expense_category_id)) || inv.category || "Άλλο";
            grouped[name] = (grouped[name] || 0) + (inv.amount || 0);
        }
        const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, value], i) => ({ name, value: Math.round(value), color: COLORS[i % COLORS.length] }));
        setCategoryData(sorted);
    }

    const totalIncome = items.filter((i) => i.type === "invoice" && (i.data as Invoice).type === "income")
        .reduce((s, i) => s + ((i.data as Invoice).amount || 0), 0);
    const totalExpenses = items.filter((i) => i.type === "invoice" && (i.data as Invoice).type === "expense")
        .reduce((s, i) => s + ((i.data as Invoice).amount || 0), 0);
    const bankCredit = items.filter((i) => i.type === "transaction" && (i.data as BankTransaction).amount > 0)
        .reduce((s, i) => s + (i.data as BankTransaction).amount, 0);
    const bankDebit = items.filter((i) => i.type === "transaction" && (i.data as BankTransaction).amount < 0)
        .reduce((s, i) => s + Math.abs((i.data as BankTransaction).amount), 0);
    const profit = totalIncome - totalExpenses;
    const invoiceCount = items.filter(i => i.type === "invoice").length;
    const transactionCount = items.filter(i => i.type === "transaction").length;

    const groupedByDate = items.reduce((acc, item) => {
        const date = format(parseISO(item.date), "yyyy-MM-dd");
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, TimelineItem[]>);

    if (loading) return <PageSkeleton variant="dashboard" />;

    const hasNoData = items.length === 0 && trendData.every(t => t.income === 0 && t.expenses === 0);
    if (hasNoData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Αρχική</h1>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{displayLabel}</p>
                </div>
                <EmptyState
                    icon={LayoutDashboard}
                    title="Καλωσήρθατε στο TravelDocs!"
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
        <div className="space-y-8">
            {/* ── Stripe-style Header ─────────────────────────────── */}
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight capitalize">
                    {displayLabel}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {format(now, "HH:mm")} · {invoiceCount} παραστατικά · {transactionCount} κινήσεις
                </p>
            </div>

            {/* Monthly Closing Banner */}
            {showBanner && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <ClipboardCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Ώρα για κλείσιμο {prevMonthLabel}!</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Ολοκληρώστε αντιστοιχίσεις και στείλτε στον λογιστή</p>
                        </div>
                        <Button size="sm" onClick={() => navigate("/monthly-closing")} className="rounded-xl gap-1 text-xs shrink-0">
                            Ξεκινήστε <ChevronRight className="h-3 w-3" />
                        </Button>
                        <button onClick={() => setDismissedBanner(true)} className="p-1.5 rounded-lg hover:bg-muted shrink-0">
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* ── Hero Metrics (Stripe-style) ─────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                <HeroMetric
                    label="Συνολικός Τζίρος"
                    value={totalIncome}
                    comparison={trendData.length >= 2 ? trendData[trendData.length - 2]?.income : undefined}
                />
                <HeroMetric
                    label="Συνολικά Έξοδα"
                    value={totalExpenses}
                    comparison={trendData.length >= 2 ? trendData[trendData.length - 2]?.expenses : undefined}
                    invertColor
                />
                <HeroMetric
                    label="Καθαρό Αποτέλεσμα"
                    value={profit}
                    showSign
                />
                <HeroMetric
                    label="Τράπεζα (Υπόλοιπο)"
                    value={bankCredit - bankDebit}
                    showSign
                />
            </div>

            {/* ── Full-width Area Chart ───────────────────────────── */}
            {trendData.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-muted-foreground">Τάση 6 μηνών</p>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-6 rounded-full bg-emerald-500" />
                                <span className="text-xs text-muted-foreground">Έσοδα</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-2 w-6 rounded-full bg-rose-500" />
                                <span className="text-xs text-muted-foreground">Έξοδα</span>
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} width={50}
                                tickFormatter={(v) => `€${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                            <Tooltip
                                formatter={(value: number, name: string) => [`€${value.toFixed(0)}`, name === "income" ? "Έσοδα" : "Έξοδα"]}
                                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: 12 }}
                            />
                            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#gradIncome)" name="income" />
                            <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#gradExpense)" name="expenses" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Balance Row (Stripe-style) ──────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <BalanceCard
                    label="Χωρίς Αντιστοίχιση"
                    value={unmatchedCount.toString()}
                    sub="τραπεζικές κινήσεις"
                    onClick={() => navigate("/bank-sync")}
                    alert={unmatchedCount > 0}
                />
                <BalanceCard
                    label="Χωρίς Προμηθευτή"
                    value={pendingExpenses.toString()}
                    sub="έξοδα χρειάζονται ενημέρωση"
                    onClick={() => navigate("/general-expenses")}
                    alert={pendingExpenses > 0}
                />
                <BalanceCard
                    label="Πιστώσεις"
                    value={`€${bankCredit.toLocaleString("el-GR", { minimumFractionDigits: 2 })}`}
                    sub="εισερχόμενα τράπεζας"
                    onClick={() => navigate("/bank-sync")}
                />
                <BalanceCard
                    label="Χρεώσεις"
                    value={`€${bankDebit.toLocaleString("el-GR", { minimumFractionDigits: 2 })}`}
                    sub="εξερχόμενα τράπεζας"
                    onClick={() => navigate("/bank-sync")}
                />
            </div>

            {/* ── Categories + Recurring side by side ─────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categoryData.length > 0 && (
                    <div className="rounded-2xl border border-border bg-card p-6">
                        <p className="text-sm font-medium text-muted-foreground mb-4">Κατηγορίες Εξόδων</p>
                        <div className="flex items-center gap-6">
                            <div className="w-36 h-36 shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                                            paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
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
                            </div>
                            <div className="flex-1 space-y-2">
                                {categoryData.map((cat) => (
                                    <div key={cat.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                            <span className="text-sm text-foreground truncate">{cat.name}</span>
                                        </div>
                                        <span className="text-sm font-medium tabular-nums text-muted-foreground">€{cat.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                <RecurringExpensesWidget startDate={startDate} endDate={endDate} />
            </div>

            {/* ── Timeline (clean, Stripe-style) ──────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Πρόσφατες Κινήσεις</p>
                    <span className="text-xs text-muted-foreground">{items.length} εγγραφές</span>
                </div>

                {Object.keys(groupedByDate).length === 0 ? (
                    <div className="p-16 text-center">
                        <Calendar className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Δεν υπάρχουν κινήσεις</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {Object.entries(groupedByDate).slice(0, 10).map(([date, dayItems], gi) => (
                            <div key={date}>
                                <div className="px-6 py-2 bg-muted/30 flex items-center justify-between">
                                    <p className="text-xs font-medium text-muted-foreground capitalize">
                                        {format(parseISO(date), "EEEE, d MMMM", { locale: el })}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground/60">{dayItems.length}</span>
                                </div>
                                <div className="divide-y divide-border/40">
                                    {dayItems.map((item) => {
                                        if (item.type === "invoice") {
                                            const inv = item.data as Invoice;
                                            const isIncome = inv.type === "income";
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                        isIncome ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                                                        <FileText className={cn("h-4 w-4", isIncome ? "text-emerald-600" : "text-rose-600")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{inv.merchant || "Άγνωστος"}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-xs text-muted-foreground">{inv.category}</span>
                                                            {item.packageName && <Badge variant="secondary" className="text-[10px] py-0 h-4">{item.packageName}</Badge>}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-semibold text-sm tabular-nums shrink-0",
                                                        isIncome ? "text-emerald-600" : "text-rose-600")}>
                                                        {isIncome ? "+" : "-"}€{(inv.amount || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        } else {
                                            const txn = item.data as BankTransaction;
                                            const isCredit = txn.amount > 0;
                                            return (
                                                <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <CreditCard className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{txn.description}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {(txn as any).bank_name && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <Building2 className="h-3 w-3" />{(txn as any).bank_name}
                                                                </span>
                                                            )}
                                                            {item.packageName && <Badge variant="secondary" className="text-[10px] py-0 h-4">{item.packageName}</Badge>}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-semibold text-sm tabular-nums shrink-0",
                                                        isCredit ? "text-emerald-600" : "text-foreground")}>
                                                        {isCredit ? "+" : ""}€{txn.amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function HeroMetric({ label, value, comparison, showSign, invertColor }: {
    label: string;
    value: number;
    comparison?: number;
    showSign?: boolean;
    invertColor?: boolean;
}) {
    const pctChange = comparison && comparison > 0 ? ((value - comparison) / comparison) * 100 : null;
    const isUp = pctChange !== null && pctChange >= 0;

    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums tracking-tight">
                {showSign && value >= 0 ? "+" : ""}€{Math.abs(value).toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {pctChange !== null && (
                <div className={cn("flex items-center gap-1 text-xs",
                    (invertColor ? !isUp : isUp) ? "text-emerald-600" : "text-rose-600")}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{Math.abs(pctChange).toFixed(1)}% vs προηγ. μήνα</span>
                </div>
            )}
        </div>
    );
}

function BalanceCard({ label, value, sub, onClick, alert }: {
    label: string; value: string; sub: string; onClick: () => void; alert?: boolean;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-sm group",
                alert ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50" : "border-border bg-card hover:border-border"
            )}
        >
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </div>
            <p className={cn("text-2xl font-bold mt-2 tabular-nums", alert ? "text-amber-600" : "text-foreground")}>{value}</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
        </div>
    );
}
