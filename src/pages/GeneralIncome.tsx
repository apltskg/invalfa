import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Invoice } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Calendar, TrendingUp } from "lucide-react";
import { UploadModal } from "@/components/upload/UploadModal";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function GeneralIncome() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .is("package_id", null)
                .eq("type", "income")
                .order("invoice_date", { ascending: false });

            if (error) throw error;
            setInvoices(((data as any[]) || []) as Invoice[]);
        } catch (error) {
            console.error("Error fetching general income:", error);
        } finally {
            setLoading(false);
        }
    }

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Γενικά Έσοδα</h1>
                    <p className="mt-1 text-muted-foreground">Διαχείριση εσόδων εκτός φακέλων (π.χ. μεταφορές)</p>
                </div>
                <Button onClick={() => setUploadModalOpen(true)} className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                    <Upload className="h-4 w-4" />
                    Νέο Έσοδο
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="p-6 rounded-3xl bg-gradient-to-br from-green-50 to-green-100/50 border-none shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center text-green-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Σύνολο Εσόδων</p>
                            <p className="text-2xl font-bold text-green-700">€{totalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Φόρτωση...</div>
                ) : invoices.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">Δεν υπάρχουν καταχωρήσεις</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Καταχωρήστε έσοδα που δεν συνδέονται με συγκεκριμένα ταξιδιωτικά πακέτα.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {invoices.map((inv) => (
                            <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{inv.merchant || "Άγνωστος Πελάτης"}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="secondary" className="rounded-md font-normal text-xs h-5 px-2">
                                                {inv.category}
                                            </Badge>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {inv.invoice_date ? format(new Date(inv.invoice_date), "dd/MM/yyyy") : "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="font-bold text-green-600">+€{(inv.amount || 0).toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <UploadModal
                open={uploadModalOpen}
                onOpenChange={setUploadModalOpen}
                onUploadComplete={fetchData}
                defaultType="income"
            />
        </div>
    );
}
