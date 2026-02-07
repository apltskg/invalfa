import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
    Truck,
    Users,
    TrendingUp,
    TrendingDown,
    Minus,
    Star,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    BarChart3,
    Calendar,
    DollarSign,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Target,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { el } from "date-fns/locale";
import {
    getSupplierAnalytics,
    getCustomerScores,
    getCashFlowForecast,
    SupplierAnalytics,
    CustomerScore,
    CashFlowForecast
} from "@/lib/dashboard-analytics";
import { cn } from "@/lib/utils";

export default function BusinessIntelligence() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("suppliers");
    const [suppliers, setSuppliers] = useState<SupplierAnalytics[]>([]);
    const [customers, setCustomers] = useState<CustomerScore[]>([]);
    const [forecast, setForecast] = useState<CashFlowForecast[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [suppliersData, customersData, forecastData] = await Promise.all([
                getSupplierAnalytics(),
                getCustomerScores(),
                getCashFlowForecast(3),
            ]);
            setSuppliers(suppliersData);
            setCustomers(customersData);
            setForecast(forecastData);
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    const getGradeBadge = (grade: CustomerScore['grade']) => {
        const colors = {
            A: "bg-emerald-100 text-emerald-700 border-emerald-200",
            B: "bg-blue-100 text-blue-700 border-blue-200",
            C: "bg-amber-100 text-amber-700 border-amber-200",
            D: "bg-orange-100 text-orange-700 border-orange-200",
            F: "bg-red-100 text-red-700 border-red-200",
        };
        return (
            <Badge variant="outline" className={cn("text-lg font-bold px-3 py-1 rounded-xl", colors[grade])}>
                {grade}
            </Badge>
        );
    };

    const getRiskBadge = (risk: CustomerScore['risk_level']) => {
        switch (risk) {
            case 'low':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-lg">Χαμηλό</Badge>;
            case 'medium':
                return <Badge className="bg-amber-500 hover:bg-amber-600 rounded-lg">Μέτριο</Badge>;
            case 'high':
                return <Badge variant="destructive" className="rounded-lg">Υψηλό</Badge>;
        }
    };

    const getTrendIcon = (trend: SupplierAnalytics['trend']) => {
        switch (trend) {
            case 'up':
                return <TrendingUp className="h-4 w-4 text-rose-500" />;
            case 'down':
                return <TrendingDown className="h-4 w-4 text-emerald-500" />;
            default:
                return <Minus className="h-4 w-4 text-muted-foreground" />;
        }
    };

    // Stats summaries
    const supplierStats = {
        total: suppliers.length,
        totalSpent: suppliers.reduce((sum, s) => sum + s.total_spent, 0),
        avgPaymentDays: Math.round(
            suppliers.reduce((sum, s) => sum + s.avg_payment_days, 0) / Math.max(suppliers.length, 1)
        ),
    };

    const customerStats = {
        total: customers.length,
        totalInvoiced: customers.reduce((sum, c) => sum + c.total_invoiced, 0),
        totalPending: customers.reduce((sum, c) => sum + c.pending_amount, 0),
        avgScore: Math.round(
            customers.reduce((sum, c) => sum + c.score, 0) / Math.max(customers.length, 1)
        ),
        highRisk: customers.filter(c => c.risk_level === 'high').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Business Intelligence</h1>
                <p className="text-muted-foreground mt-1">
                    Αναλυτικά στοιχεία προμηθευτών, πελατών και προβλέψεις
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="rounded-xl">
                    <TabsTrigger value="suppliers" className="rounded-lg gap-2">
                        <Truck className="h-4 w-4" />
                        Προμηθευτές
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="rounded-lg gap-2">
                        <Users className="h-4 w-4" />
                        Πελάτες
                    </TabsTrigger>
                    <TabsTrigger value="forecast" className="rounded-lg gap-2">
                        <Target className="h-4 w-4" />
                        Προβλέψεις
                    </TabsTrigger>
                </TabsList>

                {/* Supplier Analytics */}
                <TabsContent value="suppliers" className="mt-6 space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                    <Truck className="h-6 w-6 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Προμηθευτές</p>
                                    <p className="text-2xl font-bold">{supplierStats.total}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Συνολικές Δαπάνες</p>
                                    <p className="text-2xl font-bold">€{supplierStats.totalSpent.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Μ.Ο. Πληρωμής</p>
                                    <p className="text-2xl font-bold">{supplierStats.avgPaymentDays} ημ.</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Supplier List */}
                    <Card className="rounded-2xl overflow-hidden">
                        <div className="p-4 border-b bg-muted/30">
                            <h3 className="font-semibold">Ανάλυση ανά Προμηθευτή</h3>
                        </div>
                        <div className="divide-y">
                            {suppliers.slice(0, 10).map((supplier, index) => (
                                <div key={supplier.id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium">{supplier.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {supplier.invoice_count} τιμολόγια • Τελευταίο: {
                                                        supplier.last_invoice_date
                                                            ? format(new Date(supplier.last_invoice_date), 'dd MMM yyyy', { locale: el })
                                                            : '-'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-bold">€{supplier.total_spent.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">Σύνολο δαπανών</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{supplier.avg_payment_days} ημ.</p>
                                                <p className="text-xs text-muted-foreground">Μ.Ο. πληρωμής</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {getTrendIcon(supplier.trend)}
                                                <span className="text-xs text-muted-foreground">
                                                    {supplier.trend === 'up' ? 'Αύξηση' : supplier.trend === 'down' ? 'Μείωση' : 'Σταθερά'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini chart */}
                                    <div className="mt-3 flex items-end gap-1 h-8">
                                        {supplier.monthly_spending.map((month, i) => {
                                            const maxAmount = Math.max(...supplier.monthly_spending.map(m => m.amount));
                                            const height = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
                                            return (
                                                <div
                                                    key={month.month}
                                                    className="flex-1 bg-violet-200 rounded-t transition-all hover:bg-violet-300"
                                                    style={{ height: `${Math.max(height, 5)}%` }}
                                                    title={`${month.month}: €${month.amount.toFixed(2)}`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </TabsContent>

                {/* Customer Scoring */}
                <TabsContent value="customers" className="mt-6 space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Πελάτες</p>
                                    <p className="text-2xl font-bold">{customerStats.total}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <DollarSign className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Τιμολογημένα</p>
                                    <p className="text-2xl font-bold">€{customerStats.totalInvoiced.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Εκκρεμή</p>
                                    <p className="text-2xl font-bold">€{customerStats.totalPending.toLocaleString()}</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-5 rounded-2xl border-l-4 border-l-rose-500">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                    <AlertTriangle className="h-6 w-6 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Υψηλό Ρίσκο</p>
                                    <p className="text-2xl font-bold text-rose-600">{customerStats.highRisk}</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Customer List */}
                    <Card className="rounded-2xl overflow-hidden">
                        <div className="p-4 border-b bg-muted/30">
                            <h3 className="font-semibold">Αξιολόγηση Πελατών</h3>
                        </div>
                        <div className="divide-y">
                            {customers.map((customer) => (
                                <div key={customer.id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {getGradeBadge(customer.grade)}
                                            <div>
                                                <p className="font-medium">{customer.name}</p>
                                                {customer.vat_number && (
                                                    <p className="text-sm text-muted-foreground">ΑΦΜ: {customer.vat_number}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-bold">€{customer.total_invoiced.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">Τιμολογημένα</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-medium",
                                                    customer.pending_amount > 0 ? "text-amber-600" : "text-emerald-600"
                                                )}>
                                                    €{customer.pending_amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Εκκρεμή</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium">{customer.avg_payment_days} ημ.</p>
                                                <p className="text-xs text-muted-foreground">Μ.Ο. πληρωμής</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-medium",
                                                    customer.on_time_percentage >= 80 ? "text-emerald-600" :
                                                        customer.on_time_percentage >= 50 ? "text-amber-600" : "text-rose-600"
                                                )}>
                                                    {customer.on_time_percentage}%
                                                </p>
                                                <p className="text-xs text-muted-foreground">Εγκαίρως</p>
                                            </div>
                                            {getRiskBadge(customer.risk_level)}
                                        </div>
                                    </div>

                                    {/* Score bar */}
                                    <div className="mt-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground w-16">Σκορ: {customer.score}</span>
                                            <Progress
                                                value={customer.score}
                                                className="h-2 flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </TabsContent>

                {/* Cash Flow Forecast */}
                <TabsContent value="forecast" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {forecast.map((month) => (
                            <Card key={month.month} className="p-6 rounded-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">
                                        {format(new Date(month.month + '-01'), 'MMMM yyyy', { locale: el })}
                                    </h3>
                                    <Badge variant="outline" className="rounded-lg">
                                        {month.confidence}% εμπιστ.
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                            <span className="text-muted-foreground">Αναμ. Έσοδα</span>
                                        </div>
                                        <span className="font-bold text-emerald-600">
                                            €{month.predicted_income.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ArrowDownRight className="h-4 w-4 text-rose-500" />
                                            <span className="text-muted-foreground">Αναμ. Έξοδα</span>
                                        </div>
                                        <span className="font-bold text-rose-600">
                                            €{month.predicted_expenses.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Καθαρή Ροή</span>
                                            <span className={cn(
                                                "font-bold text-lg",
                                                month.net_flow >= 0 ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {month.net_flow >= 0 ? '+' : ''}€{month.net_flow.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Card className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Σχετικά με τις Προβλέψεις</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Οι προβλέψεις βασίζονται σε ιστορικά δεδομένα των τελευταίων 6 μηνών.
                                    Η ακρίβεια μειώνεται όσο πιο μακριά είναι η πρόβλεψη.
                                    Χρησιμοποιήστε τα παραπάνω στοιχεία ως ενδεικτικές εκτιμήσεις για τον προγραμματισμό σας.
                                </p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
