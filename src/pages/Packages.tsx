import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package as PackageIcon, FileText, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Package, Invoice } from "@/types/database";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";

type PackageWithInvoices = Package & { invoices: Invoice[] };

export default function Packages() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<PackageWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    client_name: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [{ data: pkgs }, { data: invs }] = await Promise.all([
      supabase.from("packages").select("*").order("created_at", { ascending: false }),
      supabase.from("invoices").select("*"),
    ]);

    const packagesWithInvoices = ((pkgs as Package[]) || []).map((pkg) => ({
      ...pkg,
      invoices: ((invs as Invoice[]) || []).filter((inv) => inv.package_id === pkg.id),
    }));

    setPackages(packagesWithInvoices);
    setLoading(false);
  }

  async function createPackage() {
    if (!newPackage.client_name || !newPackage.start_date || !newPackage.end_date) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("packages").insert([newPackage]);
    if (error) {
      toast.error("Failed to create package");
    } else {
      toast.success("Package created");
      setDialogOpen(false);
      setNewPackage({ client_name: "", start_date: "", end_date: "" });
      fetchData();
    }
  }

  const getPackageStats = (pkg: PackageWithInvoices) => {
    const total = pkg.invoices.length;
    const matched = pkg.invoices.filter((inv) => inv.amount).length;
    const totalAmount = pkg.invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    return { total, matched, totalAmount };
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Πακέτα Ταξιδιών</h1>
          <p className="mt-1 text-muted-foreground">Διαχείριση πακέτων και παραστατικών</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Νέο Πακέτο
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Δημιουργία Πακέτου</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="client">Όνομα Πελάτη</Label>
                <Input
                  id="client"
                  value={newPackage.client_name}
                  onChange={(e) => setNewPackage({ ...newPackage, client_name: e.target.value })}
                  placeholder="π.χ. Παπαδόπουλος Ιωάννης"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Ημερομηνία Έναρξης</Label>
                  <Input
                    id="start"
                    type="date"
                    value={newPackage.start_date}
                    onChange={(e) => setNewPackage({ ...newPackage, start_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Ημερομηνία Λήξης</Label>
                  <Input
                    id="end"
                    type="date"
                    value={newPackage.end_date}
                    onChange={(e) => setNewPackage({ ...newPackage, end_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button onClick={createPackage} className="w-full rounded-xl">
                Δημιουργία
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center rounded-3xl border-dashed p-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <PackageIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="mb-2 text-lg font-medium">Δεν υπάρχουν πακέτα</p>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Ξεκινήστε δημιουργώντας ένα νέο πακέτο ταξιδιού για να οργανώσετε τα παραστατικά σας.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            Δημιουργία Πακέτου
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, index) => {
            const stats = getPackageStats(pkg);
            const matchPercent = stats.total > 0 ? Math.round((stats.matched / stats.total) * 100) : 0;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="group cursor-pointer rounded-3xl p-6 transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.client_name}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(pkg.start_date), "dd/MM")} - {format(new Date(pkg.end_date), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                    <Badge variant={pkg.status === "active" ? "default" : "secondary"} className="rounded-lg capitalize">
                      {pkg.status === "active" ? "Ενεργό" : "Ολοκληρώθηκε"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Παραστατικά
                      </span>
                      <span className="font-medium">{stats.total}</span>
                    </div>

                    {stats.total > 0 && (
                      <>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${matchPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {matchPercent === 100 ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            {matchPercent}% ολοκληρώθηκε
                          </span>
                          <span className="font-semibold">€{stats.totalAmount.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
