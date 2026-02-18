import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
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
    Sparkles,
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
import { getFinancialSummary } from "@/lib/tax-analytics";
import { calculateTaxLiability, TaxLiability } from "@/lib/tax-engine";
import { askAccountant } from "@/lib/ai-advisor";
import { cn } from "@/lib/utils";

export default function BusinessIntelligence() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("suppliers");
    const [suppliers, setSuppliers] = useState<SupplierAnalytics[]>([]);
    const [customers, setCustomers] = useState<CustomerScore[]>([]);
    const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
    const [taxLiability, setTaxLiability] = useState<TaxLiability | null>(null);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [chatLog, setChatLog] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: 'Γεια σας! Είμαι ο ψηφιακός σας λογιστής. Μπορώ να απαντήσω σε ερωτήσεις για τη φορολογία σας, τον ΦΠΑ ή να προτείνω τρόπους βελτιστοποίησης.' }
    ]);

    const handleAskAI = async () => {
        if (!aiPrompt.trim() || !taxLiability) return;

        const userMessage = aiPrompt;
        setAiPrompt("");
        setChatLog(prev => [...prev, { role: 'user', content: userMessage }]);
        setAiLoading(true);

        try {
            const response = await askAccountant(userMessage, taxLiability);
            setChatLog(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Σφάλμα κατά την επικοινωνία με τον AI Accountant");
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [suppliersData, customersData, forecastData, taxSummary] = await Promise.all([
                getSupplierAnalytics(),
                getCustomerScores(),
                getCashFlowForecast(3),
                getFinancialSummary(new Date().getFullYear())
            ]);
            setSuppliers(suppliersData);
            setCustomers(customersData);
            setForecast(forecastData);
            setTaxLiability(calculateTaxLiability(taxSummary, { year: new Date().getFullYear(), entityType: 'company' }));
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
                    <TabsTrigger value="tax" className="rounded-lg gap-2">
                        <DollarSign className="h-4 w-4" />
                        Φορολογία & AI
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

                {/* Tax & AI Planning */}
                <TabsContent value="tax" className="mt-6 space-y-6">
                    {taxLiability && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="p-5 rounded-2xl bg-white border-blue-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <DollarSign className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Εκτιμώμενος ΦΠΑ</p>
                                            <p className={cn("text-2xl font-bold", taxLiability.vatPayable > 0 ? "text-rose-600" : "text-emerald-600")}>
                                                {taxLiability.vatPayable > 0 ? '-' : '+'}€{Math.abs(taxLiability.vatPayable).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="p-5 rounded-2xl bg-white border-indigo-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                                            <Target className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Φόρος Εισοδήματος</p>
                                            <p className="text-2xl font-bold text-rose-600">€{taxLiability.incomeTax.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="p-5 rounded-2xl bg-white border-amber-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                            <Clock className="h-6 w-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Προκαταβολή Επ. Έτους</p>
                                            <p className="text-2xl font-bold text-amber-600">€{taxLiability.advanceTax.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                                            <Target className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-white/70">Σύνολο Υποχρεώσεων</p>
                                            <p className="text-2xl font-bold">€{taxLiability.totalLiability.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2 p-6 rounded-3xl bg-slate-50 border-dashed border-2 flex flex-col max-h-[500px]">
                                    <div className="flex items-center gap-3 mb-6 shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="font-bold text-xl text-slate-900">AI Accountant Advisor</h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-2 custom-scrollbar">
                                        {chatLog.map((msg, idx) => (
                                            <div key={idx} className={cn(
                                                "flex gap-3 max-w-[90%]",
                                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                            )}>
                                                <div className={cn(
                                                    "p-3 rounded-2xl text-sm leading-relaxed",
                                                    msg.role === 'user'
                                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                                        : "bg-white border text-slate-700 rounded-bl-sm shadow-sm"
                                                )}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {aiLoading && (
                                            <div className="flex gap-3">
                                                <div className="bg-white border p-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                                    <span className="text-xs text-muted-foreground">Ο λογιστής πληκτρολογεί...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 shrink-0">
                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                                            placeholder="Ρωτήστε τον AI Accountant (π.χ. 'Πόσο ΦΠΑ χρωστάω;', 'Πώς να μειώσω τον φόρο;')"
                                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <Button
                                            onClick={handleAskAI}
                                            disabled={aiLoading || !aiPrompt.trim()}
                                            className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Ανάλυση
                                        </Button>
                                    </div>
                                </Card>

                                <Card className="p-6 rounded-3xl">
                                    <h3 className="font-bold mb-4">Ανάλυση Κερδοφορίας</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Καθαρά Κέρδη (Προ Φόρων)</span>
                                            <span className="font-semibold">€{taxLiability.netProfit.toLocaleString()}</span>
                                        </div>
                                        <Progress value={80} className="h-2" />

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Φόροι & Τέλη</span>
                                            <span className="font-semibold text-rose-600">-€{taxLiability.totalLiability.toLocaleString()}</span>
                                        </div>
                                        <Progress value={20} className="h-2 bg-rose-100" /> {/* Should be colored differently? Shadcn Progress color is usually primary */}

                                        <div className="pt-4 border-t mt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-900">Καθαρά (Μετά Φόρων)</span>
                                                <span className="font-bold text-xl text-emerald-600">€{taxLiability.netProfitAfterTax.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
