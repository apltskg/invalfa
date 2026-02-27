import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useMonth } from "@/contexts/MonthContext";

const CATEGORY_COLORS: Record<string, string> = {
    hotel: "#3b82f6", airline: "#6366f1", tolls: "#f59e0b",
    fuel: "#ef4444", payroll: "#ec4899", government: "#64748b",
    transport: "#8b5cf6", rent: "#14b8a6", telecom: "#06b6d4",
    insurance: "#10b981", office: "#f97316", other: "#94a3b8",
};

const CATEGORY_LABELS: Record<string, string> = {
    hotel: "Ξενοδοχεία", airline: "Αεροπορικά", tolls: "Διόδια",
    fuel: "Καύσιμα", payroll: "Μισθοδοσία", government: "Δημόσιο",
    transport: "Μεταφορές", rent: "Ενοίκια", telecom: "Τηλεπικοινωνίες",
    insurance: "Ασφάλεια", office: "Γραφική Ύλη", other: "Λοιπά",
};

export default function Analytics() {
    const { startDate, endDate, displayLabel } = useMonth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        summary: { income: 0, expenses: 0, profit: 0, margin: 0 },
        monthlyTrends: [],
        categoryBreakdown: [],
        topExpenseCategories: [],
    });

    useEffect(() => { fetchAnalytics(); }, [startDate, endDate]);

    async function fetchAnalytics() {
        try {
            const { data: invoices } = await supabase
                .from("invoices")
                .select("*")
                .gte("invoice_date", startDate)
                .lte("invoice_date", endDate);

            if (!invoices) return;

            const income = invoices.filter((i: any) => i.type === "income").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
            const expenses = invoices.filter((i: any) => i.type === "expense").reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
            const profit = income - expenses;
            const margin = income > 0 ? (profit / income) * 100 : 0;

            // Monthly trends
            const monthlyData: any = {};
            invoices.forEach((inv: any) => {
                const month = inv.invoice_date?.substring(0, 7) || "Unknown";
                if (!monthlyData[month]) monthlyData[month] = { month, income: 0, expenses: 0, profit: 0 };
                if (inv.type === "income") monthlyData[month].income += inv.amount || 0;
                else monthlyData[month].expenses += inv.amount || 0;
            });
            Object.values(monthlyData).forEach((m: any) => { m.profit = m.income - m.expenses; });

            const monthlyTrends = Object.values(monthlyData)
                .filter((m: any) => m.month !== "Unknown")
                .sort((a: any, b: any) => a.month.localeCompare(b.month));

            // Category breakdown (expenses only)
            const cats: any = {};
            invoices.filter((i: any) => i.type === "expense").forEach((inv: any) => {
                const cat = inv.category || "other";
                if (!cats[cat]) cats[cat] = { name: CATEGORY_LABELS[cat] || cat, value: 0, fill: CATEGORY_COLORS[cat] || "#94a3b8", key: cat };
                cats[cat].value += inv.amount || 0;
            });
            const topExpenseCategories = Object.values(cats).sort((a: any, b: any) => b.value - a.value);

            setData({ summary: { income, expenses, profit, margin }, monthlyTrends, topExpenseCategories });
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="h-8 w-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    const { summary } = data;
    const changeIcon = summary.profit >= 0
        ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
        : <ArrowDownRight className="h-4 w-4 text-red-500" />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Αναλύσεις</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Οικονομική ανάλυση — <span className="font-medium capitalize">{displayLabel}</span>
                </p>
            </div>

            {/* Summary Cards - Clean layout */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-5 rounded-2xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Έσοδα</p>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">€{summary.income.toFixed(2)}</p>
                </Card>

                <Card className="p-5 rounded-2xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Έξοδα</p>
                        <TrendingDown className="h-4 w-4 text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">€{summary.expenses.toFixed(2)}</p>
                </Card>

                <Card className="p-5 rounded-2xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Κέρδος</p>
                        {changeIcon}
                    </div>
                    <p className={`text-2xl font-bold tabular-nums ${summary.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        €{summary.profit.toFixed(2)}
                    </p>
                </Card>

                <Card className="p-5 rounded-2xl bg-white border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Περιθώριο</p>
                        <Target className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">{summary.margin.toFixed(1)}%</p>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Trends Chart — takes 2/3 */}
                <Card className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-600 mb-4">Έσοδα vs Έξοδα</h3>
                    {data.monthlyTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={data.monthlyTrends}>
                                <defs>
                                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                    formatter={(value: number) => [`€${value.toFixed(2)}`, ""]}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" name="Έσοδα" />
                                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" name="Έξοδα" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                            Δεν υπάρχουν δεδομένα
                        </div>
                    )}
                </Card>

                {/* Expense Categories — takes 1/3 */}
                <Card className="p-6 rounded-2xl bg-white border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-600 mb-4">Κατηγορίες Εξόδων</h3>
                    {data.topExpenseCategories.length > 0 ? (
                        <div className="space-y-3">
                            {data.topExpenseCategories.slice(0, 8).map((cat: any) => {
                                const maxVal = data.topExpenseCategories[0]?.value || 1;
                                const pct = (cat.value / maxVal) * 100;
                                return (
                                    <div key={cat.key}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-slate-600">{cat.name}</span>
                                            <span className="font-semibold tabular-nums text-slate-800">€{cat.value.toFixed(0)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: cat.fill }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-40 text-sm text-slate-400">
                            Δεν υπάρχουν δεδομένα
                        </div>
                    )}
                </Card>
            </div>

            {/* Profit Chart */}
            {data.monthlyTrends.length > 1 && (
                <Card className="p-6 rounded-2xl bg-white border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-600 mb-4">Κέρδος ανά Μήνα</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data.monthlyTrends}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                            <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                            <Tooltip
                                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                                formatter={(value: number) => [`€${value.toFixed(2)}`, "Κέρδος"]}
                            />
                            <Bar dataKey="profit" radius={[6, 6, 0, 0]} name="Κέρδος">
                                {data.monthlyTrends.map((entry: any, index: number) => (
                                    <Cell key={index} fill={entry.profit >= 0 ? "#10b981" : "#ef4444"} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}
        </div>
    );
}
