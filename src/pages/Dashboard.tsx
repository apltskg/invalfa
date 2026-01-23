import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Invoice, BankTransaction } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, DollarSign, Calendar as CalendarIcon, Filter, AlertTriangle, MessageSquare, CalendarDays } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineItem {
    id: string;
    date: string;
    type: 'invoice' | 'transaction';
    data: Invoice | BankTransaction;
    packageName?: string;
}

export default function Dashboard() {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date());

    useEffect(() => {
        fetchData();
        fetchNotifications();
    }, [selectedMonth]);

    async function fetchNotifications() {
        try {
            const { data } = await (supabase.from('notifications' as any) as any)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            if (data) setNotifications(data);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }

    async function fetchData() {
        try {
            const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

            const [{ data: invoices }, { data: transactions }, { data: packages }] = await Promise.all([
                supabase.from("invoices").select("*").gte("invoice_date", start).lte("invoice_date", end).order("invoice_date", { ascending: false }),
                supabase.from("bank_transactions").select("*").gte("transaction_date", start).lte("transaction_date", end).order("transaction_date", { ascending: false }),
                supabase.from("packages").select("*")
            ]);

            const packageMap = new Map((packages || []).map(p => [p.id, p.client_name]));

            const timeline: TimelineItem[] = [
                ...((invoices as Invoice[]) || []).map(inv => ({
                    id: inv.id,
                    date: inv.invoice_date || inv.created_at,
                    type: 'invoice' as const,
                    data: inv,
                    packageName: inv.package_id ? packageMap.get(inv.package_id) : undefined
                })),
                ...((transactions as BankTransaction[]) || []).map(txn => ({
                    id: txn.id,
                    date: txn.transaction_date,
                    type: 'transaction' as const,
                    data: txn,
                    packageName: txn.package_id ? packageMap.get(txn.package_id) : undefined
                }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setItems(timeline);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }

    const groupedByDate = items.reduce((acc, item) => {
        const date = format(parseISO(item.date), 'yyyy-MM-dd');
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, TimelineItem[]>);

    const totalIncome = items.filter(i => i.type === 'invoice' && (i.data as Invoice).type === 'income').reduce((sum, i) => sum + ((i.data as Invoice).amount || 0), 0);
    const totalExpenses = items.filter(i => i.type === 'invoice' && (i.data as Invoice).type === 'expense').reduce((sum, i) => sum + ((i.data as Invoice).amount || 0), 0);
    const bankFlow = items.filter(i => i.type === 'transaction').reduce((sum, i) => sum + (i.data as BankTransaction).amount, 0);

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">Overview of all transactions by date</p>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10 gap-2 rounded-xl bg-background hover:bg-muted/50 border-input font-medium min-w-[180px] justify-start text-left font-normal">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            {format(selectedMonth, "MMMM yyyy")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl" align="end">
                        <Calendar
                            mode="single"
                            selected={selectedMonth}
                            onSelect={(date) => date && setSelectedMonth(date)}
                            initialFocus
                            className="p-3"
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 rounded-3xl bg-gradient-to-br from-green-50 to-green-100/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-green-100 rounded-2xl flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600 font-medium">Total Income</p>
                            <p className="text-2xl font-bold text-green-700">€{totalIncome.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-gradient-to-br from-red-50 to-red-100/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-700">€{totalExpenses.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100/50">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Bank Flow</p>
                            <p className="text-2xl font-bold text-blue-700">€{bankFlow.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {notifications.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Filter className="h-5 w-5 text-primary" />
                        Πρόσφατες Ειδοποιήσεις
                    </h2>
                    <div className="grid gap-3">
                        {notifications.map((n) => (
                            <Card key={n.id} className={cn(
                                "p-4 rounded-2xl border-l-4 shadow-sm",
                                n.type === 'warning' ? "border-l-red-500 bg-red-50/30" : "border-l-blue-500 bg-blue-50/30"
                            )}>
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-3">
                                        {n.type === 'warning' ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <MessageSquare className="h-5 w-5 text-blue-500" />}
                                        <div>
                                            <p className="font-bold text-sm">{n.title}</p>
                                            <p className="text-sm text-muted-foreground">{n.message}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px]">{format(new Date(n.created_at), 'dd/MM HH:mm')}</Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <Card className="rounded-3xl overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">Loading...</div>
                ) : Object.keys(groupedByDate).length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">No transactions this month</div>
                ) : (
                    <div className="divide-y relative">
                        {Object.entries(groupedByDate).map(([date, dayItems], index) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.3 }}
                                className="p-6"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <CalendarIcon className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold">{format(parseISO(date), 'EEEE, dd MMMM yyyy')}</h3>
                                    <Badge variant="outline">{dayItems.length} items</Badge>
                                </div>
                                <div className="space-y-2 ml-4 border-l-2 border-border pl-4">
                                    {dayItems.map(item => {
                                        if (item.type === 'invoice') {
                                            const inv = item.data as Invoice;
                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className={cn("h-4 w-4", inv.type === 'income' ? 'text-green-600' : 'text-red-600')} />
                                                        <div>
                                                            <p className="font-medium text-sm">{inv.merchant || 'Unknown'}</p>
                                                            <div className="flex gap-2 items-center">
                                                                <Badge variant="secondary" className="text-xs">{inv.category}</Badge>
                                                                {item.packageName && <Badge variant="outline" className="text-xs">{item.packageName}</Badge>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-bold", inv.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                                                        {inv.type === 'income' ? '+' : '-'}€{(inv.amount || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            );
                                        } else {
                                            const txn = item.data as BankTransaction;
                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-3 bg-blue-50/30 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <CreditCard className="h-4 w-4 text-blue-600" />
                                                        <div>
                                                            <p className="font-medium text-sm">{txn.description}</p>
                                                            {item.packageName && <Badge variant="outline" className="text-xs">{item.packageName}</Badge>}
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-bold", txn.amount > 0 ? 'text-green-600' : 'text-foreground')}>
                                                        {txn.amount > 0 ? '+' : ''}€{txn.amount.toFixed(2)}
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
            </Card>
        </div>
    );
}
