import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Target } from "lucide-react";
import { useMonth } from "@/contexts/MonthContext";

const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

export default function Analytics() {
    const { startDate, endDate, displayLabel } = useMonth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>({
        summary: { income: 0, expenses: 0, profit: 0, margin: 0 },
        monthlyTrends: [],
        categoryBreakdown: [],
    });

    useEffect(() => {
        fetchAnalytics();
    }, [startDate, endDate]);

    async function fetchAnalytics() {
        try {
            // Fetch invoices for selected period
            const { data: invoices } = await supabase
                .from("invoices")
                .select("*")
                .gte("invoice_date", startDate)
                .lte("invoice_date", endDate);

            if (!invoices) return;

            // Calculate totals
            const income = invoices
                .filter((i: any) => i.type === "income")
                .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

            const expenses = invoices
                .filter((i: any) => i.type === "expense")
                .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

            const profit = income - expenses;
            const margin = income > 0 ? (profit / income) * 100 : 0;

            // Category breakdown
            const categories: any = {};
            invoices.forEach((inv: any) => {
                const cat = inv.category || "other";
                if (!categories[cat]) {
                    categories[cat] = { name: cat, income: 0, expenses: 0 };
                }
                if (inv.type === "income") {
                    categories[cat].income += inv.amount || 0;
                } else {
                    categories[cat].expenses += inv.amount || 0;
                }
            });

            const categoryBreakdown = Object.values(categories);

            // Monthly trends (group by day if range is small, or month if large)
            const monthlyData: any = {};
            invoices.forEach((inv: any) => {
                // Group by month for simplicity, or change to day if needed
                const month = inv.invoice_date?.substring(0, 7) || "Unknown";
                if (!monthlyData[month]) {
                    monthlyData[month] = { month, income: 0, expenses: 0 };
                }
                if (inv.type === "income") {
                    monthlyData[month].income += inv.amount || 0;
                } else {
                    monthlyData[month].expenses += inv.amount || 0;
                }
            });

            const monthlyTrends = Object.values(monthlyData)
                .filter((m: any) => m.month !== "Unknown")
                .sort((a: any, b: any) => a.month.localeCompare(b.month));

            setData({
                summary: { income, expenses, profit, margin },
                monthlyTrends,
                categoryBreakdown,
            });
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="h-7 w-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Αναλύσεις</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Οικονομική ανάλυση για <span className="font-medium capitalize">{displayLabel}</span>
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-emerald-500 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">Συνολικά Έσοδα</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-0.5 tabular-nums">€{data.summary.income.toFixed(2)}</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>
                </Card>

                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-rose-500 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">Συνολικά Έξοδα</p>
                            <p className="text-2xl font-bold text-rose-600 mt-0.5 tabular-nums">€{data.summary.expenses.toFixed(2)}</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center">
                            <TrendingDown className="h-4 w-4 text-rose-600" />
                        </div>
                    </div>
                </Card>

                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-blue-500 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">Καθαρό Κέρδος</p>
                            <p className={`text-2xl font-bold mt-0.5 tabular-nums ${data.summary.profit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>€{data.summary.profit.toFixed(2)}</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Wallet className="h-4 w-4 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="rounded-xl border-slate-200 bg-white border-l-4 border-l-purple-500 overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-500">Περιθώριο</p>
                            <p className="text-2xl font-bold text-purple-600 mt-0.5 tabular-nums">{data.summary.margin.toFixed(1)}%</p>
                        </div>
                        <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Target className="h-4 w-4 text-purple-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trends" className="space-y-4">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-10">
                    <TabsTrigger value="trends" className="rounded-lg text-sm">Μηνιαίες Τάσεις</TabsTrigger>
                    <TabsTrigger value="categories" className="rounded-lg text-sm">Ανά Κατηγορία</TabsTrigger>
                    <TabsTrigger value="comparison" className="rounded-lg text-sm">Σύγκριση Πίτας</TabsTrigger>
                </TabsList>

                <TabsContent value="trends">
                    <Card className="p-6 rounded-2xl border-slate-200 bg-white">
                        <h3 className="text-sm font-semibold text-slate-700 mb-5">Έσοδα vs Έξοδα (Μηνιαία)</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={data.monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Έσοδα" />
                                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Έξοδα" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                <TabsContent value="categories">
                    <Card className="p-6 rounded-2xl border-slate-200 bg-white">
                        <h3 className="text-sm font-semibold text-slate-700 mb-5">Κατανομή ανά Κατηγορία</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={data.categoryBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="income" fill="#10b981" name="Έσοδα" />
                                <Bar dataKey="expenses" fill="#ef4444" name="Έξοδα" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                <TabsContent value="comparison">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="p-6 rounded-2xl border-slate-200 bg-white">
                            <h3 className="text-sm font-semibold text-slate-700 mb-5">Κατανομή Εσόδων</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.categoryBreakdown.filter((c: any) => c.income > 0)}
                                        dataKey="income"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {data.categoryBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-6 rounded-2xl border-slate-200 bg-white">
                            <h3 className="text-sm font-semibold text-slate-700 mb-5">Κατανομή Εξόδων</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={data.categoryBreakdown.filter((c: any) => c.expenses > 0)}
                                        dataKey="expenses"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label
                                    >
                                        {data.categoryBreakdown.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
