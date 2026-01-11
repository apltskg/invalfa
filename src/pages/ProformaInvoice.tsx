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

const TERMS_CONDITIONS = [
  "Please note that this booking is not yet confirmed. It will be finalized only after full payment has been received.",
  "Due to high demand, availability cannot be guaranteed until the payment is completed.",
  "In case of cancellation less than 3 days prior to the scheduled date, a 10% fee will be retained.",
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
  const [language, setLanguage] = useState<Language>("en");
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const confirmSend = () => {
    // In a real app, this would send the email via backend
    toast({
      title: "Email Sent",
      description: `Proforma invoice sent to ${data.clientEmail}`,
    });
    setSendDialogOpen(false);
    handleSave();
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
      <div className="max-w-5xl mx-auto p-6 print:p-0">
        <Card ref={printRef} className="p-8 print:shadow-none print:border-none">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-4xl font-bold text-primary">
                <span className="text-primary">A</span>
                <span className="text-primary ml-2">ALFA</span>
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                TRAVEL
              </div>
            </div>

            {/* Invoice Info */}
            <div className="text-right">
              <h2 className="text-2xl font-bold text-primary mb-4">
                {t.proformaInvoice}
              </h2>
              <div className="space-y-1 text-sm">
                <div className="flex justify-end gap-4">
                  <span className="text-muted-foreground">{t.invoiceNumber}</span>
                  <span className="font-medium">{data.invoiceNumber}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-muted-foreground">{t.issueDate}</span>
                  <span className="font-medium">
                    {format(new Date(data.issueDate), "dd MMMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Client & Company Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Invoice To */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">{t.invoiceTo}</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">{t.name}</Label>
                  <Input
                    value={data.clientName}
                    onChange={(e) => setData({ ...data, clientName: e.target.value })}
                    placeholder={t.clientPlaceholder}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t.address}</Label>
                  <Textarea
                    value={data.clientAddress}
                    onChange={(e) => setData({ ...data, clientAddress: e.target.value })}
                    placeholder={t.addressPlaceholder}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t.email}</Label>
                  <Input
                    type="email"
                    value={data.clientEmail}
                    onChange={(e) => setData({ ...data, clientEmail: e.target.value })}
                    placeholder={t.emailPlaceholder}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">{t.vatNumber}</Label>
                  <Input
                    value={data.clientVatNumber}
                    onChange={(e) => setData({ ...data, clientVatNumber: e.target.value })}
                    placeholder={t.vatPlaceholder}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Pay To */}
            <div className="text-right">
              <h3 className="font-semibold text-lg mb-4">{t.payTo}</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{COMPANY_INFO.name}</p>
                <p className="text-muted-foreground">{COMPANY_INFO.address}</p>
                <p className="text-muted-foreground">{COMPANY_INFO.phone}</p>
                <p className="text-muted-foreground">{COMPANY_INFO.email}</p>
                <p className="text-muted-foreground">VAT: {COMPANY_INFO.vat}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <div className="grid grid-cols-[1fr_120px_80px_100px_40px] gap-4 mb-2 text-sm font-medium text-muted-foreground">
              <span>{t.serviceDescription}</span>
              <span className="text-right">{t.price}</span>
              <span className="text-right">{t.tax}</span>
              <span className="text-right">{t.total}</span>
              <span></span>
            </div>

            {data.lineItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_120px_80px_100px_40px] gap-4 mb-2 items-center"
              >
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                  placeholder={t.servicePlaceholder}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price || ""}
                  onChange={(e) =>
                    updateLineItem(item.id, "price", parseFloat(e.target.value) || 0)
                  }
                  className="text-right"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={item.taxPercent}
                  onChange={(e) =>
                    updateLineItem(item.id, "taxPercent", parseFloat(e.target.value) || 0)
                  }
                  className="text-right"
                />
                <div className="text-right font-medium">
                  €{item.total.toFixed(2)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLineItem(item.id)}
                  className="h-8 w-8"
                  disabled={data.lineItems.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addLineItem} className="mt-2">
              {t.addService}
            </Button>
          </div>

          {/* Terms & Totals Row */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Terms & Conditions */}
            <div>
              <h4 className="font-semibold mb-3">{t.termsConditions}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                {TERMS_CONDITIONS.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ol>

              {showNotesInput ? (
                <div className="mt-4">
                  <Textarea
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="min-h-[80px]"
                  />
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesInput(true)}
                  className="mt-4"
                >
                  {t.addNotes}
                </Button>
              )}
            </div>

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>{t.subtotal}</span>
                <span className="font-medium">€{data.subtotal.toFixed(2)}</span>
              </div>

              {showDiscountInput ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Discount:</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={data.discountPercent || ""}
                    onChange={(e) =>
                      setData({ ...data, discountPercent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-20 text-right"
                  />
                  <span className="text-sm">%</span>
                  <span className="ml-auto font-medium">
                    -€{data.discountAmount.toFixed(2)}
                  </span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiscountInput(true)}
                  className="gap-2"
                >
                  <Percent className="h-3 w-3" />
                  {t.addDiscount}
                </Button>
              )}

              <div className="flex justify-between text-sm">
                <span>{t.taxAmount} ({data.lineItems[0]?.taxPercent || 13}%):</span>
                <span className="font-medium">€{data.taxAmount.toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>{t.total}:</span>
                <span>€{data.total.toFixed(2)}</span>
              </div>

              {/* Stamp & Signature */}
              <div className="mt-6 pt-4 flex justify-between items-end">
                <div className="text-xs text-muted-foreground whitespace-pre-line">
                  <p className="font-bold">{COMPANY_INFO.stampName}</p>
                  {COMPANY_INFO.stampDetails}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-script text-primary mb-1">AP</div>
                  <p className="text-sm">{COMPANY_INFO.ceo}</p>
                  <p className="text-xs text-muted-foreground">{t.ceo}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Payment Methods */}
          <div className="mb-8">
            <h4 className="font-semibold mb-3">{t.waysToPay}</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cash"
                  checked={data.acceptCash}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptCash: checked as boolean })
                  }
                />
                <Label htmlFor="cash">{t.cash}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bank"
                  checked={data.acceptBankTransfer}
                  onCheckedChange={(checked) =>
                    setData({ ...data, acceptBankTransfer: checked as boolean })
                  }
                />
                <Label htmlFor="bank">{t.bankTransfer}</Label>
              </div>
            </div>

            {data.acceptBankTransfer && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {t.sendConfirmation} {COMPANY_INFO.email}
                </p>

                <h5 className="font-semibold mb-3">Bank Transfer:</h5>
                <div className="grid gap-4">
                  {BANK_ACCOUNTS.map((account, i) => (
                    <Card key={i} className="p-4">
                      <h6 className="font-semibold text-primary">{account.bank}</h6>
                      {account.accountName && (
                        <p className="text-sm">
                          {t.accountName}: {account.accountName}
                        </p>
                      )}
                      <p className="text-sm">IBAN: {account.iban}</p>
                      {account.bic && <p className="text-sm">BIC: {account.bic}</p>}
                      {account.swift && <p className="text-sm">SWIFT: {account.swift}</p>}
                      {account.bankAddress && (
                        <p className="text-sm">Bank: {account.bankAddress}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Footer */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-bold text-primary">A</span>
              <span className="text-xl font-bold text-primary">ALFA</span>
              <span className="text-xs text-muted-foreground uppercase">TRAVEL</span>
            </div>
            <p className="text-sm text-primary uppercase tracking-wide">
              {t.services}
            </p>
            <div>
              <p className="font-semibold mb-1">{t.contact}</p>
              <p className="text-sm text-muted-foreground">
                📞 {COMPANY_INFO.phone} | ✉ {COMPANY_INFO.email} | 🌐{" "}
                {COMPANY_INFO.website} | follow us {COMPANY_INFO.social}
              </p>
              <p className="text-sm text-muted-foreground">
                IATA TIDS Agency: {COMPANY_INFO.iata} | {COMPANY_INFO.license}
              </p>
            </div>
            <Separator />
            <p className="text-primary font-medium">{t.thanks}</p>
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
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSend}>
              <Send className="h-4 w-4 mr-2" />
              Send Email
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