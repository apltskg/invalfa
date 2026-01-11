import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Languages, Printer, Send, Percent, X, Plus, Phone, Mail, Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/integrations/supabase/types";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import alfaLogo from "@/assets/alfa-logo.jpg";

// Company details (fixed)
const COMPANY_INFO = {
  name: "ALFA MONOPROSOPI I.K.E.",
  address: "Thesi Filakio, Leptokarya, Pieria, Greece, 60063",
  phone: "+30 694 207 2312",
  email: "info@atravel.gr",
  website: "www.atravel.gr",
  social: "@atravel.gr",
  vat: "EL801915410",
  iata: "96174713",
  license: "EU-Travel Agency License",
  stampName: "ALFA M.I.K.E.",
  stampDetails: "ΓΡΑΦΕΙΟ ΓΕΝΙΚΟΥ ΤΟΥΡΙΣΜΟΥ\n60063 ΛΕΠΤΟΚΑΡΥΑ ΠΙΕΡΙΑΣ\nΑΦΜ 801915410 ΔΟΥ ΚΑΤΕΡΙΝΗΣ",
  ceo: "Alexandros Papadopoulos",
};

const BANK_ACCOUNTS = [
  {
    bank: "Eurobank",
    accountName: "ALFA MONOPROSOPI I.K.E.",
    iban: "GR3602607330008902011511103",
    bic: "ERBKGRAA",
  },
  {
    bank: "ALPHA Bank",
    accountName: "ALFA",
    iban: "GR7201407070707002002020365",
    bic: "CRBAGRAA",
  },
  {
    bank: "International (Wise)",
    iban: "BE24 9050 7266 5838",
    swift: "TRWIBEB1XXX",
    bankAddress: "Wise, Rue du Trône 100, Brussels 1050, Belgium",
  },
];

const TERMS_CONDITIONS = {
  en: [
    "Please note that this booking is not yet confirmed. It will be finalized only after full payment has been received.",
    "Due to high demand, availability cannot be guaranteed until the payment is completed.",
    "In case of cancellation less than 3 days prior to the scheduled date, a 10% fee will be retained.",
  ],
  el: [
    "Σημειώστε ότι αυτή η κράτηση δεν έχει ακόμη επιβεβαιωθεί. Θα οριστικοποιηθεί μόνο μετά την ολική πληρωμή.",
    "Λόγω υψηλής ζήτησης, η διαθεσιμότητα δεν μπορεί να εγγυηθεί μέχρι να ολοκληρωθεί η πληρωμή.",
    "Σε περίπτωση ακύρωσης λιγότερο από 3 ημέρες πριν την προγραμματισμένη ημερομηνία, θα παρακρατηθεί τέλος 10%.",
  ],
};

interface LineItem {
  id: string;
  description: string;
  price: number;
  taxPercent: number;
  total: number;
}

interface ProformaData {
  invoiceNumber: string;
  issueDate: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientVatNumber: string;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  acceptCash: boolean;
  acceptBankTransfer: boolean;
  notes: string;
}

type Language = "en" | "el";

const translations = {
  en: {
    title: "Proforma Invoice",
    proformaInvoice: "PROFORMA INVOICE",
    invoiceNumber: "Invoice number",
    issueDate: "Issue date",
    invoiceTo: "Invoice To:",
    payTo: "Pay To:",
    name: "Name",
    clientPlaceholder: "Client or Company Name",
    address: "Address",
    addressPlaceholder: "Street, City, State, ZIP",
    email: "Email",
    emailPlaceholder: "client@example.com",
    vatNumber: "VAT Number (Optional)",
    vatPlaceholder: "VAT Number",
    serviceDescription: "Service Description",
    servicePlaceholder: "Service description",
    price: "Price",
    tax: "Tax (%)",
    total: "Total",
    addService: "+ Add Service",
    termsConditions: "Terms & Conditions:",
    addNotes: "+ Add Notes",
    subtotal: "Subtotal:",
    addDiscount: "Add Discount",
    taxAmount: "Tax Amount",
    waysToPay: "Ways to Pay:",
    cash: "Cash",
    bankTransfer: "Bank Transfer",
    sendConfirmation: "Please send the payment confirmation to:",
    accountName: "Account Name",
    services: "AIR TICKETS | BUS TRANSFERS | ACCOMMODATIONS - all over the world",
    contact: "Have a question? Contact us:",
    thanks: "Thank you for traveling with us, see you soon!",
    print: "Print",
    send: "Send",
    ceo: "CEO",
    save: "Save",
    bankTransferTitle: "Bank Transfer:",
  },
  el: {
    title: "Προτιμολόγιο",
    proformaInvoice: "ΠΡΟΤΙΜΟΛΟΓΙΟ",
    invoiceNumber: "Αριθμός τιμολογίου",
    issueDate: "Ημερομηνία έκδοσης",
    invoiceTo: "Προς:",
    payTo: "Πληρωμή σε:",
    name: "Όνομα",
    clientPlaceholder: "Όνομα πελάτη ή εταιρείας",
    address: "Διεύθυνση",
    addressPlaceholder: "Οδός, Πόλη, Νομός, Τ.Κ.",
    email: "Email",
    emailPlaceholder: "client@example.com",
    vatNumber: "ΑΦΜ (Προαιρετικό)",
    vatPlaceholder: "ΑΦΜ",
    serviceDescription: "Περιγραφή Υπηρεσίας",
    servicePlaceholder: "Περιγραφή υπηρεσίας",
    price: "Τιμή",
    tax: "ΦΠΑ (%)",
    total: "Σύνολο",
    addService: "+ Προσθήκη Υπηρεσίας",
    termsConditions: "Όροι & Προϋποθέσεις:",
    addNotes: "+ Προσθήκη Σημειώσεων",
    subtotal: "Υποσύνολο:",
    addDiscount: "Προσθήκη Έκπτωσης",
    taxAmount: "Ποσό ΦΠΑ",
    waysToPay: "Τρόποι Πληρωμής:",
    cash: "Μετρητά",
    bankTransfer: "Τραπεζική Μεταφορά",
    sendConfirmation: "Παρακαλώ στείλτε την επιβεβαίωση πληρωμής στο:",
    accountName: "Όνομα Λογαριασμού",
    services: "ΑΕΡΟΠΟΡΙΚΑ | ΜΕΤΑΦΟΡΕΣ | ΔΙΑΜΟΝΗ - σε όλο τον κόσμο",
    contact: "Έχετε απορία; Επικοινωνήστε μαζί μας:",
    thanks: "Ευχαριστούμε που ταξιδεύετε μαζί μας, τα λέμε σύντομα!",
    print: "Εκτύπωση",
    send: "Αποστολή",
    ceo: "Διευθύνων Σύμβουλος",
    save: "Αποθήκευση",
    bankTransferTitle: "Τραπεζική Μεταφορά:",
  },
};

export default function ProformaInvoice() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("en");
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const t = translations[language];

  const generateInvoiceNumber = () => {
    const now = new Date();
    const seq = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
    return `INV-${seq}`;
  };

  const [data, setData] = useState<ProformaData>({
    invoiceNumber: generateInvoiceNumber(),
    issueDate: format(new Date(), "yyyy-MM-dd"),
    clientName: "",
    clientAddress: "",
    clientEmail: "",
    clientVatNumber: "",
    lineItems: [
      { id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13, total: 0 },
    ],
    subtotal: 0,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 13,
    taxAmount: 0,
    total: 0,
    acceptCash: true,
    acceptBankTransfer: true,
    notes: "",
  });

  useEffect(() => {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = (subtotal * data.discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = data.lineItems.reduce(
      (sum, item) => sum + ((item.price * (1 - data.discountPercent / 100)) * item.taxPercent) / 100,
      0
    );
    const total = afterDiscount + taxAmount;

    setData((prev) => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount,
      total,
      lineItems: prev.lineItems.map((item) => ({
        ...item,
        total: item.price + (item.price * item.taxPercent) / 100,
      })),
    }));
  }, [data.lineItems, data.discountPercent]);

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addLineItem = () => {
    setData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13, total: 0 },
      ],
    }));
  };

  const removeLineItem = (id: string) => {
    if (data.lineItems.length > 1) {
      setData((prev) => ({
        ...prev,
        lineItems: prev.lineItems.filter((item) => item.id !== id),
      }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const insertData = {
        invoice_number: data.invoiceNumber,
        issue_date: data.issueDate,
        client_name: data.clientName || null,
        client_address: data.clientAddress || null,
        client_email: data.clientEmail || null,
        client_vat_number: data.clientVatNumber || null,
        line_items: data.lineItems as unknown as Json,
        subtotal: data.subtotal,
        discount_percent: data.discountPercent,
        discount_amount: data.discountAmount,
        tax_percent: data.taxPercent,
        tax_amount: data.taxAmount,
        total: data.total,
        accept_cash: data.acceptCash,
        accept_bank_transfer: data.acceptBankTransfer,
        notes: data.notes || null,
      };

      const { error } = await supabase.from("proforma_invoices").insert([insertData]);
      if (error) throw error;

      toast({
        title: "Saved!",
        description: `Proforma ${data.invoiceNumber} saved successfully.`,
      });

      setData((prev) => ({
        ...prev,
        invoiceNumber: generateInvoiceNumber(),
        clientName: "",
        clientAddress: "",
        clientEmail: "",
        clientVatNumber: "",
        lineItems: [{ id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13, total: 0 }],
        notes: "",
        discountPercent: 0,
      }));
      setShowDiscountInput(false);
      setShowNotesInput(false);
    } catch (error) {
      console.error("Error saving proforma:", error);
      toast({
        title: "Error",
        description: "Failed to save proforma invoice.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = () => {
    if (!data.clientEmail) {
      toast({
        title: "Missing Email",
        description: "Please enter a client email address first.",
        variant: "destructive",
      });
      return;
    }
    setSendDialogOpen(true);
  };

  const confirmSend = () => {
    toast({
      title: "Email Sent",
      description: `Proforma invoice sent to ${data.clientEmail}`,
    });
    setSendDialogOpen(false);
    handleSave();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky Header Actions */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "el" : "en")}
              className="h-9 px-3 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Languages className="h-4 w-4 mr-1.5" />
              <span className="font-medium">{language === "en" ? "EN" : "EL"}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t.print}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSend}
              className="h-9 px-3 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50"
            >
              <Send className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t.send}</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 px-4 bg-primary hover:bg-primary/90"
            >
              {isSaving ? "..." : t.save}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        <div
          ref={printRef}
          className="bg-white rounded-2xl shadow-lg border border-border/50 overflow-hidden print:shadow-none print:border-none print:rounded-none"
        >
          {/* Invoice Header */}
          <div className="p-6 sm:p-8 pb-0">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
              {/* Logo */}
              <div className="flex-shrink-0">
                <img
                  src={alfaLogo}
                  alt="ALFA Travel"
                  className="h-14 sm:h-16 w-auto object-contain"
                />
              </div>

              {/* Invoice Meta */}
              <div className="text-right sm:text-right w-full sm:w-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight mb-4">
                  {t.proformaInvoice}
                </h2>
                <div className="inline-grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground text-right">{t.invoiceNumber}</span>
                  <span className="font-semibold text-left">{data.invoiceNumber}</span>
                  <span className="text-muted-foreground text-right">{t.issueDate}</span>
                  <span className="font-semibold text-left">
                    {format(new Date(data.issueDate), "dd MMMM yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Client & Company Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
              {/* Invoice To */}
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  {t.invoiceTo}
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t.name}</Label>
                    <Input
                      value={data.clientName}
                      onChange={(e) => setData({ ...data, clientName: e.target.value })}
                      placeholder={t.clientPlaceholder}
                      className="mt-1 h-10 border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t.address}</Label>
                    <Textarea
                      value={data.clientAddress}
                      onChange={(e) => setData({ ...data, clientAddress: e.target.value })}
                      placeholder={t.addressPlaceholder}
                      className="mt-1 min-h-[72px] resize-none border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t.email}</Label>
                    <Input
                      type="email"
                      value={data.clientEmail}
                      onChange={(e) => setData({ ...data, clientEmail: e.target.value })}
                      placeholder={t.emailPlaceholder}
                      className="mt-1 h-10 border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">{t.vatNumber}</Label>
                    <Input
                      value={data.clientVatNumber}
                      onChange={(e) => setData({ ...data, clientVatNumber: e.target.value })}
                      placeholder={t.vatPlaceholder}
                      className="mt-1 h-10 border-muted-foreground/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Pay To */}
              <div className="md:text-right">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  {t.payTo}
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p className="font-semibold text-foreground">{COMPANY_INFO.name}</p>
                  <p className="text-muted-foreground">{COMPANY_INFO.address}</p>
                  <p className="text-muted-foreground">{COMPANY_INFO.phone}</p>
                  <p className="text-muted-foreground">{COMPANY_INFO.email}</p>
                  <p className="text-muted-foreground font-medium">VAT: {COMPANY_INFO.vat}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="px-6 sm:px-8">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_100px_70px_90px_36px] gap-3 py-3 border-y border-muted bg-muted/30 px-3 -mx-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>{t.serviceDescription}</span>
              <span className="text-right">{t.price}</span>
              <span className="text-right">{t.tax}</span>
              <span className="text-right">{t.total}</span>
              <span></span>
            </div>

            {/* Line Items */}
            <div className="divide-y divide-muted/50">
              {data.lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_100px_70px_90px_36px] gap-3 py-3 items-center"
                >
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                    placeholder={t.servicePlaceholder}
                    className="h-9 border-muted-foreground/20"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price || ""}
                    onChange={(e) =>
                      updateLineItem(item.id, "price", parseFloat(e.target.value) || 0)
                    }
                    className="h-9 text-right border-muted-foreground/20"
                    placeholder="0.00"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={item.taxPercent}
                    onChange={(e) =>
                      updateLineItem(item.id, "taxPercent", parseFloat(e.target.value) || 0)
                    }
                    className="h-9 text-right border-muted-foreground/20"
                  />
                  <div className="text-right font-medium text-foreground pr-1">
                    €{item.total.toFixed(2)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={data.lineItems.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="mt-3 mb-6 h-9 px-4 border-dashed hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t.addService}
            </Button>
          </div>

          {/* Terms & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 sm:px-8 py-6 bg-muted/20">
            {/* Terms */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">{t.termsConditions}</h4>
              <ol className="list-decimal list-outside ml-4 space-y-2 text-sm text-muted-foreground leading-relaxed">
                {TERMS_CONDITIONS[language].map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ol>

              {showNotesInput ? (
                <Textarea
                  value={data.notes}
                  onChange={(e) => setData({ ...data, notes: e.target.value })}
                  placeholder="Additional notes..."
                  className="mt-4 min-h-[80px] resize-none"
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotesInput(true)}
                  className="mt-3 h-8 px-3 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {t.addNotes}
                </Button>
              )}
            </div>

            {/* Totals */}
            <div className="bg-white rounded-xl p-5 border border-border/50 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="font-medium">€{data.subtotal.toFixed(2)}</span>
                </div>

                {showDiscountInput ? (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Discount</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={data.discountPercent || ""}
                        onChange={(e) =>
                          setData({ ...data, discountPercent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 h-8 text-right text-sm"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <span className="font-medium text-destructive">
                      -€{data.discountAmount.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDiscountInput(true)}
                    className="h-8 px-3 text-xs"
                  >
                    <Percent className="h-3 w-3 mr-1.5" />
                    {t.addDiscount}
                  </Button>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.taxAmount} ({data.lineItems[0]?.taxPercent || 13}%):
                  </span>
                  <span className="font-medium">€{data.taxAmount.toFixed(2)}</span>
                </div>

                <div className="h-px bg-border my-2" />

                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-semibold">{t.total}:</span>
                  <span className="text-2xl font-bold text-primary">€{data.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Stamp & Signature */}
              <div className="mt-6 pt-5 border-t border-dashed border-muted-foreground/30 flex justify-between items-end gap-4">
                <div className="text-[10px] text-muted-foreground leading-tight">
                  <p className="font-bold text-foreground text-xs">{COMPANY_INFO.stampName}</p>
                  <p className="whitespace-pre-line mt-0.5">{COMPANY_INFO.stampDetails}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold text-primary/80 font-serif italic">AP</div>
                  <p className="text-xs font-medium text-foreground">{COMPANY_INFO.ceo}</p>
                  <p className="text-[10px] text-muted-foreground">{t.ceo}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="px-6 sm:px-8 py-6 border-t border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3">{t.waysToPay}</h4>
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="cash"
                  checked={data.acceptCash}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptCash: checked as boolean })
                  }
                />
                <span className="text-sm">{t.cash}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id="bank"
                  checked={data.acceptBankTransfer}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptBankTransfer: checked as boolean })
                  }
                />
                <span className="text-sm">{t.bankTransfer}</span>
              </label>
            </div>

            {data.acceptBankTransfer && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {t.sendConfirmation}{" "}
                  <a href={`mailto:${COMPANY_INFO.email}`} className="text-primary font-medium hover:underline">
                    {COMPANY_INFO.email}
                  </a>
                </p>

                <h5 className="text-sm font-semibold text-foreground mb-3">{t.bankTransferTitle}</h5>
                <div className="grid gap-3 sm:grid-cols-3">
                  {BANK_ACCOUNTS.map((account, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-lg border border-border/70 bg-muted/20 text-sm"
                    >
                      <h6 className="font-semibold text-primary mb-2">{account.bank}</h6>
                      {account.accountName && (
                        <p className="text-muted-foreground">
                          <span className="text-foreground">Account Name:</span> {account.accountName}
                        </p>
                      )}
                      <p className="text-muted-foreground break-all">
                        <span className="text-foreground">IBAN:</span> {account.iban}
                      </p>
                      {account.bic && (
                        <p className="text-muted-foreground">
                          <span className="text-foreground">BIC:</span> {account.bic}
                        </p>
                      )}
                      {account.swift && (
                        <p className="text-muted-foreground">
                          <span className="text-foreground">SWIFT:</span> {account.swift}
                        </p>
                      )}
                      {account.bankAddress && (
                        <p className="text-muted-foreground text-xs mt-1">{account.bankAddress}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-b from-muted/30 to-muted/50 px-6 sm:px-8 py-8 text-center">
            <img
              src={alfaLogo}
              alt="ALFA Travel"
              className="h-10 w-auto mx-auto mb-4 opacity-90"
            />
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-4">
              {t.services}
            </p>

            <div className="mb-4">
              <p className="text-sm font-medium text-foreground mb-2">{t.contact}</p>
              <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {COMPANY_INFO.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {COMPANY_INFO.email}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {COMPANY_INFO.website}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                IATA TIDS Agency: {COMPANY_INFO.iata} | {COMPANY_INFO.license}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-4" />

            <p className="text-sm font-medium text-primary">{t.thanks}</p>
          </div>
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Proforma Invoice</DialogTitle>
            <DialogDescription>
              Send this proforma invoice to <span className="font-medium">{data.clientEmail}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSend} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}