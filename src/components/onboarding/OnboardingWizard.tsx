import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Package, Upload, Building2, CheckCircle2, ChevronRight, ChevronLeft,
  Sparkles, FileText, CreditCard, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { id: "welcome", icon: Sparkles, label: "Καλωσόρισμα" },
  { id: "package", icon: Package, label: "Φάκελος" },
  { id: "next-steps", icon: CheckCircle2, label: "Επόμενα Βήματα" },
];

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Package form
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createdPackageId, setCreatedPackageId] = useState<string | null>(null);

  const canCreatePackage = clientName.trim() && startDate && endDate;

  const handleCreatePackage = async () => {
    if (!canCreatePackage) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("packages")
        .insert({
          client_name: clientName.trim(),
          start_date: startDate,
          end_date: endDate,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      setCreatedPackageId(data.id);
      toast.success("Ο φάκελος δημιουργήθηκε!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Σφάλμα δημιουργίας");
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("traveldocs_onboarded", "true");
    onComplete();
  };

  const handleGoToPackage = () => {
    localStorage.setItem("traveldocs_onboarded", "true");
    if (createdPackageId) {
      navigate(`/packages/${createdPackageId}`);
    } else {
      navigate("/packages");
    }
  };

  const handleSkip = () => {
    localStorage.setItem("traveldocs_onboarded", "true");
    onComplete();
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step && "bg-primary text-primary-foreground",
                i === step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                i > step && "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 w-8 rounded-full transition-all", i < step ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-lg"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Καλωσήρθατε στο TravelDocs!
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Θα σας βοηθήσουμε να ρυθμίσετε τα πάντα σε 2 λεπτά.
              Ξεκινήστε δημιουργώντας τον πρώτο σας φάκελο ταξιδιού.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: Package, title: "Φάκελοι", desc: "Οργανώστε ανά ταξίδι" },
                { icon: FileText, title: "Παραστατικά", desc: "PDF/JPG → AI αναγνώριση" },
                { icon: CreditCard, title: "Τράπεζα", desc: "CSV import & matching" },
              ].map((feature) => (
                <Card key={feature.title} className="p-4 rounded-2xl border-border/50 text-left">
                  <feature.icon className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="ghost" onClick={handleSkip} className="rounded-xl text-muted-foreground">
                Παράλειψη
              </Button>
              <Button onClick={() => setStep(1)} className="rounded-xl gap-2">
                Ας ξεκινήσουμε <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Create first package */}
        {step === 1 && (
          <motion.div
            key="package"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Δημιουργία πρώτου φακέλου</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ένας φάκελος = ένα γκρουπ/ταξίδι. Ομαδοποιεί έξοδα & κινήσεις.
              </p>
            </div>

            <Card className="p-6 rounded-2xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName" className="text-sm font-medium">
                  Όνομα πελάτη / ταξιδιού *
                </Label>
                <Input
                  id="clientName"
                  placeholder="π.χ. Γκρουπ Παρίσι – Ιούνιος 2025"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">Από *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">Έως *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between mt-6">
              <Button variant="ghost" onClick={() => setStep(0)} className="rounded-xl gap-1">
                <ChevronLeft className="h-4 w-4" /> Πίσω
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleSkip} className="rounded-xl text-muted-foreground">
                  Παράλειψη
                </Button>
                <Button
                  onClick={handleCreatePackage}
                  disabled={!canCreatePackage || saving}
                  className="rounded-xl gap-2"
                >
                  {saving ? "Δημιουργία..." : "Δημιουργία"} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Next steps */}
        {step === 2 && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-lg"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Ο πρώτος φάκελος είναι έτοιμος!
            </h2>
            <p className="text-muted-foreground mb-8">
              Τώρα μπορείτε να ανεβάσετε παραστατικά, να εισάγετε extrait τράπεζας,
              ή να εξερευνήσετε το dashboard.
            </p>

            <div className="space-y-3 max-w-sm mx-auto mb-8">
              {[
                { icon: Upload, label: "Ανεβάστε το πρώτο παραστατικό", action: handleGoToPackage },
                { icon: Building2, label: "Εισαγωγή extrait τράπεζας", action: () => { handleFinish(); navigate("/bank-sync"); } },
                { icon: FileText, label: "Εισαγωγή λίστας παραστατικών", action: () => { handleFinish(); navigate("/invoice-list"); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            <Button variant="outline" onClick={handleFinish} className="rounded-xl">
              Πήγαινε στο Dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
