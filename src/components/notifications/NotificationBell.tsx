import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, CheckCircle2, Info, Calendar, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SystemAlert {
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    date: Date;
    isSystem: true;
    is_read?: never;
    created_at?: never;
    link_url?: never;
}

interface DBNotification {
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    message: string;
    link_url?: string;
    created_at: string;
    is_read: boolean;
    isSystem?: false;
}

type NotificationItem = SystemAlert | DBNotification;

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
    const [dbNotifications, setDbNotifications] = useState<DBNotification[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkSystemAlerts();
        fetchDbNotifications();

        // Real-time subscription for new notifications
        const channel = supabase
            .channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newNotif = payload.new as any;
                    setDbNotifications(prev => [newNotif, ...prev]);
                    toast.info(newNotif.title, { description: newNotif.message });
                }
            )
            .subscribe();

        // Poll system alerts occasionally
        const interval = setInterval(checkSystemAlerts, 5 * 60 * 1000); // 5 mins

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    async function fetchDbNotifications() {
        setLoading(true);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Error fetching notifications:", error);
        } else {
            setDbNotifications((data as any[]) || []);
        }
        setLoading(false);
    }

    async function checkSystemAlerts() {
        const newAlerts: SystemAlert[] = [];
        const today = new Date();

        // 1. Bank Sync Reminder (1st of month)
        if (today.getDate() === 1) {
            newAlerts.push({
                id: "bank-sync-reminder",
                type: "warning",
                title: "Υπενθύμιση Συγχρονισμού",
                message: "Ανεβάστε το αντίγραφο τράπεζας του προηγούμενου μήνα.",
                action: { label: "Μετάβαση", onClick: () => (window.location.href = "/bank-sync") },
                date: today,
                isSystem: true
            });
        }

        try {
            // 2. Unmatched Transactions check
            const { count } = await supabase
                .from("bank_transactions")
                .select("*", { count: 'exact', head: true })
                .is("matched", false);

            if (count && count > 0) {
                newAlerts.push({
                    id: "unmatched-txns",
                    type: "warning",
                    title: "Αταίριαστες Συναλλαγές",
                    message: `${count} συναλλαγές εκκρεμούν προς ταίριασμα.`,
                    action: { label: "Τακτοποίηση", onClick: () => (window.location.href = "/bank-sync") },
                    date: today,
                    isSystem: true
                });
            }

            // 3. Incomplete Invoices check
            const { count: incompleteCount } = await supabase
                .from("invoices")
                .select("*", { count: 'exact', head: true })
                .or("amount.is.null,invoice_date.is.null");

            if (incompleteCount && incompleteCount > 0) {
                newAlerts.push({
                    id: "incomplete-invs",
                    type: "info",
                    title: "Ελλιπή Παραστατικά",
                    message: `${incompleteCount} παραστατικά χρειάζονται στοιχεία.`,
                    action: { label: "Διόρθωση", onClick: () => (window.location.href = "/packages") },
                    date: today,
                    isSystem: true
                });
            }

            // 4. Overdue Income Invoices check (unpaid for 30+ days)
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: overdueInvoices } = await supabase
                .from("invoices")
                .select("id")
                .eq("type", "income")
                .lte("invoice_date", thirtyDaysAgo.toISOString().split('T')[0]);

            // Check which are unpaid (not matched)
            if (overdueInvoices && overdueInvoices.length > 0) {
                const overdueIds = overdueInvoices.map(i => i.id);
                const { data: matchedInvoices } = await supabase
                    .from("invoice_transaction_matches")
                    .select("invoice_id")
                    .in("invoice_id", overdueIds);

                const matchedIds = new Set((matchedInvoices || []).map(m => m.invoice_id));
                const unpaidCount = overdueIds.filter(id => !matchedIds.has(id)).length;

                if (unpaidCount > 0) {
                    newAlerts.push({
                        id: "overdue-invoices",
                        type: "warning",
                        title: "Εκκρεμείς Πληρωμές",
                        message: `${unpaidCount} τιμολόγια εκκρεμούν πάνω από 30 ημέρες.`,
                        action: { label: "Αναφορές", onClick: () => (window.location.href = "/reports") },
                        date: today,
                        isSystem: true
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }

        setSystemAlerts(newAlerts);
    }

    async function markAsRead(id: string) {
        // Optimistic update
        setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            toast.error("Σφάλμα ενημέρωσης");
            fetchDbNotifications(); // Revert on error
        }
    }

    async function markAllRead() {
        const unreadIds = dbNotifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic
        setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);

        if (error) toast.error("Σφάλμα ενημέρωσης");
    }

    async function deleteNotification(id: string) {
        setDbNotifications(prev => prev.filter(n => n.id !== id));
        await supabase.from('notifications').delete().eq('id', id);
    }

    const unreadDbCount = dbNotifications.filter(n => !n.is_read).length;
    const totalUnread = unreadDbCount + systemAlerts.length;

    const NotificationCard = ({ item }: { item: NotificationItem }) => (
        <div className={`p-4 border-b border-border/50 hover:bg-muted/50 transition-colors group relative ${!item.isSystem && !item.is_read ? 'bg-blue-50/50' : ''}`}>
            {!item.isSystem && (
                <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    {!item.is_read && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(item.id)}>
                            <Check className="h-3 w-3" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteNotification(item.id)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            )}

            <div className="flex items-start gap-3">
                <div
                    className={`mt-0.5 rounded-full p-2 ${item.type === "warning" ? "bg-amber-500/10 text-amber-600"
                        : item.type === "info" ? "bg-blue-500/10 text-blue-600"
                            : "bg-green-500/10 text-green-600"
                        }`}
                >
                    {item.type === "warning" ? <AlertTriangle className="h-4 w-4" />
                        : item.type === "info" ? <Info className="h-4 w-4" />
                            : <CheckCircle2 className="h-4 w-4" />}
                </div>

                <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{item.title}</p>
                        {item.isSystem && <Badge variant="outline" className="text-[10px] h-4 px-1">System</Badge>}
                        {!item.isSystem && !item.is_read && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.message}</p>

                    <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(item.isSystem ? item.date : new Date(item.created_at), "dd MMM, HH:mm")}
                        </span>

                        {(item.isSystem && item.action) && (
                            <Button size="sm" variant="link" onClick={item.action.onClick} className="h-auto p-0 text-xs font-medium">
                                {item.action.label} →
                            </Button>
                        )}
                        {(!item.isSystem && item.link_url) && (
                            <Button size="sm" variant="link" onClick={() => window.location.href = item.link_url!} className="h-auto p-0 text-xs font-medium">
                                Προβολή →
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(!open)}
                className="relative rounded-xl hover:bg-muted"
            >
                <Bell className={`h-5 w-5 ${totalUnread > 0 ? 'text-foreground' : 'text-muted-foreground'}`} />
                {totalUnread > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                )}
            </Button>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/5" // Subtle backdrop
                            onClick={() => setOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-14 z-50 w-[400px]"
                        >
                            <Card className="rounded-2xl shadow-xl border-border/60 overflow-hidden backdrop-blur-xl bg-background/95 supports-[backdrop-filter]:bg-background/80">
                                <Tabs defaultValue="all" className="w-full">
                                    <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                                        <div className="flex items-center gap-4">
                                            <h3 className="font-semibold">Ειδοποιήσεις</h3>
                                            <TabsList className="h-8">
                                                <TabsTrigger value="all" className="text-xs h-6">Όλα</TabsTrigger>
                                                <TabsTrigger value="unread" className="text-xs h-6">
                                                    Μη αναγνωσμένα
                                                    {totalUnread > 0 && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1 rounded-sm">{totalUnread}</span>}
                                                </TabsTrigger>
                                            </TabsList>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={markAllRead} title="Mark all read" className="h-8 w-8">
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <ScrollArea className="h-[400px]">
                                        <TabsContent value="all" className="m-0">
                                            {systemAlerts.length === 0 && dbNotifications.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-8 text-center">
                                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                                        <Bell className="h-6 w-6 opacity-20" />
                                                    </div>
                                                    <p className="font-medium">Καμία ειδοποίηση</p>
                                                    <p className="text-xs mt-1 opacity-70">Όλα ενημερωμένα!</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {systemAlerts.map(alert => <NotificationCard key={alert.id} item={alert} />)}
                                                    {dbNotifications.map(notif => <NotificationCard key={notif.id} item={notif} />)}
                                                </>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="unread" className="m-0">
                                            {(systemAlerts.length === 0 && unreadDbCount === 0) ? (
                                                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-8 text-center">
                                                    <CheckCircle2 className="h-10 w-10 mb-3 text-green-500/50" />
                                                    <p>Κανένα μη αναγνωσμένο</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {systemAlerts.map(alert => <NotificationCard key={alert.id} item={alert} />)}
                                                    {dbNotifications.filter(n => !n.is_read).map(notif => <NotificationCard key={notif.id} item={notif} />)}
                                                </>
                                            )}
                                        </TabsContent>
                                    </ScrollArea>
                                </Tabs>
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
