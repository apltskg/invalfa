import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Plus, Trash2, Languages, Printer, Send, Percent, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/integrations/supabase/types";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Company details (fixed)
// Company details
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
  logoUrl: "https://atravel.gr/wp-content/uploads/2023/07/Alfa-Logo-Horizontal-Retina.png",
  iconUrl: "https://atravel.gr/wp-content/uploads/2023/07/cropped-Icon-512.png"
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

const TERMS_CONDITIONS = [
  "Σημειώστε ότι αυτή η κράτηση δεν έχει επιβεβαιωθεί ακόμα. Θα οριστικοποιηθεί μόνο μετά την πλήρη εξόφληση.",
  "Λόγω υψηλής ζήτησης, η διαθεσιμότητα δεν μπορεί να εγγυηθεί μέχρι την ολοκλήρωση της πληρωμής.",
  "Σε περίπτωση ακύρωσης λιγότερο από 3 ημέρες πριν την προγραμματισμένη ημερομηνία, θα παρακρατηθεί τέλος 10%.",
];

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
    language: "Language",
    print: "Print",
    send: "Send",
    ceo: "CEO",
    save: "Save",
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
    language: "Γλώσσα",
    print: "Εκτύπωση",
    send: "Αποστολή",
    ceo: "Διευθύνων Σύμβουλος",
    save: "Αποθήκευση",
  },
};

export default function ProformaInvoice() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Language>("el");
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const t = translations[language];

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
    return `INV-${year}-${random}`;
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

  // Recalculate totals when line items or discount change
  useEffect(() => {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.price, 0);
    const discountAmount = (subtotal * data.discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = data.lineItems.reduce(
      (sum, item) => sum + (item.price * item.taxPercent) / 100,
      0
    );
    const discountedTax = taxAmount * (1 - data.discountPercent / 100);
    const total = afterDiscount + discountedTax;

    setData((prev) => ({
      ...prev,
      subtotal,
      discountAmount,
      taxAmount: discountedTax,
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

      // Generate new invoice number for next one
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

  const confirmSend = async () => {
    setIsSending(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('send-proforma-email', {
        body: {
          invoiceNumber: data.invoiceNumber,
          issueDate: data.issueDate,
          clientName: data.clientName,
          clientAddress: data.clientAddress,
          clientEmail: data.clientEmail,
          clientVatNumber: data.clientVatNumber,
          lineItems: data.lineItems,
          subtotal: data.subtotal,
          discountPercent: data.discountPercent,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          total: data.total,
          acceptCash: data.acceptCash,
          acceptBankTransfer: data.acceptBankTransfer,
          notes: data.notes,
          language,
        },
      });

      if (error) throw error;

      if (response?.error) {
        if (response.code === 'MISSING_API_KEY') {
          toast({
            title: "Email Service Not Configured",
            description: "Please add the RESEND_API_KEY to enable email sending.",
            variant: "destructive",
          });
        } else {
          throw new Error(response.error);
        }
        return;
      }

      toast({
        title: "Email Sent!",
        description: `Proforma invoice sent to ${data.clientEmail}`,
      });
      setSendDialogOpen(false);
      await handleSave();
    } catch (error) {
      console.error("Error sending email:", error);
      toast({
        title: "Failed to Send",
        description: error instanceof Error ? error.message : "Could not send email.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "el" : "en")}
              className="gap-2"
            >
              <Languages className="h-4 w-4" />
              {language === "en" ? "EN" : "EL"}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              {t.print}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSend} className="gap-2">
              <Send className="h-4 w-4" />
              {t.send}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? "Saving..." : t.save}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-5xl mx-auto p-8 print:p-0">
        <Card ref={printRef} className="p-12 print:shadow-none print:border-none shadow-sm border-gray-100 rounded-3xl bg-white/80 backdrop-blur-sm">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-12">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src={COMPANY_INFO.logoUrl}
                alt="Alfa Travel Logo"
                className="h-16 object-contain"
              />
            </div>

            {/* Invoice Info */}
            <div className="text-right">
              <h2 className="text-3xl font-light tracking-tight text-gray-900 mb-6 uppercase">
                {t.proformaInvoice}
              </h2>
              <div className="space-y-2 text-sm text-gray-500 font-medium">
                <div className="flex justify-end gap-8 border-b border-gray-100 pb-2">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">{t.invoiceNumber}</span>
                  <span className="text-gray-900">{data.invoiceNumber}</span>
                </div>
                <div className="flex justify-end gap-8 border-b border-gray-100 pb-2">
                  <span className="text-gray-400 uppercase tracking-wider text-xs">{t.issueDate}</span>
                  <span className="text-gray-900">
                    {format(new Date(data.issueDate), "dd MMMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Client & Company Info */}
          <div className="grid grid-cols-2 gap-16 mb-16">
            {/* Invoice To */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.invoiceTo}</h3>
              <div className="space-y-3">
                <Input
                  value={data.clientName}
                  onChange={(e) => setData({ ...data, clientName: e.target.value })}
                  placeholder={t.clientPlaceholder}
                  className="border-none shadow-none text-2xl font-semibold px-0 h-auto placeholder:text-gray-200 focus-visible:ring-0 rounded-none bg-transparent"
                />
                <Textarea
                  value={data.clientAddress}
                  onChange={(e) => setData({ ...data, clientAddress: e.target.value })}
                  placeholder={t.addressPlaceholder}
                  className="min-h-[60px] border-none shadow-none text-gray-500 px-0 resize-none focus-visible:ring-0 rounded-none bg-transparent p-0"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 uppercase w-12">Email</span>
                  <Input
                    type="email"
                    value={data.clientEmail}
                    onChange={(e) => setData({ ...data, clientEmail: e.target.value })}
                    placeholder={t.emailPlaceholder}
                    className="border-none shadow-none text-gray-600 px-0 h-8 focus-visible:ring-0 rounded-none bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 uppercase w-12 text-nowrap">{t.vatNumber}</span>
                  <Input
                    value={data.clientVatNumber}
                    onChange={(e) => setData({ ...data, clientVatNumber: e.target.value })}
                    placeholder={t.vatPlaceholder}
                    className="border-none shadow-none text-gray-600 px-0 h-8 focus-visible:ring-0 rounded-none bg-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Pay To */}
            <div className="text-right">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.payTo}</h3>
              <div className="space-y-1 text-sm text-gray-600 leading-relaxed">
                <p className="font-semibold text-gray-900 text-lg mb-2">{COMPANY_INFO.name}</p>
                <p>{COMPANY_INFO.address}</p>
                <p>{COMPANY_INFO.phone}</p>
                <p className="text-primary">{COMPANY_INFO.email}</p>
                <p className="font-mono text-xs mt-2 text-gray-400">VAT: {COMPANY_INFO.vat}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-12">
            <div className="grid grid-cols-[1fr_120px_80px_100px_40px] gap-6 mb-4 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
              <span>{t.serviceDescription}</span>
              <span className="text-right">{t.price}</span>
              <span className="text-right">{t.tax}</span>
              <span className="text-right">{t.total}</span>
              <span></span>
            </div>

            {data.lineItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_120px_80px_100px_40px] gap-6 mb-2 items-center group"
              >
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                  placeholder={t.servicePlaceholder}
                  className="font-medium bg-transparent border-transparent focus-visible:border-primary/20 rounded-lg px-2"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price || ""}
                  onChange={(e) =>
                    updateLineItem(item.id, "price", parseFloat(e.target.value) || 0)
                  }
                  className="text-right bg-transparent border-transparent focus-visible:border-primary/20 rounded-lg px-2"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.taxPercent}
                  onChange={(e) =>
                    updateLineItem(item.id, "taxPercent", parseFloat(e.target.value) || 0)
                  }
                  className="text-right bg-transparent border-transparent focus-visible:border-primary/20 rounded-lg px-2 text-gray-500"
                />
                <div className="text-right font-semibold text-gray-900 px-2">
                  €{item.total.toFixed(2)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(item.id)}
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-destructive hover:bg-red-50"
                  disabled={data.lineItems.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="ghost" size="sm" onClick={addLineItem} className="mt-4 text-primary hover:text-primary hover:bg-primary/5 text-xs font-medium uppercase tracking-wider">
              {t.addService}
            </Button>
          </div>

          {/* Terms & Totals Row */}
          <div className="grid grid-cols-2 gap-16 mb-12">
            {/* Terms & Conditions */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">{t.termsConditions}</h4>
              <ul className="space-y-3 text-sm text-gray-500 list-disc list-outside pl-4 marker:text-gray-300">
                {TERMS_CONDITIONS.map((term, i) => (
                  <li key={i} className="leading-relaxed">{term}</li>
                ))}
              </ul>

              {showNotesInput ? (
                <div className="mt-6 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                  <h5 className="text-xs font-semibold uppercase tracking-widest text-yellow-600/70 mb-2">Notes</h5>
                  <Textarea
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="min-h-[80px] border-none bg-transparent shadow-none resize-none p-0 focus-visible:ring-0 text-gray-700"
                  />
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotesInput(true)}
                  className="mt-6 text-gray-400 hover:text-gray-600 text-xs uppercase tracking-wider pl-0"
                >
                  {t.addNotes}
                </Button>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-4 bg-gray-50/50 p-8 rounded-3xl">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t.subtotal}</span>
                <span className="font-medium">€{data.subtotal.toFixed(2)}</span>
              </div>

              {showDiscountInput ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <span>Discount:</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.discountPercent || ""}
                    onChange={(e) =>
                      setData({ ...data, discountPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-16 text-right h-6 px-1 py-0 text-sm border-emerald-200 bg-white"
                  />
                  <span>%</span>
                  <span className="ml-auto font-medium">
                    -€{data.discountAmount.toFixed(2)}
                  </span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiscountInput(true)}
                  className="h-6 px-0 text-emerald-600 hover:text-emerald-700 hover:bg-transparent text-xs"
                >
                  <Percent className="h-3 w-3 mr-1" />
                  {t.addDiscount}
                </Button>
              )}

              <div className="flex justify-between text-sm text-gray-500">
                <span>{t.taxAmount} ({data.lineItems[0]?.taxPercent || 13}%):</span>
                <span>€{data.taxAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-gray-200 my-4" />

              <div className="flex justify-between text-2xl font-light text-primary">
                <span>{t.total}</span>
                <span className="font-semibold">€{data.total.toFixed(2)}</span>
              </div>

              {/* Stamp & Signature */}
              <div className="mt-12 pt-8 flex justify-between items-end border-t border-dashed border-gray-300 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-50 px-2 text-[10px] text-gray-400 uppercase tracking-widest">Authorized Signature</div>
                <div className="text-xs text-gray-400 whitespace-pre-line leading-relaxed">
                  {COMPANY_INFO.stampDetails}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-script text-primary/80 mb-2 rotate-[-5deg]">AP</div>
                  <p className="text-sm font-medium text-gray-900">{COMPANY_INFO.ceo}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 my-10" />

          {/* Payment Methods */}
          <div className="mb-8">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">{t.waysToPay}</h4>
            <div className="flex gap-8 mb-8">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Checkbox
                  id="cash"
                  checked={data.acceptCash}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptCash: checked as boolean })
                  }
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="cash" className="font-medium text-gray-700 cursor-pointer">{t.cash}</Label>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <Checkbox
                  id="bank"
                  checked={data.acceptBankTransfer}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptBankTransfer: checked as boolean })
                  }
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="bank" className="font-medium text-gray-700 cursor-pointer">{t.bankTransfer}</Label>
              </div>
            </div>

            {data.acceptBankTransfer && (
              <div className="grid md:grid-cols-3 gap-6">
                {BANK_ACCOUNTS.map((account, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-primary/20 transition-colors">
                    <h6 className="font-bold text-gray-900 mb-3">{account.bank}</h6>
                    <div className="space-y-1.5 text-xs text-gray-600 font-mono">
                      {account.accountName && (
                        <p className="truncate"><span className="text-gray-400 select-none">NAME:</span> {account.accountName}</p>
                      )}
                      <p className="truncate"><span className="text-gray-400 select-none">IBAN:</span> {account.iban}</p>
                      {account.bic && <p><span className="text-gray-400 select-none">BIC:</span> {account.bic}</p>}
                      {account.swift && <p><span className="text-gray-400 select-none">SWIFT:</span> {account.swift}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.acceptBankTransfer && (
              <p className="text-xs text-gray-400 mt-6 text-center italic">
                {t.sendConfirmation} <span className="text-primary not-italic">{COMPANY_INFO.email}</span>
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="text-center space-y-6 pt-12 border-t border-gray-100 mt-12 pb-4">
            <div className="text-[10px] items-center justify-center gap-4 text-gray-400 uppercase tracking-[0.2em] hidden print:flex">
              <span>TravelDocs</span>
            </div>

            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em]">
              {t.services}
            </p>
            <div className="text-xs text-gray-500 leading-relaxed font-light">
              <p>
                {COMPANY_INFO.phone} &nbsp;•&nbsp; {COMPANY_INFO.email} &nbsp;•&nbsp; {COMPANY_INFO.website}
              </p>
              <p className="mt-1 text-gray-400">
                IATA TIDS: {COMPANY_INFO.iata} &nbsp;|&nbsp; {COMPANY_INFO.license}
              </p>
            </div>
            <p className="text-2xl font-script text-primary/40 pt-4 transform -rotate-2 select-none">
              Thank you!
            </p>
          </div>
        </Card>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Proforma Invoice</DialogTitle>
            <DialogDescription>
              Send this proforma invoice to {data.clientEmail}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={confirmSend} disabled={isSending}>
              <Send className="h-4 w-4 mr-2" />
              {isSending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .sticky {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}