import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  Plus, Trash2, Languages, Printer, Send, Percent, X,
  Save, ChevronDown, FileText, CreditCard, Building2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import type { Json } from "@/integrations/supabase/types";

/* ─── constants ─────────────────────────────────────────── */
const COMPANY = {
  name: "ALFA MONOPROSOPI I.K.E.",
  nameGr: "ΑΛΦΑ ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε.",
  address: "Θέση Φυλάκιο, Λεπτοκαρυά, Πιερία, 60063",
  phone: "+30 694 207 2312",
  email: "business@atravel.gr",
  website: "www.atravel.gr",
  vat: "EL801915410",
  doy: "ΔΟΥ ΚΑΤΕΡΙΝΗΣ",
  iata: "96174713",
  ceo: "Alexandros Papadopoulos",
  logoUrl: "https://atravel.gr/wp-content/uploads/2023/07/Alfa-Logo-Horizontal-Retina.png",
};

const BANKS = [
  { bank: "Eurobank", name: "ALFA ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε.", iban: "GR3602607330000890201151103", bic: "ERBKGRAA" },
  { bank: "Alpha Bank", name: "ΑLFΑ", iban: "GR7201407070707002002020365", bic: "CRBAGRAA" },
  { bank: "Wise (Intl/SEPA)", name: "ALFA MONOPROSOPI IKE", iban: "BE24 9050 7266 5838", bic: "TRWIBEB1XXX" },
];

const TERMS = {
  el: [
    "Η κράτηση οριστικοποιείται μόνο μετά την πλήρη εξόφληση.",
    "Η διαθεσιμότητα δεν μπορεί να εγγυηθεί μέχρι την ολοκλήρωση της πληρωμής.",
    "Σε ακύρωση εντός 3 ημερών πριν την ημερομηνία, παρακρατείται τέλος 10%.",
  ],
  en: [
    "This booking is confirmed only upon receipt of full payment.",
    "Availability cannot be guaranteed until payment is completed.",
    "Cancellations within 3 days of the service date incur a 10% fee.",
  ],
};

/* ─── types ─────────────────────────────────────────────── */
interface LineItem { id: string; description: string; price: number; taxPercent: number; }
type Lang = "el" | "en";

const genNum = () => {
  const y = new Date().getFullYear();
  return `PRF-${y}-${Math.floor(Math.random() * 9000 + 1000)}`;
};

const T = {
  en: {
    title: "Proforma Invoice", header: "PROFORMA INVOICE",
    invoiceTo: "Invoice To", payTo: "Pay To",
    invoiceNo: "Invoice #", date: "Date",
    description: "Description", price: "Price (€)", tax: "VAT %", total: "Total",
    addLine: "+ Add Line", discount: "Discount %", notes: "Notes",
    waysToPay: "Payment Methods", cash: "Cash", bank: "Bank Transfer",
    subtotal: "Subtotal", taxAmt: "VAT", grandTotal: "Total",
    terms: "Terms & Conditions", thanks: "Thank you for traveling with us!",
    services: "AIR TICKETS · BUS TRANSFERS · ACCOMMODATIONS — worldwide",
    print: "Print", send: "Send", save: "Save", lang: "ΕΛ",
    clientName: "Client / Company Name", clientAddr: "Address",
    clientEmail: "Email", clientVat: "VAT No. (optional)",
    sendConfirm: "Please send payment confirmation to",
  },
  el: {
    title: "Προτιμολόγιο", header: "ΠΡΟΤΙΜΟΛΟΓΙΟ",
    invoiceTo: "Προς", payTo: "Πληρωμή σε",
    invoiceNo: "Αρ. #", date: "Ημερομηνία",
    description: "Περιγραφή", price: "Τιμή (€)", tax: "ΦΠΑ %", total: "Σύνολο",
    addLine: "+ Νέα Υπηρεσία", discount: "Έκπτωση %", notes: "Σημειώσεις",
    waysToPay: "Τρόποι Πληρωμής", cash: "Μετρητά", bank: "Τραπεζική Μεταφορά",
    subtotal: "Υποσύνολο", taxAmt: "ΦΠΑ", grandTotal: "Σύνολο",
    terms: "Όροι & Προϋποθέσεις", thanks: "Ευχαριστούμε που ταξιδεύετε μαζί μας!",
    services: "ΑΕΡΟΠΟΡΙΚΑ · ΜΕΤΑΦΟΡΕΣ · ΔΙΑΜΟΝΗ — σε όλο τον κόσμο",
    print: "Εκτύπωση", send: "Αποστολή", save: "Αποθήκευση", lang: "EN",
    clientName: "Πελάτης / Εταιρεία", clientAddr: "Διεύθυνση",
    clientEmail: "Email", clientVat: "ΑΦΜ (προαιρετικό)",
    sendConfirm: "Στείλτε την επιβεβαίωση πληρωμής στο",
  },
};

/* ─── sub-components ─────────────────────────────────────── */
function EditorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</Label>
      {children}
    </div>
  );
}

/* ─── main ───────────────────────────────────────────────── */
export default function ProformaInvoice() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState<Lang>("el");
  const [sendOpen, setSendOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const t = T[lang];
  const terms = TERMS[lang];

  /* form state */
  const [num, setNum] = useState(genNum());
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [clientName, setClientName] = useState("");
  const [clientAddr, setClientAddr] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientVat, setClientVat] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [acceptCash, setAcceptCash] = useState(true);
  const [acceptBank, setAcceptBank] = useState(true);

  /* totals */
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const discountAmt = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = lines.reduce((s, l) => s + ((l.price * (1 - discount / 100) * l.taxPercent) / 100), 0);
  const grandTotal = afterDiscount + taxAmt;

  function lineTotal(l: LineItem) {
    return l.price + (l.price * l.taxPercent) / 100;
  }

  /* helpers */
  const updLine = (id: string, field: keyof LineItem, v: string | number) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: v } : l));

  const addLine = () =>
    setLines(prev => [...prev, { id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13 }]);

  const removeLine = (id: string) => {
    if (lines.length > 1) setLines(prev => prev.filter(l => l.id !== id));
  };

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("proforma_invoices").insert([{
        invoice_number: num, issue_date: date,
        client_name: clientName || null, client_address: clientAddr || null,
        client_email: clientEmail || null, client_vat_number: clientVat || null,
        line_items: lines as unknown as Json,
        subtotal, discount_percent: discount, discount_amount: discountAmt,
        tax_percent: 13, tax_amount: taxAmt, total: grandTotal,
        accept_cash: acceptCash, accept_bank_transfer: acceptBank,
        notes: notes || null,
      }]);
      if (error) throw error;
      toast({ title: "Αποθηκεύτηκε!", description: `Proforma ${num}` });
      // reset for next
      setNum(genNum()); setClientName(""); setClientAddr("");
      setClientEmail(""); setClientVat("");
      setLines([{ id: crypto.randomUUID(), description: "", price: 0, taxPercent: 13 }]);
      setDiscount(0); setNotes(""); setShowDiscount(false); setShowNotes(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Σφάλμα", description: "Αποτυχία αποθήκευσης.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = () => {
    if (!clientEmail) {
      toast({ title: "Λείπει Email", description: "Εισάγετε email πελάτη.", variant: "destructive" });
      return;
    }
    setSendOpen(true);
  };

  const confirmSend = async () => {
    setSending(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("send-proforma-email", {
        body: { invoiceNumber: num, issueDate: date, clientName, clientAddress: clientAddr, clientEmail, clientVatNumber: clientVat, lineItems: lines, subtotal, discountPercent: discount, discountAmount: discountAmt, taxAmount: taxAmt, total: grandTotal, acceptCash, acceptBankTransfer: acceptBank, notes, language: lang },
      });
      if (error) throw error;
      if (resp?.code === "MISSING_API_KEY") {
        toast({ title: "Email not configured", description: "Add RESEND_API_KEY to Supabase.", variant: "destructive" });
        return;
      }
      toast({ title: "Εστάλη!", description: `Email → ${clientEmail}` });
      setSendOpen(false);
      await handleSave();
    } catch (err) {
      console.error(err);
      toast({ title: "Αποτυχία", description: "Δεν ήταν δυνατή η αποστολή.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  /* ─── render ─────────────────────────────────────────── */
  return (
    <>
      {/* Print styles */}
      <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-root { padding: 0 !important; }
                    body { background: #fff !important; }
                }
            `}</style>

      <div className="min-h-screen bg-slate-50 print-root">

        {/* ── Toolbar ── */}
        <div className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">{t.title}</h1>
              <Badge variant="outline" className="text-xs font-mono">{num}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLang(l => l === "el" ? "en" : "el")} className="rounded-xl gap-1.5">
                <Languages size={14} /> {t.lang}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl gap-1.5">
                <Printer size={14} /> {t.print}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSend} className="rounded-xl gap-1.5">
                <Send size={14} /> {t.send}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-xl gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Save size={14} /> {saving ? "..." : t.save}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Split layout: editor left | preview right ── */}
        <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 no-print">

          {/* ── LEFT: Editor Panel ── */}
          <div className="space-y-4">

            {/* Invoice meta */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Στοιχεία Εγγράφου</p>
              <div className="grid grid-cols-2 gap-3">
                <EditorField label={t.invoiceNo}>
                  <Input value={num} onChange={e => setNum(e.target.value)}
                    className="h-9 text-sm rounded-xl font-mono" />
                </EditorField>
                <EditorField label={t.date}>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="h-9 text-sm rounded-xl" />
                </EditorField>
              </div>
            </div>

            {/* Client info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Building2 size={12} /> {t.invoiceTo}
              </p>
              <EditorField label={t.clientName}>
                <Input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="π.χ. Γιώργος Παπαδόπουλος" className="h-9 text-sm rounded-xl" />
              </EditorField>
              <EditorField label={t.clientAddr}>
                <Textarea value={clientAddr} onChange={e => setClientAddr(e.target.value)}
                  placeholder="Οδός, Πόλη, Τ.Κ." className="text-sm rounded-xl resize-none" rows={2} />
              </EditorField>
              <div className="grid grid-cols-2 gap-3">
                <EditorField label={t.clientEmail}>
                  <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                    placeholder="email@example.com" className="h-9 text-sm rounded-xl" />
                </EditorField>
                <EditorField label={t.clientVat}>
                  <Input value={clientVat} onChange={e => setClientVat(e.target.value)}
                    placeholder="123456789" className="h-9 text-sm rounded-xl" />
                </EditorField>
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText size={12} /> Υπηρεσίες
              </p>
              {lines.map((l, i) => (
                <div key={l.id} className="group space-y-2 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <Input value={l.description}
                      onChange={e => updLine(l.id, "description", e.target.value)}
                      placeholder={t.description}
                      className="h-8 text-sm rounded-xl flex-1" />
                    <button onClick={() => removeLine(l.id)} disabled={lines.length === 1}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-red-400 hover:bg-red-50 transition-all disabled:hidden">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pl-7">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">{t.price}</p>
                      <Input type="number" min="0" step="0.01"
                        value={l.price || ""}
                        onChange={e => updLine(l.id, "price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm rounded-xl text-right" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">{t.tax}</p>
                      <Input type="number" min="0" max="100"
                        value={l.taxPercent}
                        onChange={e => updLine(l.id, "taxPercent", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm rounded-xl text-right" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">{t.total}</p>
                      <div className="h-8 flex items-center justify-end px-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700">
                        €{lineTotal(l).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addLine}
                className="w-full py-2 border-dashed border border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all">
                {t.addLine}
              </button>
            </div>

            {/* Options */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Επιλογές</p>

              {/* Discount */}
              {showDiscount ? (
                <EditorField label={t.discount}>
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" max="100" value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="h-9 text-sm rounded-xl flex-1" />
                    <span className="text-sm text-slate-500">%</span>
                    <button onClick={() => { setDiscount(0); setShowDiscount(false); }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><X size={14} /></button>
                  </div>
                </EditorField>
              ) : (
                <button onClick={() => setShowDiscount(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  <Percent size={13} /> {t.discount}
                </button>
              )}

              {/* Notes */}
              {showNotes ? (
                <EditorField label={t.notes}>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="..." className="text-sm rounded-xl resize-none" rows={3} />
                </EditorField>
              ) : (
                <button onClick={() => setShowNotes(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600">
                  + {t.notes}
                </button>
              )}

              {/* Payment types */}
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={acceptCash}
                    onCheckedChange={v => setAcceptCash(v as boolean)}
                    className="data-[state=checked]:bg-blue-600" />
                  <span className="text-sm text-slate-600">{t.cash}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={acceptBank}
                    onCheckedChange={v => setAcceptBank(v as boolean)}
                    className="data-[state=checked]:bg-blue-600" />
                  <span className="text-sm text-slate-600">{t.bank}</span>
                </label>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live Preview ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300 border-b border-slate-100 no-print">
              Προεπισκόπηση · Live Preview
            </div>
            <InvoicePreview {...{ lang, t, terms, num, date, clientName, clientAddr, clientEmail, clientVat, lines, discount, discountAmt, taxAmt, grandTotal, subtotal, notes, acceptCash, acceptBank }} />
          </div>
        </div>

        {/* ── Print-only full-page invoice (hidden on screen) ── */}
        <div className="hidden print:block">
          <InvoicePreview {...{ lang, t, terms, num, date, clientName, clientAddr, clientEmail, clientVat, lines, discount, discountAmt, taxAmt, grandTotal, subtotal, notes, acceptCash, acceptBank }} />
        </div>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Αποστολή Προτιμολογίου</DialogTitle>
            <DialogDescription>
              Αποστολή στο <strong>{clientEmail}</strong>;
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sending}>Άκυρο</Button>
            <Button onClick={confirmSend} disabled={sending} className="gap-2">
              <Send size={14} /> {sending ? "Αποστολή..." : "Αποστολή Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Invoice Preview Component ─────────────────────────── */
function InvoicePreview({
  lang, t, terms, num, date, clientName, clientAddr, clientEmail, clientVat,
  lines, discount, discountAmt, taxAmt, grandTotal, subtotal, notes, acceptCash, acceptBank
}: {
  lang: Lang; t: typeof T["el"]; terms: string[];
  num: string; date: string; clientName: string; clientAddr: string;
  clientEmail: string; clientVat: string;
  lines: LineItem[]; discount: number; discountAmt: number;
  taxAmt: number; grandTotal: number; subtotal: number;
  notes: string; acceptCash: boolean; acceptBank: boolean;
}) {
  function lineTotal(l: LineItem) { return l.price + (l.price * l.taxPercent) / 100; }

  return (
    <div className="p-10 font-sans text-gray-800 min-h-[900px] print:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <img src={COMPANY.logoUrl} alt="ALFA logo" className="h-14 object-contain" />
        <div className="text-right">
          <h2 className="text-3xl font-light tracking-tight text-gray-900 uppercase mb-4">{t.header}</h2>
          <div className="text-sm text-gray-500 space-y-1">
            <div className="flex justify-end gap-8">
              <span className="text-gray-400 text-xs uppercase tracking-wider">{t.invoiceNo}</span>
              <span className="text-gray-900 font-mono font-semibold">{num || "PRF-—"}</span>
            </div>
            <div className="flex justify-end gap-8">
              <span className="text-gray-400 text-xs uppercase tracking-wider">{t.date}</span>
              <span className="text-gray-900">{date ? format(new Date(date + "T12:00:00"), "dd MMM yyyy") : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Client & Company */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{t.invoiceTo}</p>
          <p className="text-xl font-semibold text-gray-900 mb-1">{clientName || <span className="text-gray-200">Ονοματεπώνυμο</span>}</p>
          {clientAddr && <p className="text-sm text-gray-500 whitespace-pre-line leading-relaxed">{clientAddr}</p>}
          {clientEmail && <p className="text-sm text-gray-400 mt-1">{clientEmail}</p>}
          {clientVat && <p className="text-xs font-mono text-gray-400 mt-1">ΑΦΜ: {clientVat}</p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{t.payTo}</p>
          <p className="text-lg font-semibold text-gray-900 mb-1">{COMPANY.name}</p>
          <p className="text-sm text-gray-500">{COMPANY.address}</p>
          <p className="text-sm text-gray-500">{COMPANY.phone}</p>
          <p className="text-sm text-blue-500">{COMPANY.email}</p>
          <p className="text-xs font-mono text-gray-400 mt-1">VAT: {COMPANY.vat} · {COMPANY.doy}</p>
        </div>
      </div>

      {/* Line items table */}
      <div className="mb-10">
        <div className="grid grid-cols-[1fr_90px_60px_90px] gap-4 pb-2 border-b-2 border-gray-900 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <span>{t.description}</span>
          <span className="text-right">{t.price}</span>
          <span className="text-right">{t.tax}</span>
          <span className="text-right">{t.total}</span>
        </div>
        {lines.map((l, i) => (
          <div key={l.id} className="grid grid-cols-[1fr_90px_60px_90px] gap-4 py-3 border-b border-gray-100 text-sm">
            <span className="text-gray-700">{l.description || <span className="text-gray-300 italic">—</span>}</span>
            <span className="text-right text-gray-600">€{l.price.toFixed(2)}</span>
            <span className="text-right text-gray-400">{l.taxPercent}%</span>
            <span className="text-right font-semibold text-gray-900">€{lineTotal(l).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Terms & Totals */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        {/* Terms */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">{t.terms}</p>
          <ul className="space-y-2 text-xs text-gray-500 list-disc list-outside pl-4 marker:text-gray-300 leading-relaxed">
            {terms.map((term, i) => <li key={i}>{term}</li>)}
          </ul>
          {notes && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Notes</p>
              <p className="text-xs text-gray-600 leading-relaxed">{notes}</p>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t.subtotal}</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Έκπτωση {discount}%</span>
              <span>-€{discountAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-500">
            <span>{t.taxAmt}</span>
            <span>€{taxAmt.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
            <span className="text-lg font-light text-gray-900">{t.grandTotal}</span>
            <span className="text-2xl font-bold text-blue-700">€{grandTotal.toFixed(2)}</span>
          </div>

          {/* Signature */}
          <div className="pt-6 mt-2 border-t border-dashed border-gray-300 flex justify-between items-end">
            <div className="text-[10px] text-gray-400 leading-relaxed">
              <p className="font-bold">{COMPANY.nameGr}</p>
              <p>{COMPANY.doy}</p>
              <p>ΑΦΜ {COMPANY.vat}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-700/50 italic tracking-tight rotate-[-4deg] inline-block mb-1">AP</p>
              <p className="text-xs font-medium text-gray-700">{COMPANY.ceo}</p>
              <p className="text-[10px] text-gray-400">CEO</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      {(acceptCash || acceptBank) && (
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{t.waysToPay}</p>
          <div className="flex gap-4 mb-5">
            {acceptCash && <span className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">💵 {t.cash}</span>}
            {acceptBank && <span className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700">🏦 {t.bank}</span>}
          </div>
          {acceptBank && (
            <div className="grid grid-cols-3 gap-4">
              {BANKS.map((b, i) => (
                <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono space-y-1">
                  <p className="font-bold text-gray-800 font-sans text-[11px] mb-2">{b.bank}</p>
                  {b.name && <p><span className="text-gray-400">NAME:</span> {b.name}</p>}
                  <p><span className="text-gray-400">IBAN:</span> {b.iban}</p>
                  <p><span className="text-gray-400">BIC:</span> {b.bic}</p>
                </div>
              ))}
            </div>
          )}
          {acceptBank && (
            <p className="text-xs text-gray-400 mt-4 text-center italic">
              {t.sendConfirm}: <span className="text-blue-500 not-italic">{COMPANY.email}</span>
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 pt-6 text-center space-y-2">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">{t.services}</p>
        <p className="text-xs text-gray-400">{COMPANY.phone} · {COMPANY.email} · {COMPANY.website}</p>
        <p className="text-xs text-gray-300">IATA TIDS: {COMPANY.iata}</p>
        <p className="text-base text-gray-300 italic mt-2">{t.thanks}</p>
      </div>
    </div>
  );
}