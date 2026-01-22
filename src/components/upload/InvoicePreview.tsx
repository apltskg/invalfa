import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Check, X, Sparkles } from "lucide-react";
import { ExtractedData, InvoiceCategory, Package } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";

interface InvoicePreviewProps {
  fileUrl?: string; // Optional
  fileName?: string; // Optional
  extractedData: ExtractedData | null;
  onSave: (data: {
    merchant: string;
    amount: number | null;
    date: string | null;
    category: InvoiceCategory;
    packageId: string | null;
  }) => void;
  onCancel: () => void;
  defaultPackageId?: string;
}

export function InvoicePreview({ fileUrl, fileName, extractedData, onSave, onCancel, defaultPackageId }: InvoicePreviewProps) {
  // ... state ... (keep as is) until render

  // ... (keep useEffect and handleSave) ...
  const [merchant, setMerchant] = useState(extractedData?.merchant || "");
  const [amount, setAmount] = useState(extractedData?.amount?.toString() || "");
  const [date, setDate] = useState(extractedData?.date || "");
  const [category, setCategory] = useState<InvoiceCategory>(extractedData?.category || "other");
  const [packageId, setPackageId] = useState<string | null>(defaultPackageId || null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [suggestedPackage, setSuggestedPackage] = useState<Package | null>(null);

  useEffect(() => {
    async function fetchPackages() {
      const { data } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (data) {
        setPackages(data as Package[]);

        if (defaultPackageId) {
          const defaultPkg = data.find((p: Package) => p.id === defaultPackageId);
          if (defaultPkg) {
            setSuggestedPackage(defaultPkg as Package);
          }
        } else if (extractedData?.merchant) {
          const merchantLower = extractedData.merchant.toLowerCase();
          const match = data.find((pkg: Package) =>
            merchantLower.includes(pkg.client_name.toLowerCase()) ||
            pkg.client_name.toLowerCase().includes(merchantLower.split(" ")[0])
          );
          if (match) {
            setSuggestedPackage(match as Package);
            setPackageId(match.id);
          }
        }
      }
    }
    fetchPackages();
  }, [extractedData, defaultPackageId]);

  const handleSave = () => {
    onSave({
      merchant,
      amount: amount ? parseFloat(amount) : null,
      date: date || null,
      category,
      packageId
    });
  };

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-[80vh] max-h-[700px]"
    >
      {/* Left: File Preview (Only if file exists) */}
      {fileUrl && fileName && (
        <div className="flex-1 border-r border-border bg-muted/30 p-4">
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="truncate">{fileName}</span>
            </div>
            <div className="flex-1 overflow-hidden rounded-xl bg-background">
              {fileName.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  className="h-full w-full rounded-xl"
                  title="Invoice Preview"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt="Invoice"
                  className="h-full w-full object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Right: Edit Form (Full width if no file) */}
      <div className={`${fileUrl ? "w-96" : "w-full max-w-2xl mx-auto"} flex flex-col`}>
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Αναγνωρισμένα Στοιχεία</h3>
          </div>
          {extractedData?.confidence && (
            <p className="mt-1 text-sm text-muted-foreground">
              Ακρίβεια AI: {Math.round(extractedData.confidence * 100)}%
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="merchant">Έμπορος / Εκδότης</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="π.χ. Aegean Airlines"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Ποσό (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Ημερομηνία</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Κατηγορία</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InvoiceCategory)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="airline">✈️ Αεροπορικά</SelectItem>
                <SelectItem value="hotel">🏨 Διαμονή</SelectItem>
                <SelectItem value="tolls">🛣️ Διόδια/Μεταφορικά</SelectItem>
                <SelectItem value="other">📄 Άλλα</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="package">Σύνδεση με Φάκελο</Label>
            {suggestedPackage && (
              <p className="text-xs text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {defaultPackageId ? "Τρέχων φάκελος" : "Προτεινόμενο"}: {suggestedPackage.client_name}
              </p>
            )}
            <Select value={packageId || "none"} onValueChange={(v) => setPackageId(v === "none" ? null : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Επιλογή φακέλου" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Κανένας φάκελος</SelectItem>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-border p-6 flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1 rounded-xl">
            <X className="h-4 w-4 mr-2" />
            Άκυρο
          </Button>
          <Button onClick={handleSave} className="flex-1 rounded-xl">
            <Check className="h-4 w-4 mr-2" />
            Αποθήκευση
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
