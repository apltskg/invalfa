import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Plus, Upload, FileSpreadsheet, Archive, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadModal } from "@/components/upload/UploadModal";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Papa from "papaparse";

interface FABConfig {
  icon: React.ReactNode;
  label: string;
  action: () => void;
}

export function ContextualFAB() {
  const location = useLocation();
  const params = useParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    client_name: "",
    start_date: "",
    end_date: "",
  });

  const handleCSVImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const rows = results.data as any[];
          const validRows = rows.filter((r) => r.date && r.description && r.amount);

          const toInsert = validRows.map((r) => ({
            transaction_date: r.date,
            description: r.description,
            amount: parseFloat(r.amount.replace(/[€$,]/g, "")),
          }));

          if (toInsert.length === 0) {
            toast.error("No valid rows found. Expected: date, description, amount");
            return;
          }

          const { error } = await supabase.from("bank_transactions").insert(toInsert);
          if (error) {
            toast.error("Failed to import transactions");
          } else {
            toast.success(`Imported ${toInsert.length} transactions`);
            window.location.reload();
          }
        },
      });
    };
    input.click();
  };

  const handleCreatePackage = async () => {
    if (!newPackage.client_name || !newPackage.start_date || !newPackage.end_date) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("packages").insert([newPackage]);
    if (error) {
      toast.error("Failed to create package");
    } else {
      toast.success("Package created");
      setPackageDialogOpen(false);
      setNewPackage({ client_name: "", start_date: "", end_date: "" });
      window.location.reload();
    }
  };

  const getFABConfig = (): FABConfig | null => {
    const path = location.pathname;

    // Package Detail - Upload Invoice
    if (path.startsWith("/packages/") && params.id) {
      return {
        icon: <Upload className="h-5 w-5" />,
        label: "Upload Invoice",
        action: () => setUploadOpen(true),
      };
    }

    // Packages list - Create Package
    if (path === "/packages" || path === "/") {
      return {
        icon: <Package className="h-5 w-5" />,
        label: "New Package",
        action: () => setPackageDialogOpen(true),
      };
    }

    // Bank Sync - Import CSV
    if (path === "/bank-sync") {
      return {
        icon: <FileSpreadsheet className="h-5 w-5" />,
        label: "Import CSV",
        action: handleCSVImport,
      };
    }

    // Export Hub - no FAB
    if (path === "/export-hub") {
      return null;
    }

    return null;
  };

  const config = getFABConfig();

  if (!config) return null;

  return (
    <>
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          onClick={config.action}
          className="h-14 gap-2 rounded-full px-6 shadow-elevated"
        >
          {config.icon}
          <span className="font-medium">{config.label}</span>
        </Button>
      </motion.div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Δημιουργία Πακέτου</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fab-client">Όνομα Πελάτη</Label>
              <Input
                id="fab-client"
                value={newPackage.client_name}
                onChange={(e) => setNewPackage({ ...newPackage, client_name: e.target.value })}
                placeholder="π.χ. Παπαδόπουλος Ιωάννης"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fab-start">Έναρξη</Label>
                <Input
                  id="fab-start"
                  type="date"
                  value={newPackage.start_date}
                  onChange={(e) => setNewPackage({ ...newPackage, start_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fab-end">Λήξη</Label>
                <Input
                  id="fab-end"
                  type="date"
                  value={newPackage.end_date}
                  onChange={(e) => setNewPackage({ ...newPackage, end_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button onClick={handleCreatePackage} className="w-full rounded-xl">
              Δημιουργία
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
