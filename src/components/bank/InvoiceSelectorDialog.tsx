import { useState, useEffect } from "react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Calendar, Euro, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface InvoiceListItem {
    id: string;
    invoice_date: string | null;
    invoice_number: string | null;
    client_name: string | null;
    client_vat: string | null;
    total_amount: number | null;
    match_status: string;
}

interface InvoiceSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (invoiceId: string, invoiceNumber: string) => void;
    transactionAmount: number;
    transactionDate: string;
}

export function InvoiceSelectorDialog({
    open,
    onOpenChange,
    onSelect,
    transactionAmount,
    transactionDate
}: InvoiceSelectorDialogProps) {
    const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (open) {
            fetchInvoices();
        }
    }, [open]);

    async function fetchInvoices() {
        setLoading(true);
        try {
            // Fetch unmatched invoices. 
            // We might want to filter by date range close to transactionDate, but for now let's fetch all open ones
            // or at least from the same month? Let's just fetch latest 50 unmatched for now + search

            let query = supabase
                .from('invoice_list_items')
                .select('*')
                .eq('match_status', 'unmatched')
                .order('invoice_date', { ascending: false })
                .limit(50);

            const { data, error } = await query;

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setLoading(false);
        }
    }

    const filteredInvoices = invoices.filter(invoice => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (invoice.invoice_number?.toLowerCase() || "").includes(q) ||
            (invoice.client_name?.toLowerCase() || "").includes(q) ||
            (invoice.client_vat || "").includes(q)
        );
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Σύνδεση με Παραστατικό</DialogTitle>
                    <DialogDescription>
                        Επιλέξτε το παραστατικό που αντιστοιχεί στη συναλλαγή ύψους
                        <span className={cn("font-bold ml-1", transactionAmount > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {transactionAmount > 0 ? '+' : '-'}€{Math.abs(transactionAmount).toFixed(2)}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 py-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Αναζήτηση με αριθμό, επωνυμία, ΑΦΜ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 rounded-xl"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border rounded-xl">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <FileText className="h-8 w-8 opacity-50" />
                            <p>Δεν βρέθηκαν διαθέσιμα παραστατικά</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0 backdrop-blur-sm">
                                <div className="col-span-2">Ημερομηνία</div>
                                <div className="col-span-3">Παραστατικό</div>
                                <div className="col-span-4">Αντισυμβαλλόμενος</div>
                                <div className="col-span-3 text-right">Ποσό</div>
                            </div>
                            {filteredInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/50 cursor-pointer transition-colors text-sm group"
                                    onClick={() => onSelect(invoice.id, invoice.invoice_number || "Χωρίς Αριθμό")}
                                >
                                    <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {invoice.invoice_date ? format(new Date(invoice.invoice_date), "dd/MM/yy") : "-"}
                                    </div>
                                    <div className="col-span-3 font-medium flex items-center gap-2">
                                        <FileText className="h-3 w-3 text-primary" />
                                        {invoice.invoice_number || "-"}
                                    </div>
                                    <div className="col-span-4 truncate text-muted-foreground group-hover:text-foreground transition-colors">
                                        {invoice.client_name || "-"}
                                    </div>
                                    <div className="col-span-3 text-right font-medium">
                                        €{(invoice.total_amount || 0).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
