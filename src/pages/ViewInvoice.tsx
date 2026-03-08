import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, CheckCircle2, Loader2, AlertCircle, Building2 } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";

interface ShareData {
  id: string;
  token: string;
  customer_name: string | null;
  customer_email: string;
  message: string | null;
  status: string;
  created_at: string | null;
  invoice_id: string;
}

interface InvoiceData {
  id: string;
  merchant: string | null;
  amount: number | null;
  invoice_date: string | null;
  file_name: string;
  file_path: string;
  category: string;
  extracted_data: any;
}

export default function ViewInvoice() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareData | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (token) loadInvoice(token);
  }, [token]);

  async function loadInvoice(t: string) {
    try {
      // Fetch share by token (anon can read via RLS)
      const { data: shareData, error: shareErr } = await (supabase as any)
        .from("hub_shares")
        .select("*")
        .eq("token", t)
        .single();

      if (shareErr || !shareData) {
        setError("Το link δεν είναι έγκυρο ή έχει λήξει.");
        return;
      }

      setShare(shareData);

      // Fetch invoice details
      const { data: invData, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", shareData.invoice_id)
        .single();

      if (invErr || !invData) {
        setError("Δεν βρέθηκε το τιμολόγιο.");
        return;
      }

      setInvoice(invData as any);

      // Mark as viewed if not already
      if (shareData.status === "sent") {
        await (supabase as any)
          .from("hub_shares")
          .update({ status: "viewed", viewed_at: new Date().toISOString() })
          .eq("token", t);
      }
    } catch (e) {
      console.error(e);
      setError("Κάτι πήγε στραβά.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!invoice) return;
    setDownloading(true);
    try {
      // We need a signed URL - this will only work if the file is accessible
      // For the public viewer, we generate a signed URL via an edge function or use public bucket
      const { data, error } = await supabase.storage
        .from("invoices")
        .createSignedUrl(invoice.file_path, 3600);

      if (error || !data?.signedUrl) {
        // Try invoice-receipts bucket (public)
        const { data: pubData } = supabase.storage
          .from("invoice-receipts")
          .getPublicUrl(invoice.file_path);
        
        if (pubData?.publicUrl) {
          window.open(pubData.publicUrl, "_blank");
          return;
        }
        throw new Error("Δεν ήταν δυνατή η λήψη του αρχείου");
      }

      window.open(data.signedUrl, "_blank");
    } catch (e: any) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="rounded-2xl border-border max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="text-lg font-semibold text-foreground mb-2">Μη έγκυρο link</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const extracted = invoice?.extracted_data as any;
  const invoiceNumber = extracted?.invoice_number || invoice?.file_name || "—";
  const vatAmount = extracted?.vat_amount;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header bar */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Τιμολόγιο</p>
              <p className="text-xs text-muted-foreground">Ασφαλής προβολή</p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-lg text-xs gap-1 border-success/30 text-success">
            <CheckCircle2 className="h-3 w-3" />
            Επιβεβαιωμένο
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Greeting */}
        {share?.message && (
          <Card className="rounded-2xl border-border bg-card">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground italic">"{share.message}"</p>
            </CardContent>
          </Card>
        )}

        {/* Invoice card */}
        <Card className="rounded-2xl border-border bg-card overflow-hidden">
          <div className="px-6 py-4 bg-primary/5 border-b border-border flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Στοιχεία Τιμολογίου</p>
              <p className="text-xs text-muted-foreground">#{invoiceNumber}</p>
            </div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Πάροχος</p>
                <p className="text-sm font-medium text-foreground">{invoice?.merchant || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ποσό</p>
                <p className="text-xl font-bold text-foreground">
                  {invoice?.amount ? `€${Number(invoice.amount).toFixed(2)}` : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ημερομηνία</p>
                <p className="text-sm text-foreground">
                  {invoice?.invoice_date
                    ? format(new Date(invoice.invoice_date), "dd MMMM yyyy", { locale: el })
                    : "—"}
                </p>
              </div>
              {vatAmount && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">ΦΠΑ</p>
                  <p className="text-sm text-foreground">€{Number(vatAmount).toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Download button - only for uploaded files */}
            {invoice?.file_path && !invoice.file_path.startsWith("manual/") && (
              <div className="pt-2 border-t border-border">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  variant="outline"
                  className="rounded-xl gap-2 text-sm w-full h-10 border-border"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Λήψη Τιμολογίου (PDF)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Αυτό το τιμολόγιο κοινοποιήθηκε μέσω ασφαλούς link.
          {share?.created_at && (
            <> · Ημ/νία αποστολής: {format(new Date(share.created_at), "dd/MM/yyyy")}</>
          )}
        </p>
      </div>
    </div>
  );
}
