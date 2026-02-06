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
                <p className="text-muted-foreground">Φόρτωση αναλύσεων...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Αναλύσεις</h1>
                    <p className="mt-1 text-muted-foreground">
                        Οικονομική ανάλυση για <span className="font-medium capitalize">{displayLabel}</span>
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6 rounded-3xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Συνολικά Έσοδα</p>
                            <p className="text-3xl font-bold text-green-900 dark:text-green-100">€{data.summary.income.toFixed(2)}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">Συνολικά Έξοδα</p>
                            <p className="text-3xl font-bold text-red-900 dark:text-red-100">€{data.summary.expenses.toFixed(2)}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                            <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Καθαρό Κέρδος</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">€{data.summary.profit.toFixed(2)}</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Περιθώριο</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{data.summary.margin.toFixed(1)}%</p>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                            <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trends" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="trends" className="rounded-xl">Μηνιαίες Τάσεις</TabsTrigger>
                    <TabsTrigger value="categories" className="rounded-xl">Ανάλυση Κατηγοριών</TabsTrigger>
                    <TabsTrigger value="comparison" className="rounded-xl">Σύγκριση</TabsTrigger>
                </TabsList>

                <TabsContent value="trends">
                    <Card className="p-6 rounded-3xl">
                        <h3 className="text-lg font-semibold mb-6">Έσοδα vs Έξοδα (Μηνιαία)</h3>
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
                    <Card className="p-6 rounded-3xl">
                        <h3 className="text-lg font-semibold mb-6">Κατανομή ανά Κατηγορία</h3>
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
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="p-6 rounded-3xl">
                            <h3 className="text-lg font-semibold mb-6">Κατανομή Εσόδων</h3>
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

                        <Card className="p-6 rounded-3xl">
                            <h3 className="text-lg font-semibold mb-6">Κατανομή Εξόδων</h3>
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
