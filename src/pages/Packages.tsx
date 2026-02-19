import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package as PackageIcon, FileText, AlertCircle, CheckCircle2, Calendar, TrendingUp, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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
      const [{ data: pkgs }, { data: invs }, { data: matches }] = await Promise.all([
        supabase
          .from("packages")
          .select("*")
          .gte("start_date", startDate)
          .lte("start_date", endDate)
          .order("created_at", { ascending: false }),
        supabase.from("invoices").select("*"),
        supabase.from("invoice_transaction_matches").select("invoice_id"),
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Φάκελοι Ταξιδιών</h1>
          <p className="text-sm text-slate-500 mt-0.5">Διαχείριση ταξιδιών, εξόδων και κερδοφορίας.</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2 h-9 text-sm bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              νέος Φάκελος
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <PackageIcon className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center text-xl">Δημιουργία Νέου Φακέλου</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Όνομα Πελάτη / Γκρουπ</Label>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(val) => setNewPackage({ ...newPackage, client_name: val })}
                  >
                    <SelectTrigger className="rounded-xl flex-1">
                      <SelectValue placeholder="Επιλέξτε Υπάρχοντα Πελάτη" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="client_name"
                    value={newPackage.client_name}
                    onChange={(e) => setNewPackage({ ...newPackage, client_name: e.target.value })}
                    placeholder="ή πληκτρολογήστε νέο..."
                    className="rounded-xl flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Tip: Επιλέξτε από τη λίστα ή γράψτε νέο όνομα.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Έναρξη</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newPackage.start_date}
                    onChange={(e) => setNewPackage({ ...newPackage, start_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Λήξη</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newPackage.end_date}
                    onChange={(e) => setNewPackage({ ...newPackage, end_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="margin">Στόχος Κέρδους (%)</Label>
                <div className="relative">
                  <Input
                    id="margin"
                    type="number"
                    value={newPackage.target_margin_percent}
                    onChange={(e) => setNewPackage({ ...newPackage, target_margin_percent: e.target.value })}
                    placeholder="10"
                    className="rounded-xl pl-10"
                  />
                  <span className="absolute left-3 top-2.5 text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Περιγραφή (Προαιρετικό)</Label>
                <Input
                  id="description"
                  value={newPackage.description}
                  onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                  placeholder="Λεπτομέρειες ταξιδιού..."
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createPackage} className="w-full rounded-xl" size="lg">
                Δημιουργία Φακέλου
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto p-1 bg-muted/50 rounded-2xl border border-white/10">
          <TabsTrigger value="all" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Όλα</TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Ενεργά</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Ολοκληρωμένα</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-64 animate-pulse rounded-3xl bg-muted/50 border-none" />
              ))}
            </div>
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPackages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group relative cursor-pointer overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 border border-border/50 bg-gradient-to-br from-card to-secondary/30"
                    onClick={() => navigate(`/packages/${pkg.id}`)}
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="mb-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="rounded-lg capitalize shadow-sm">
                          {pkg.status === "active" ? "Ενεργό" : "Ολοκληρωμένο"}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-bold text-xl leading-tight text-foreground/90 group-hover:text-primary transition-colors">
                          {pkg.client_name}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {pkg.start_date ? format(new Date(pkg.start_date), "dd/MM") : "?"} -{" "}
                            {pkg.end_date ? format(new Date(pkg.end_date), "dd/MM/yyyy") : "?"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Έξοδα</p>
                          <p className="font-semibold text-foreground">€{pkg.stats.expenses.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Κέρδος (Εκτ.)</p>
                          <p className={`font-semibold ${pkg.stats.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
