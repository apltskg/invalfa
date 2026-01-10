import { useState, useEffect } from "react";
import { Send, Check, Archive, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, ExportLog } from "@/types/database";
import { toast } from "sonner";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";

export default function ExportHub() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [packages, setPackages] = useState<(Package & { invoices: Invoice[] })[]>([]);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: pkgs }, { data: invs }, { data: logs }] = await Promise.all([
      supabase.from("packages").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("export_logs").select("*").order("sent_at", { ascending: false }),
    ]);

    const packagesWithInvoices = ((pkgs as Package[]) || []).map((pkg) => ({
      ...pkg,
      invoices: ((invs as Invoice[]) || []).filter((inv) => inv.package_id === pkg.id),
    }));

    setPackages(packagesWithInvoices);
    setExportLogs((logs as ExportLog[]) || []);
    setLoading(false);
  }

  const filteredPackages = packages.filter((pkg) => {
    const pkgMonth = format(new Date(pkg.start_date), "yyyy-MM");
    return pkgMonth === selectedMonth;
  });

  async function generateZip() {
    setExporting(true);
    const zip = new JSZip();

    const summaryData: any[] = [];

    for (const pkg of filteredPackages) {
      for (const inv of pkg.invoices) {
        const fileName = `${pkg.client_name}-${inv.category}-€${inv.amount?.toFixed(2) || "0"}.pdf`;

        const { data } = await supabase.storage.from("invoices").download(inv.file_path);
        if (data) {
          zip.file(fileName, data);
        }

        summaryData.push({
          Package: pkg.client_name,
          Category: inv.category,
          Merchant: inv.merchant,
          Amount: inv.amount,
          Date: inv.invoice_date,
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(summaryData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    zip.file("Summary.xlsx", excelBuffer);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${selectedMonth}.zip`;
    a.click();

    setExporting(false);
    toast.success("Export downloaded!");
  }

  async function sendToAccountant() {
    setSending(true);

    await supabase.from("export_logs").insert([
      {
        month_year: selectedMonth,
        packages_included: filteredPackages.length,
        invoices_included: filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0),
      },
    ]);

    setSending(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    fetchData();
    toast.success("Sent to accountant!");
  }


  const totalInvoices = filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0);
  const totalAmount = filteredPackages.reduce((acc, p) => acc + p.invoices.reduce((a, i) => a + (i.amount || 0), 0), 0);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Export Hub</h1>
          <p className="mt-1 text-muted-foreground">Δημιουργία μηνιαίων αναφορών για τον λογιστή</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card className="p-6 rounded-3xl">
          <p className="text-sm font-medium text-muted-foreground">Πακέτα</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{filteredPackages.length}</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-sm font-medium text-muted-foreground">Παραστατικά</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{totalInvoices}</p>
        </Card>
        <Card className="p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <p className="text-sm font-medium text-muted-foreground">Σύνολο</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight text-primary">€{totalAmount.toFixed(2)}</p>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button onClick={generateZip} disabled={exporting || totalInvoices === 0} className="rounded-xl gap-2">
          <Archive className="h-4 w-4" />
          {exporting ? "Generating..." : "Generate ZIP + Excel"}
        </Button>
        <Button 
          disabled 
          variant="outline" 
          className="rounded-xl gap-2 opacity-50 cursor-not-allowed"
          title="Σύντομα διαθέσιμο"
        >
          <Link2 className="h-4 w-4" />
          Magic Link (σύντομα)
        </Button>
        <Button
          onClick={sendToAccountant}
          disabled={sending || totalInvoices === 0}
          variant="outline"
          className="rounded-xl relative overflow-hidden gap-2"
        >
          <AnimatePresence mode="wait">
            {showSuccess ? (
              <motion.span
                key="success"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center text-green-600"
              >
                <Check className="h-4 w-4 mr-2" /> Sent!
              </motion.span>
            ) : (
              <motion.span
                key="send"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="flex items-center"
              >
                <Send className="h-4 w-4 mr-2" /> Mark as Sent
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Packages List */}
      {filteredPackages.length > 0 ? (
        <Card className="rounded-3xl overflow-hidden mb-8">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold">Πακέτα για {months.find((m) => m.value === selectedMonth)?.label}</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredPackages.map((pkg) => (
              <div key={pkg.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{pkg.client_name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-lg">
                      {pkg.invoices.length} invoices
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(pkg.start_date), "dd MMM")} - {format(new Date(pkg.end_date), "dd MMM")}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-semibold">€{pkg.invoices.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="mb-8">
          <EmptyState
            icon={Archive}
            title="Δεν υπάρχουν πακέτα"
            description={`Δεν υπάρχουν πακέτα για ${months.find((m) => m.value === selectedMonth)?.label}. Επιλέξτε διαφορετικό μήνα ή δημιουργήστε νέα πακέτα.`}
          />
        </div>
      )}

      {/* Export History */}
      {exportLogs.length > 0 && (
        <Card className="rounded-3xl">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold">Ιστορικό Εξαγωγών</h3>
          </div>
          <div className="divide-y divide-border">
            {exportLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                <Badge variant="outline" className="rounded-lg">
                  {log.month_year}
                </Badge>
                <span className="text-muted-foreground">
                  {log.packages_included} packages, {log.invoices_included} invoices
                </span>
                <span className="text-muted-foreground">{format(new Date(log.sent_at), "dd MMM yyyy, HH:mm")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
