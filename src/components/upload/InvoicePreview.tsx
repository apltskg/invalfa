import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Check, X, Sparkles, ChevronsUpDown, Search } from "lucide-react";
import { ExtractedData, InvoiceCategory, Package, Customer, Supplier } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InvoicePreviewProps {
  fileUrl?: string;
  fileName?: string;
  extractedData: ExtractedData | null;
  onSave: (data: {
    merchant: string;
    amount: number | null;
    date: string | null;
    category: InvoiceCategory;
    expenseCategoryId?: string | null;
    incomeCategoryId?: string | null;
    packageId: string | null;
    customerId?: string | null;
    supplierId?: string | null;
  }) => void;
  onCancel: () => void;
  defaultPackageId?: string;
  packageId?: string;
  isManual?: boolean;
  type?: "income" | "expense";
}

export function InvoicePreview({ fileUrl, fileName, extractedData, onSave, onCancel, defaultPackageId, packageId: propPackageId, isManual, type = "expense" }: InvoicePreviewProps) {
  const [merchant, setMerchant] = useState(extractedData?.merchant || "");
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [amount, setAmount] = useState(extractedData?.amount?.toString() || "");
  const [date, setDate] = useState(extractedData?.date || "");
  const [category, setCategory] = useState<InvoiceCategory>(extractedData?.category || "other");
  const [expenseCategoryId, setExpenseCategoryId] = useState<string | null>(null);
  const [incomeCategoryId, setIncomeCategoryId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState((extractedData as any)?.invoice_number || "");
  const [taxId, setTaxId] = useState((extractedData as any)?.tax_id || "");
  const [packageId, setPackageId] = useState<string | null>(propPackageId || defaultPackageId || null);

  const [packages, setPackages] = useState<Package[]>([]);
  const [suggestedPackage, setSuggestedPackage] = useState<Package | null>(null);

  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string; name_el: string }[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<{ id: string; name_el: string; color: string | null; icon: string | null }[]>([]);


  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  // Fetch data (Packages + Entities)
  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Packages
      const { data: pkgData } = await supabase
        .from("packages")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (pkgData) {
        setPackages(pkgData as Package[]);

        // Suggest Package logic
        const effectivePackageId = propPackageId || defaultPackageId;
        if (effectivePackageId) {
          const defaultPkg = pkgData.find((p: Package) => p.id === effectivePackageId);
          if (defaultPkg) setSuggestedPackage(defaultPkg as Package);
        } else if (extractedData?.merchant) {
          const merchantLower = extractedData.merchant.toLowerCase();
          const match = pkgData.find((pkg: Package) =>
            merchantLower.includes(pkg.client_name.toLowerCase()) ||
            pkg.client_name.toLowerCase().includes(merchantLower.split(" ")[0])
          );
          if (match) {
            setSuggestedPackage(match as Package);
            setPackageId(match.id);
          }
        }
      }

      // 2. Fetch Customers OR Suppliers based on type + auto-match by ΑΦΜ
      // For INCOME: the customer is the BUYER → use buyer_vat
      // For EXPENSE: the supplier is the SELLER → use tax_id
      const extractedVat = type === "income"
        ? ((extractedData as any)?.buyer_vat || null)
        : ((extractedData as any)?.tax_id || null);
      const extractedMerchant = type === "income"
        ? ((extractedData as any)?.buyer_name || extractedData?.merchant || null)
        : (extractedData?.merchant || null);

      // Validate Greek VAT: exactly 9 digits
      const isValidGreekVat = (vat: string | null) => vat && /^\d{9}$/.test(vat.replace(/\s/g, ''));
      const cleanVat = extractedVat?.replace(/\s/g, '') || null;
      const vatIsValid = isValidGreekVat(cleanVat);

      if (type === "income") {
        const { data: custData } = await supabase.from("customers").select("*").order("name");
        if (custData) {
          setCustomers(custData as Customer[]);
          // Priority: match by ΑΦΜ first, then by name
          if (vatIsValid || extractedMerchant) {
            let match = vatIsValid
              ? custData.find(c => c.vat_number === cleanVat)
              : null;
            if (!match && extractedMerchant) {
              match = custData.find(c =>
                c.name.toLowerCase().includes(extractedMerchant.toLowerCase()) ||
                extractedMerchant.toLowerCase().includes(c.name.toLowerCase())
              ) || null;
            }
            if (match) {
              setSelectedEntityId(match.id);
              setMerchant(match.name);
            } else if (vatIsValid && extractedMerchant) {
              // Double-check no customer exists with this VAT before creating
              const { data: existingByVat } = await supabase
                .from("customers")
                .select("id, name")
                .eq("vat_number", cleanVat!)
                .maybeSingle();
              if (existingByVat) {
                setSelectedEntityId(existingByVat.id);
                setMerchant(existingByVat.name);
              } else {
                // Auto-create new customer with validated ΑΦΜ
                try {
                  const { data: newCust, error } = await supabase
                    .from("customers")
                    .insert({ name: extractedMerchant.trim(), vat_number: cleanVat })
                    .select()
                    .single();
                  if (!error && newCust) {
                    setCustomers(prev => [...prev, newCust as Customer]);
                    setSelectedEntityId(newCust.id);
                    setMerchant(newCust.name);
                  }
                } catch (e) { console.error("Auto-create customer failed:", e); }
              }
            }
          }
        }
      } else {
        const { data: suppData } = await supabase.from("suppliers").select("*").order("name");
        if (suppData) {
          setSuppliers(suppData as Supplier[]);
          // Priority: match by ΑΦΜ first, then by name
          if (extractedVat || extractedMerchant) {
            let match = extractedVat
              ? suppData.find((s: any) => s.vat_number === extractedVat || s.tax_id === extractedVat)
              : null;
            if (!match && extractedMerchant) {
              match = suppData.find(s =>
                s.name.toLowerCase().includes(extractedMerchant.toLowerCase()) ||
                extractedMerchant.toLowerCase().includes(s.name.toLowerCase())
              ) || null;
            }
            if (match) {
              setSelectedEntityId(match.id);
              setMerchant(match.name);
            } else if (extractedVat && extractedMerchant) {
              // Auto-create new supplier with ΑΦΜ
              try {
                const { data: newSupp, error } = await supabase
                  .from("suppliers")
                  .insert({ name: extractedMerchant })
                  .select()
                  .single();
                if (!error && newSupp) {
                  setSuppliers(prev => [...prev, newSupp as Supplier]);
                  setSelectedEntityId(newSupp.id);
                  setMerchant(newSupp.name);
                }
              } catch (e) { console.error("Auto-create supplier failed:", e); }
            }
          }
        }
      }

      // 3. Fetch categories based on type + auto-match AI category
      if (type === "expense") {
        const { data: catData } = await (supabase as any).from('expense_categories').select('id,name,name_el').order('sort_order');
        if (catData && catData.length > 0) {
          setExpenseCategories(catData as any);

          // Fallback to default/first category
          let matchedId = catData[0].id;

          const aiCategory = extractedData?.category || "other";
          const searchKeywords = [
            aiCategory.toLowerCase(),
            extractedMerchant?.toLowerCase() || ""
          ].filter(Boolean);

          const CATEGORY_TO_NAME: Record<string, string[]> = {
            airline: ["airline", "αεροπορικά", "flights"],
            hotel: ["hotel", "ξενοδοχεία", "hotels", "διαμονή"],
            tolls: ["tolls", "διόδια", "olympia", "attiki", "gefyra"],
            fuel: ["fuel", "καύσιμα", "πετρέλαιο", "βενζίνη", "shell", "eko", "bp"],
            transport: ["transport", "μεταφορές", "passenger", "ktel", "ferries", "taxi"],
            payroll: ["payroll", "μισθοδοσία", "εφκα"],
            government: ["government", "δημόσιο", "tax", "εφορία", "φπα"],
            rent: ["rent", "ενοίκια", "fixed", "μίσθωμα"],
            telecom: ["telecom", "τηλεπικοινωνίες", "cosmote", "vodafone", "nova"],
            insurance: ["insurance", "ασφάλεια", "ασφάλιστρα"],
            office: ["office", "γραφική", "supplies", "plaisio", "public"],
            maintenance: ["maintenance", "συντήρηση", "επισκευές"],
            marketing: ["marketing", "διαφήμιση", "εκτυπώσεις"],
            other: ["other", "λοιπά", "διάφορα"],
          };

          const mappedKws = CATEGORY_TO_NAME[aiCategory] || [];
          const allKeywords = [...mappedKws, ...searchKeywords];

          const matchedCat = catData.find((c: any) =>
            allKeywords.some(kw =>
              kw.length > 3 && (
                c.name?.toLowerCase().includes(kw) ||
                c.name_el?.toLowerCase().includes(kw) ||
                kw.includes(c.name?.toLowerCase()) ||
                kw.includes(c.name_el?.toLowerCase())
              )
            )
          );

          if (matchedCat) {
            matchedId = (matchedCat as any).id;
          }
          setExpenseCategoryId(matchedId);
        }
      } else if (type === "income") {
        const { data: catData } = await (supabase as any).from('income_categories').select('id,name,name_el,color,icon').order('sort_order');
        if (catData && catData.length > 0) {
          setIncomeCategories(catData as any);

          // Default to first category
          let matchedId = catData[0].id;

          // Attempt basic keyword matching based on merchant or category
          const aiCategory = extractedData?.category || "";
          const searchKeywords = [
            aiCategory.toLowerCase(),
            extractedMerchant?.toLowerCase() || ""
          ].filter(Boolean);

          const matchedCat = catData.find((c: any) =>
            searchKeywords.some(kw =>
              kw.length > 3 && (
                c.name?.toLowerCase().includes(kw) ||
                c.name_el?.toLowerCase().includes(kw) ||
                kw.includes(c.name?.toLowerCase()) ||
                kw.includes(c.name_el?.toLowerCase())
              )
            )
          );

          if (matchedCat) {
            matchedId = (matchedCat as any).id;
          }
          setIncomeCategoryId(matchedId);
        }
      }
    }
    fetchData();
  }, [extractedData, defaultPackageId, propPackageId, type]);

  const handleSave = () => {
    onSave({
      merchant,
      amount: amount ? parseFloat(amount) : null,
      date: date || null,
      category,
      expenseCategoryId: type === "expense" ? expenseCategoryId : null,
      incomeCategoryId: type === "income" ? incomeCategoryId : null,
      packageId,
      customerId: type === "income" ? selectedEntityId : null,
      supplierId: type === "expense" ? selectedEntityId : null,
    });
  };

  const entities = type === "income" ? customers : suppliers;



  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-[80vh] max-h-[700px]"
    >
      {/* Left: File Preview (Only if file exists) */}
      {fileUrl && fileName && !isManual && (
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
      <div className={`${fileUrl && !isManual ? "w-96" : "w-full max-w-2xl mx-auto"} flex flex-col`}>
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{isManual ? "Χειροκίνητη Καταχώρηση" : "Αναγνωρισμένα Στοιχεία"}</h3>
          </div>
          {extractedData?.confidence && !isManual && (
            <p className="mt-1 text-sm text-muted-foreground">
              Ακρίβεια AI: {Math.round(extractedData.confidence * 100)}%
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="merchant">{type === "income" ? "Πελάτης" : "Προμηθευτής / Έμπορος"}</Label>
            <div className="flex gap-2">
              {/* Hybrid Input: Type manually OR select from Combobox */}
              <div className="relative flex-1">
                <Input
                  id="merchant"
                  value={merchant}
                  onChange={(e) => {
                    setMerchant(e.target.value);
                    // If typing manually, clear the ID unless it matches perfectly (optional, strictly clearing is safer)
                    if (selectedEntityId) setSelectedEntityId(null);
                  }}
                  placeholder={type === "income" ? "Select or type Customer..." : "Select or type Supplier..."}
                  className="rounded-xl pr-10"
                />
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]" align="start">
                    <Command>
                      <CommandInput placeholder={`Search ${type === "income" ? "customers" : "suppliers"}...`} />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {entities.map((entity) => (
                            <CommandItem
                              key={entity.id}
                              value={entity.name}
                              onSelect={(currentValue) => {
                                setMerchant(currentValue);
                                setSelectedEntityId(entity.id);
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEntityId === entity.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {entity.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
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
            <Label>Κατηγορία</Label>
            {type === 'expense' && expenseCategories.length > 0 ? (
              // ── Expense: dynamic expense_categories ──
              <Select
                value={expenseCategoryId || ""}
                onValueChange={(val) => { setExpenseCategoryId(val); setCategory('other'); }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Επιλογή κατηγορίας..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_el || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === 'income' && incomeCategories.length > 0 ? (
              // ── Income: dynamic income_categories ──
              <Select
                value={incomeCategoryId || ""}
                onValueChange={(val) => setIncomeCategoryId(val)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Επιλογή κατηγορίας εσόδου..." />
                </SelectTrigger>
                <SelectContent>
                  {incomeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name_el}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // ── Fallback: legacy enum (expense only) ──
              <Select value={category} onValueChange={(val) => setCategory(val as InvoiceCategory)}>
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
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="package">Σύνδεση με Φάκελο</Label>
            {suggestedPackage && (
              <p className="text-xs text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {propPackageId || defaultPackageId ? "Τρέχων φάκελος" : "Προτεινόμενο"}: {suggestedPackage.client_name}
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
