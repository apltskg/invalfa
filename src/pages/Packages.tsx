import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package as PackageIcon, FileText, AlertCircle, CheckCircle2, Calendar, TrendingUp, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMonth } from "@/contexts/MonthContext";
import { FormDialog, FormInput, FormRow, FormField, FormTextarea, FormDivider } from "@/components/shared/FormDialog";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMonth } from "@/contexts/MonthContext";

type PackageWithStats = Package & {
  invoices: Invoice[];
  stats: {
    total: number;
    matched: number;
    totalAmount: number;
    income: number;
    collected: number;
    expenses: number;
    profit: number;
    margin: number;
  }
};

export default function Packages() {
  const navigate = useNavigate();
  const { startDate, endDate, monthKey } = useMonth();
  const [packages, setPackages] = useState<PackageWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [newPackage, setNewPackage] = useState({
    client_name: "",
    start_date: "",
    end_date: "",
    target_margin_percent: "10",
    description: "",
  });

  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [monthKey]); // Re-fetch when month changes

  async function fetchCustomers() {
    try {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) setCustomers(data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data: pkgs } = await supabase
          .from("packages")
          .select("*")
          .gte("start_date", startDate)
          .lte("start_date", endDate)
          .order("created_at", { ascending: false });

      const pkgIds = (pkgs || []).map(p => p.id);

      // Only fetch invoices & matches for these packages (not ALL)
      const [{ data: invs }, { data: matches }] = await Promise.all([
        pkgIds.length > 0
          ? supabase.from("invoices").select("*").in("package_id", pkgIds)
          : Promise.resolve({ data: [] as any[] }),
        pkgIds.length > 0
          ? supabase.from("invoice_transaction_matches").select("invoice_id")
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const matchedInvoiceIds = new Set(((matches as any[]) || []).map(m => m.invoice_id));

      const processedPackages = ((pkgs as Package[]) || []).map((pkg) => {
        // Cast and map invoices to match new interface with defaults
        const pkgInvoices = ((invs as any[]) || [])
          .filter((inv) => inv.package_id === pkg.id)
          .map(inv => ({
            ...inv,
            type: inv.type || 'expense', // Default to expense if missing
            payment_status: inv.payment_status || 'pending',
            supplier_id: inv.supplier_id || null,
            customer_id: inv.customer_id || null,
            isMatched: matchedInvoiceIds.has(inv.id)
          })) as (Invoice & { isMatched: boolean })[];

        // Calculate financial stats
        const expenses = pkgInvoices
          .filter(i => (i as any).type === 'expense' || !(i as any).type)
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const income = pkgInvoices
          .filter(i => (i as any).type === 'income')
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const collected = pkgInvoices
          .filter(i => (i as any).type === 'income' && i.isMatched)
          .reduce((sum, i) => sum + (i.amount || 0), 0);

        const profit = income - expenses;
        const margin = income > 0 ? (profit / income) * 100 : 0;

        return {
          ...pkg,
          invoices: pkgInvoices,
          stats: {
            total: pkgInvoices.length,
            matched: pkgInvoices.filter((inv) => inv.isMatched).length,
            totalAmount: pkgInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
            income,
            collected,
            expenses,
            profit,
            margin
          }
        };
      });

      setPackages(processedPackages);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  }

  async function createPackage() {
    if (!newPackage.client_name || !newPackage.start_date || !newPackage.end_date) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("packages").insert([{
        client_name: newPackage.client_name,
        start_date: newPackage.start_date,
        end_date: newPackage.end_date,
        status: 'active'
      }]);

      if (error) {
        console.error("Package creation error:", error);
        throw error;
      }

      toast.success("Package created successfully");
      setDialogOpen(false);
      setNewPackage({
        client_name: "",
        start_date: "",
        end_date: "",
        target_margin_percent: "10",
        description: ""
      });
      fetchData();
    } catch (error) {
      console.error("Create error:", error);
      toast.error("Failed to create package");
    }
  }

  const filteredPackages = activeTab === "all"
    ? packages
    : packages.filter(p => p.status === activeTab);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Φάκελοι Ταξιδιών</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Διαχείριση ταξιδιών, εξόδων και κερδοφορίας.</p>
        </div>

        <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2 h-9 text-sm">
              <Plus className="h-4 w-4" />
              Νέος Φάκελος
            </Button>

        <FormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Δημιουργία Νέου Φακέλου"
          icon={PackageIcon}
          onSubmit={createPackage}
          submitLabel="Δημιουργία Φακέλου"
        >
          <FormField label="Πελάτης / Γκρουπ">
            <Select
              onValueChange={(val) => setNewPackage({ ...newPackage, client_name: val })}
            >
              <SelectTrigger className="rounded-xl h-10 text-sm bg-muted/30 border-border/50">
                <SelectValue placeholder="Επιλέξτε υπάρχοντα πελάτη..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormInput
            label="Ή πληκτρολογήστε νέο"
            value={newPackage.client_name}
            onChange={(v) => setNewPackage({ ...newPackage, client_name: v })}
            placeholder="π.χ. Group Paris – Ιούνιος 2025"
            icon={Users}
          />
          <FormDivider />
          <FormRow>
            <FormInput
              label="Έναρξη"
              type="date"
              value={newPackage.start_date}
              onChange={(v) => setNewPackage({ ...newPackage, start_date: v })}
              icon={Calendar}
            />
            <FormInput
              label="Λήξη"
              type="date"
              value={newPackage.end_date}
              onChange={(v) => setNewPackage({ ...newPackage, end_date: v })}
              icon={Calendar}
            />
          </FormRow>
          <FormRow>
            <FormInput
              label="Στόχος Κέρδους (%)"
              type="number"
              value={newPackage.target_margin_percent}
              onChange={(v) => setNewPackage({ ...newPackage, target_margin_percent: v })}
              placeholder="10"
            />
          </FormRow>
          <FormTextarea
            label="Περιγραφή (Προαιρετικό)"
            value={newPackage.description}
            onChange={(v) => setNewPackage({ ...newPackage, description: v })}
            placeholder="Λεπτομέρειες ταξιδιού..."
            rows={2}
          />
        </FormDialog>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 p-1 bg-muted/50 rounded-2xl border border-white/10 h-auto">
          <TabsTrigger value="all" className="rounded-xl px-3 sm:px-6 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">Όλα</TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl px-3 sm:px-6 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">Ενεργά</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl px-3 sm:px-6 py-2 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">Ολοκληρ.</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {loading ? (
            <PageSkeleton variant="cards" />
          ) : filteredPackages.length === 0 ? (
            <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-16 bg-muted/20">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <PackageIcon className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Δεν βρέθηκαν φάκελοι</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">
                Ξεκινήστε δημιουργώντας τον πρώτο σας φάκελο ταξιδιού για να παρακολουθείτε έξοδα και κέρδη.
              </p>
              <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
                Δημιουργία Πρώτου Φακέλου
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.98] border border-border/50 bg-gradient-to-br from-card to-secondary/30 touch-card"
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-start">
                        <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="rounded-lg capitalize shadow-sm text-[10px] sm:text-xs">
                          {pkg.status === "active" ? "Ενεργό" : "Ολοκληρωμένο"}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-base sm:text-xl leading-tight text-foreground/90 group-hover:text-primary transition-colors line-clamp-2">
                          {pkg.client_name}
                        </h3>
                        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span>
                            {pkg.start_date ? format(new Date(pkg.start_date), "dd/MM") : "?"} -{" "}
                            {pkg.end_date ? format(new Date(pkg.end_date), "dd/MM/yyyy") : "?"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Έξοδα</p>
                          <p className="font-semibold text-sm sm:text-base text-foreground">€{pkg.stats.expenses.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-0.5 sm:mb-1">Κέρδος</p>
                          <p className={`font-semibold text-sm sm:text-base ${pkg.stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {pkg.stats.profit >= 0 ? '+' : ''}€{pkg.stats.profit.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar for Payments */}
                      {(() => {
                        const pct = pkg.stats.income > 0
                          ? Math.round((pkg.stats.collected / pkg.stats.income) * 100)
                          : 0;
                        const isPast = pkg.end_date && new Date(pkg.end_date) < new Date();
                        const barColor =
                          pct >= 75 ? "bg-emerald-500" :
                            pct >= 50 ? "bg-amber-400" :
                              isPast ? "bg-rose-500" : "bg-amber-400";
                        return (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Είσπραξη</span>
                              <span className={pct < 50 ? 'text-amber-600 font-medium' : ''}>{pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                              <span>€{pkg.stats.collected.toFixed(0)}</span>
                              <span>από €{pkg.stats.income.toFixed(0)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
