import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    FileText, Building2, Hash, CreditCard, MessageSquare,
    Globe, CheckCircle2, Loader2, ChevronDown, ArrowRight,
    Receipt, Plane
} from "lucide-react";

/* ─── types ─────────────────────────────────────────────────── */
type Lang = "el" | "en";

interface FormData {
    full_name: string;
    company_name: string;
    vat_number: string;
    tax_office: string;
    address: string;
    email: string;
    phone: string;
    bank_transaction_ref: string;
    amount: string;
    service_description: string;
    notes: string;
}

const EMPTY: FormData = {
    full_name: "", company_name: "", vat_number: "", tax_office: "",
    address: "", email: "", phone: "",
    bank_transaction_ref: "", amount: "", service_description: "", notes: "",
};

/* ─── i18n ────────────────────────────────────────────────────── */
const T = {
    el: {
        hero: "Αίτηση Παραστατικού",
        sub: "Συμπληρώστε τα στοιχεία σας και θα σας αποστείλουμε το παραστατικό.",
        company: "ALFA ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε.",
        tagline: "Γραφείο Γενικού Τουρισμού",
        sec_requester: "Στοιχεία Αιτούντος",
        sec_payment: "Στοιχεία Πληρωμής",
        sec_notes: "Επιπλέον Σχόλια",
        full_name: "Ονοματεπώνυμο / Υπεύθυνος *",
        company_name: "Επωνυμία Εταιρείας",
        vat_number: "ΑΦΜ *",
        tax_office: "ΔΟΥ",
        address: "Διεύθυνση Έδρας",
        email: "Email *",
        phone: "Τηλέφωνο",
        bank_transaction_ref: "Κωδικός Τραπεζικής Συναλλαγής",
        amount: "Ποσό (€)",
        service_description: "Περιγραφή Υπηρεσίας / Παροχής *",
        notes: "Σχόλια ή ιδιαίτερες οδηγίες",
        submit: "Αποστολή Αίτησης",
        submitting: "Αποστολή...",
        success_title: "Η αίτησή σας στάλθηκε!",
        success_body: "Θα επικοινωνήσουμε μαζί σας στο συντομότερο δυνατό.",
        new_request: "Νέα Αίτηση",
        ph_name: "π.χ. Γιώργος Παπαδόπουλος",
        ph_company: "π.χ. ΑΒΓ ΕΠΕ",
        ph_vat: "π.χ. 123456789",
        ph_doy: "π.χ. ΔΟΥ Κατερίνης",
        ph_address: "π.χ. Λεπτοκαρυά, Πιερία, 60063",
        ph_email: "email@example.com",
        ph_phone: "+30 6xx xxx xxxx",
        ph_ref: "π.χ. REF-20260201",
        ph_amount: "π.χ. 250.00",
        ph_service: "π.χ. Τουριστικό Πακέτο — Αθήνα 3 ημέρες",
        ph_notes: "Τυχόν ιδιαίτερες οδηγίες...",
        required: "* Υποχρεωτικό πεδίο",
    },
    en: {
        hero: "Invoice Request",
        sub: "Fill in your details and we will issue your invoice promptly.",
        company: "ALFA MONOPROSOPI I.K.E.",
        tagline: "General Tourism Office",
        sec_requester: "Requester Details",
        sec_payment: "Payment Details",
        sec_notes: "Additional Notes",
        full_name: "Full Name / Contact Person *",
        company_name: "Company Name",
        vat_number: "VAT Number *",
        tax_office: "Tax Office (DOY)",
        address: "Registered Address",
        email: "Email *",
        phone: "Phone",
        bank_transaction_ref: "Bank Transaction Reference",
        amount: "Amount (€)",
        service_description: "Service / Description *",
        notes: "Comments or special instructions",
        submit: "Submit Request",
        submitting: "Submitting...",
        success_title: "Your request was sent!",
        success_body: "We will get back to you as soon as possible.",
        new_request: "New Request",
        ph_name: "e.g. George Papadopoulos",
        ph_company: "e.g. ABC Ltd.",
        ph_vat: "e.g. EL123456789",
        ph_doy: "e.g. DOY Katerini",
        ph_address: "e.g. Leptokaria, Pieria, 60063",
        ph_email: "email@example.com",
        ph_phone: "+30 6xx xxx xxxx",
        ph_ref: "e.g. REF-20260201",
        ph_amount: "e.g. 250.00",
        ph_service: "e.g. Travel Package — Athens 3 days",
        ph_notes: "Any special instructions...",
        required: "* Required field",
    },
};

/* ─── sub-components ─────────────────────────────────────────── */
function Field({
    label, id, placeholder, value, onChange, type = "text", multiline = false, icon,
}: {
    label: string; id: string; placeholder?: string;
    value: string; onChange: (v: string) => void;
    type?: string; multiline?: boolean; icon?: React.ReactNode;
}) {
    return (
        <div className="ir-field">
            <label htmlFor={id} className="ir-label">
                {icon && <span className="ir-label-icon">{icon}</span>}
                {label}
            </label>
            {multiline ? (
                <textarea
                    id={id} value={value} placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}
                    className="ir-input ir-textarea"
                />
            ) : (
                <input
                    id={id} type={type} value={value} placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}
                    className="ir-input"
                />
            )}
        </div>
    );
}

/* ─── main component ──────────────────────────────────────────── */
export default function InvoiceRequest() {
    const [lang, setLang] = useState<Lang>("el");
    const [form, setForm] = useState<FormData>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const t = T[lang];
    const upd = (k: keyof FormData) => (v: string) => setForm(f => ({ ...f, [k]: v }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.full_name || !form.vat_number || !form.email || !form.service_description) {
            toast.error(lang === "el" ? "Συμπληρώστε τα υποχρεωτικά πεδία." : "Please fill in the required fields.");
            return;
        }
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("invoice_requests").insert([{
                ...form,
                amount: form.amount ? parseFloat(form.amount) : null,
                status: "pending",
                lang,
            }]);
            if (error) throw error;
            setDone(true);
        } catch (err: any) {
            console.error(err);
            toast.error(lang === "el" ? "Σφάλμα αποστολής. Δοκιμάστε ξανά." : "Submission failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <style>{IR_CSS}</style>

            <div className="ir-root">
                {/* ── header ── */}
                <header className="ir-header">
                    <div className="ir-header-inner">
                        <div className="ir-brand">
                            <div className="ir-brand-icon"><Plane className="ir-plane" /></div>
                            <div>
                                <p className="ir-brand-name">{t.company}</p>
                                <p className="ir-brand-tag">{t.tagline}</p>
                            </div>
                        </div>
                        <button
                            className="ir-lang-btn"
                            onClick={() => setLang(l => l === "el" ? "en" : "el")}
                        >
                            <Globe size={14} />
                            {lang === "el" ? "EN" : "ΕΛ"}
                            <ChevronDown size={12} />
                        </button>
                    </div>
                </header>

                <main className="ir-main">
                    {/* ── hero ── */}
                    <div className="ir-hero">
                        <div className="ir-hero-badge"><Receipt size={14} /> Invoice</div>
                        <h1 className="ir-hero-title">{t.hero}</h1>
                        <p className="ir-hero-sub">{t.sub}</p>
                    </div>

                    {done ? (
                        /* ── success state ── */
                        <div className="ir-card ir-success">
                            <div className="ir-success-icon"><CheckCircle2 size={48} /></div>
                            <h2 className="ir-success-title">{t.success_title}</h2>
                            <p className="ir-success-body">{t.success_body}</p>
                            <button className="ir-btn-outline" onClick={() => { setDone(false); setForm(EMPTY); }}>
                                {t.new_request}
                            </button>
                        </div>
                    ) : (
                        <form className="ir-card" onSubmit={handleSubmit} noValidate>

                            {/* ── Section 1: Requester ── */}
                            <div className="ir-section">
                                <div className="ir-section-header">
                                    <Building2 size={15} />
                                    <span>{t.sec_requester}</span>
                                </div>
                                <div className="ir-grid-2">
                                    <Field id="full_name" label={t.full_name} placeholder={t.ph_name}
                                        value={form.full_name} onChange={upd("full_name")}
                                        icon={<FileText size={12} />} />
                                    <Field id="company_name" label={t.company_name} placeholder={t.ph_company}
                                        value={form.company_name} onChange={upd("company_name")}
                                        icon={<Building2 size={12} />} />
                                </div>
                                <div className="ir-grid-2">
                                    <Field id="vat_number" label={t.vat_number} placeholder={t.ph_vat}
                                        value={form.vat_number} onChange={upd("vat_number")}
                                        icon={<Hash size={12} />} />
                                    <Field id="tax_office" label={t.tax_office} placeholder={t.ph_doy}
                                        value={form.tax_office} onChange={upd("tax_office")} />
                                </div>
                                <Field id="address" label={t.address} placeholder={t.ph_address}
                                    value={form.address} onChange={upd("address")} />
                                <div className="ir-grid-2">
                                    <Field id="email" label={t.email} placeholder={t.ph_email}
                                        type="email" value={form.email} onChange={upd("email")} />
                                    <Field id="phone" label={t.phone} placeholder={t.ph_phone}
                                        type="tel" value={form.phone} onChange={upd("phone")} />
                                </div>
                            </div>

                            {/* ── Section 2: Payment ── */}
                            <div className="ir-section">
                                <div className="ir-section-header">
                                    <CreditCard size={15} />
                                    <span>{t.sec_payment}</span>
                                </div>
                                <div className="ir-grid-2">
                                    <Field id="bank_transaction_ref" label={t.bank_transaction_ref}
                                        placeholder={t.ph_ref}
                                        value={form.bank_transaction_ref} onChange={upd("bank_transaction_ref")}
                                        icon={<CreditCard size={12} />} />
                                    <Field id="amount" label={t.amount} placeholder={t.ph_amount}
                                        type="number" value={form.amount} onChange={upd("amount")} />
                                </div>
                                <Field id="service_description" label={t.service_description}
                                    placeholder={t.ph_service}
                                    value={form.service_description} onChange={upd("service_description")}
                                    multiline icon={<FileText size={12} />} />
                            </div>

                            {/* ── Section 3: Notes ── */}
                            <div className="ir-section ir-section-last">
                                <div className="ir-section-header">
                                    <MessageSquare size={15} />
                                    <span>{t.sec_notes}</span>
                                </div>
                                <Field id="notes" label={t.notes} placeholder={t.ph_notes}
                                    value={form.notes} onChange={upd("notes")} multiline />
                            </div>

                            <div className="ir-footer">
                                <p className="ir-required">{t.required}</p>
                                <button type="submit" disabled={loading} className="ir-submit">
                                    {loading
                                        ? <><Loader2 size={16} className="ir-spin" /> {t.submitting}</>
                                        : <>{t.submit} <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </form>
                    )}
                </main>

                <footer className="ir-page-footer">
                    <p>© {new Date().getFullYear()} ALFA ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε. &nbsp;·&nbsp; business@atravel.gr &nbsp;·&nbsp; +30 694 207 2312</p>
                </footer>
            </div>
        </>
    );
}

/* ─── scoped CSS (works both standalone and embedded) ─────────── */
const IR_CSS = `
.ir-root {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
}

/* header */
.ir-header {
  backdrop-filter: blur(12px);
  background: rgba(15,23,42,0.7);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky; top: 0; z-index: 50;
}
.ir-header-inner {
  max-width: 680px; margin: 0 auto;
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.ir-brand { display: flex; align-items: center; gap: 12px; }
.ir-brand-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 20px rgba(99,102,241,0.4);
}
.ir-plane { color: #fff; width:18px; height:18px; }
.ir-brand-name { font-size: 13px; font-weight: 700; color: #f1f5f9; }
.ir-brand-tag { font-size: 11px; color: #64748b; margin-top: 1px; }
.ir-lang-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; color: #94a3b8;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; padding: 6px 12px; cursor: pointer;
  transition: all .2s;
}
.ir-lang-btn:hover { background: rgba(255,255,255,0.1); color: #f1f5f9; }

/* main */
.ir-main { flex: 1; max-width: 680px; margin: 0 auto; width: 100%; padding: 40px 24px 60px; }

/* hero */
.ir-hero { text-align: center; margin-bottom: 32px; }
.ir-hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: #818cf8; background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.25); border-radius: 999px;
  padding: 5px 14px; margin-bottom: 16px;
}
.ir-hero-title {
  font-size: clamp(26px, 5vw, 38px); font-weight: 800;
  background: linear-gradient(135deg, #f1f5f9 30%, #818cf8);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin: 0 0 12px;
}
.ir-hero-sub { font-size: 15px; color: #64748b; max-width: 480px; margin: 0 auto; line-height: 1.6; }

/* card */
.ir-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  overflow: hidden;
}

/* success */
.ir-success {
  padding: 60px 40px;
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px;
}
.ir-success-icon { color: #34d399; }
.ir-success-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0; }
.ir-success-body { color: #64748b; font-size: 15px; margin: 0; }
.ir-btn-outline {
  margin-top: 8px; padding: 10px 24px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px; background: transparent; color: #94a3b8;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all .2s;
}
.ir-btn-outline:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }

/* sections */
.ir-section {
  padding: 28px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ir-section-last { border-bottom: none; }
.ir-section-header {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: #6366f1; margin-bottom: 20px;
}

/* grid */
.ir-grid-2 {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
}
@media (max-width: 520px) {
  .ir-grid-2 { grid-template-columns: 1fr; }
  .ir-section { padding: 22px 20px; }
  .ir-footer { padding: 20px; }
}

/* field */
.ir-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 0; }
.ir-label {
  display: flex; align-items: center; gap-: 5px;
  font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
  color: #64748b;
}
.ir-label-icon { color: #6366f1; margin-right: 4px; }
.ir-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px; color: #f1f5f9;
  outline: none; width: 100%; box-sizing: border-box;
  transition: border-color .2s, box-shadow .2s;
  font-family: inherit;
}
.ir-input::placeholder { color: #334155; }
.ir-input:focus {
  border-color: rgba(99,102,241,.6);
  box-shadow: 0 0 0 3px rgba(99,102,241,.15);
}
.ir-textarea { resize: vertical; min-height: 80px; }

/* footer bar */
.ir-footer {
  padding: 20px 32px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
}
.ir-required { font-size: 12px; color: #475569; }
.ir-submit {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; border: none; border-radius: 12px;
  padding: 12px 28px; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all .2s;
  box-shadow: 0 4px 20px rgba(99,102,241,.35);
}
.ir-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,.5); }
.ir-submit:disabled { opacity: .6; cursor: not-allowed; transform: none; }
.ir-spin { animation: ir-spin .9s linear infinite; }
@keyframes ir-spin { to { transform: rotate(360deg); } }

/* page footer */
.ir-page-footer {
  text-align: center; padding: 24px;
  font-size: 12px; color: #334155;
  border-top: 1px solid rgba(255,255,255,0.04);
}
`;
