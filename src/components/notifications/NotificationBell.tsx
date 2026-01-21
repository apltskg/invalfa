import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, CheckCircle2, Info, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Notification {
    id: string;
    type: "warning" | "info" | "success";
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    date: Date;
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        checkNotifications();
        // Check every 5 minutes
        const interval = setInterval(checkNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    async function checkNotifications() {
        const newNotifications: Notification[] = [];

        // Check if it's the 1st of the month (bank sync reminder)
        const today = new Date();
        if (today.getDate() === 1) {
            newNotifications.push({
                id: "bank-sync-reminder",
                type: "warning",
                title: "Υπενθύμιση Συγχρονισμού Τράπεζας",
                message: "Μην ξεχάσετε να ανεβάσετε το αντίγραφο τράπεζας για τον προηγούμενο μήνα!",
                action: {
                    label: "Μετάβαση",
                    onClick: () => (window.location.href = "/bank-sync"),
                },
                date: today,
            });
        }

        // Check for unmatched transactions
        try {
            const { data: transactions } = await supabase
                .from("bank_transactions")
                .select("id")
                .is("matched", false);

            if (transactions && transactions.length > 0) {
                newNotifications.push({
                    id: "unmatched-transactions",
                    type: "warning",
                    title: "Αταίριαστες Συναλλαγές",
                    message: `Υπάρχουν ${transactions.length} συναλλαγές που δεν έχουν ταιριαχτεί με παραστατικά.`,
                    action: {
                        label: "Προβολή",
                        onClick: () => (window.location.href = "/bank-sync"),
                    },
                    date: today,
                });
            }

            // Check for invoices without amounts or dates
            const { data: invoices } = await supabase
                .from("invoices")
                .select("id, merchant")
                .or("amount.is.null,invoice_date.is.null");

            if (invoices && invoices.length > 0) {
                newNotifications.push({
                    id: "incomplete-invoices",
                    type: "info",
                    title: "Ελλιπή Παραστατικά",
                    message: `${invoices.length} παραστατικά χρειάζονται επεξεργασία (λείπει ποσό ή ημερομηνία).`,
                    action: {
                        label: "Προβολή",
                        onClick: () => (window.location.href = "/packages"),
                    },
                    date: today,
                });
            }
        } catch (error) {
            console.error("Error checking notifications:", error);
        }

        setNotifications(newNotifications);
    }

    const unreadCount = notifications.length;

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(!open)}
                className="relative rounded-xl"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                        {unreadCount}
                    </Badge>
                )}
            </Button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setOpen(false)}
                        />

                        {/* Notification Panel */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-12 z-50 w-96 max-h-[80vh] overflow-auto"
                        >
                            <Card className="rounded-3xl shadow-2xl border-border">
                                <div className="p-4 border-b border-border flex items-center justify-between">
                                    <h3 className="font-semibold">Ειδοποιήσεις</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setOpen(false)}
                                        className="h-8 w-8 rounded-xl"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="divide-y divide-border">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                                            <p className="font-medium">Όλα εντάξει!</p>
                                            <p className="text-sm mt-1">Δεν υπάρχουν ειδοποιήσεις</p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className="p-4 hover:bg-muted/50 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`mt-0.5 rounded-lg p-2 ${notif.type === "warning"
                                                                ? "bg-yellow-500/10 text-yellow-600"
                                                                : notif.type === "info"
                                                                    ? "bg-blue-500/10 text-blue-600"
                                                                    : "bg-green-500/10 text-green-600"
                                                            }`}
                                                    >
                                                        {notif.type === "warning" ? (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        ) : notif.type === "info" ? (
                                                            <Info className="h-4 w-4" />
                                                        ) : (
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm">{notif.title}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {format(notif.date, "dd MMM, HH:mm")}
                                                            </span>
                                                            {notif.action && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="link"
                                                                    onClick={notif.action.onClick}
                                                                    className="h-auto p-0 text-xs"
                                                                >
                                                                    {notif.action.label} →
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
