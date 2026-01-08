import { useState, useEffect } from "react";
import { Download, Send, Check, FileSpreadsheet, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice, ExportLog } from "@/types/database";
import { toast } from "sonner";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";

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
    
    const packagesWithInvoices = ((pkgs as Package[]) || []).map(pkg => ({
      ...pkg,
      invoices: ((invs as Invoice[]) || []).filter(inv => inv.package_id === pkg.id)
    }));
    
    setPackages(packagesWithInvoices);
    setExportLogs((logs as ExportLog[]) || []);
    setLoading(false);
  }

  const filteredPackages = packages.filter(pkg => {
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
        
        // Fetch file from storage
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
    
    // Create Excel summary
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
    
    await supabase.from("export_logs").insert([{
      month_year: selectedMonth,
      packages_included: filteredPackages.length,
      invoices_included: filteredPackages.reduce((acc, p) => acc + p.invoices.length, 0),
    }]);
    
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Export Hub</h1>
          <p className="mt-1 text-muted-foreground">Generate monthly reports for your accountant</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6 rounded-3xl">
          <p className="text-sm text-muted-foreground">Packages</p>
          <p className="text-3xl font-semibold">{filteredPackages.length}</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-sm text-muted-foreground">Invoices</p>
          <p className="text-3xl font-semibold">{totalInvoices}</p>
        </Card>
        <Card className="p-6 rounded-3xl">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-semibold">€{totalAmount.toFixed(2)}</p>
        </Card>
      </div>

      <div className="flex gap-4 mb-8">
        <Button onClick={generateZip} disabled={exporting || totalInvoices === 0} className="rounded-xl">
          <Archive className="h-4 w-4 mr-2" />
          {exporting ? "Generating..." : "Generate Monthly Report"}
        </Button>
        <Button onClick={sendToAccountant} disabled={sending || totalInvoices === 0} variant="outline" className="rounded-xl relative overflow-hidden">
          <AnimatePresence>
            {showSuccess ? (
              <motion.span initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center text-green-600">
                <Check className="h-4 w-4 mr-2" /> Sent!
              </motion.span>
            ) : (
              <motion.span initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center">
                <Send className="h-4 w-4 mr-2" /> Send to Accountant
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {filteredPackages.length > 0 && (
        <Card className="rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Packages in {months.find(m => m.value === selectedMonth)?.label}</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredPackages.map(pkg => (
              <div key={pkg.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{pkg.client_name}</p>
                  <p className="text-sm text-muted-foreground">{pkg.invoices.length} invoices</p>
                </div>
                <p className="font-semibold">€{pkg.invoices.reduce((a, i) => a + (i.amount || 0), 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {exportLogs.length > 0 && (
        <Card className="mt-8 rounded-3xl">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Export History</h3>
          </div>
          <div className="divide-y divide-border">
            {exportLogs.slice(0, 5).map(log => (
              <div key={log.id} className="p-4 flex items-center justify-between text-sm">
                <span>{log.month_year}</span>
                <span className="text-muted-foreground">{log.packages_included} packages, {log.invoices_included} invoices</span>
                <span className="text-muted-foreground">{format(new Date(log.sent_at), "MMM d, yyyy HH:mm")}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
