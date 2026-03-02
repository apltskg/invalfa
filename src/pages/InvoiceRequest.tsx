import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Upload, X, FileText } from "lucide-react";

/* ─── i18n ─────────────────────────────────────────────── */
const T = {
    el: {
        heading: "Αίτηση Παραστατικού",
        sub: "Συμπληρώστε τα παρακάτω στοιχεία και θα σας αποστείλουμε το τιμολόγιο.",
        full_name: "Ονοματεπώνυμο *",
        company: "Επωνυμία Εταιρείας *",
        vat: "ΑΦΜ *",
        email: "Email *",
        phone: "Τηλέφωνο",
        txn_date: "Ημερομηνία Συναλλαγής *",
        amount: "Ποσό (€) *",
        receipt: "Απόδειξη Πληρωμής",
        receiptHint: "Αναβάστε εικόνα ή PDF (μέγ. 5MB)",
        notes: "Σχόλια / Παρατηρήσεις",
        submit: "Αποστολή Αιτήματος",
        submitting: "Αποστολή...",
        successTitle: "Αίτηση εστάλη!",
        successText: "Θα επικοινωνήσουμε μαζί σας σύντομα.",
        another: "Νέο Αίτημα",
        required: "Συμπληρώστε τα υποχρεωτικά πεδία.",
        lang: "EN",
        aadeHint: "Τα υπόλοιπα στοιχεία της εταιρείας θα αντληθούν αυτόματα μέσω ΑΑΔΕ χρησιμοποιώντας το ΑΦΜ σας.",
    },
    en: {
        heading: "Invoice Request",
        sub: "Fill in your details below and we'll issue an invoice for you.",
        full_name: "Full Name *",
        company: "Company Name *",
        vat: "VAT Number *",
        email: "Email *",
        phone: "Phone",
        txn_date: "Transaction Date *",
        amount: "Amount (€) *",
        receipt: "Proof of Payment",
        receiptHint: "Upload image or PDF (max 5MB)",
        notes: "Notes",
        submit: "Submit Request",
        submitting: "Submitting...",
        successTitle: "Request sent!",
        successText: "We'll get back to you shortly.",
        another: "New Request",
        required: "Please fill in all required fields.",
        lang: "ΕΛ",
        aadeHint: "Additional company details will be retrieved automatically using your VAT number.",
    },
};

type Lang = "el" | "en";

/* ─── Form field ────────────────────────────────────────── */
function Field({
    label, children, half = false,
}: { label: string; children: React.ReactNode; half?: boolean }) {
    return (
        <div className={half ? "col-span-1" : "col-span-2"}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

/* ─── Main ──────────────────────────────────────────────── */
export default function InvoiceRequest() {
    const [lang, setLang] = useState<Lang>("el");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const t = T[lang];

    const [form, setForm] = useState({
        full_name: "", company_name: "", vat_number: "", tax_office: "",
        address: "", email: "", phone: "",
        transaction_date: "", bank_transaction_ref: "",
        amount: "", service_description: "", notes: "",
    });

    const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.size <= 5 * 1024 * 1024) setFile(f);
        else if (f) alert("Max file size is 5MB.");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name || !form.company_name || !form.vat_number || !form.email || !form.amount || !form.transaction_date) {
            setError(t.required);
            return;
        }
        setError("");
        setLoading(true);
        try {
            let receipt_url: string | null = null;

            // Upload receipt if present
            if (file) {
                const ext = file.name.split(".").pop();
                const path = `receipts/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                const { error: upErr } = await (supabase as any).storage
                    .from("invoice-receipts")
                    .upload(path, file, { cacheControl: "3600", upsert: false });
                if (!upErr) {
                    const { data: urlData } = (supabase as any).storage
                        .from("invoice-receipts")
                        .getPublicUrl(path);
                    receipt_url = urlData?.publicUrl ?? null;
                }
            }

            const { error: dbErr } = await (supabase as any).from("invoice_requests").insert([{
                lang,
                full_name: form.full_name,
                company_name: form.company_name,
                vat_number: form.vat_number,
                email: form.email,
                phone: form.phone || null,
                transaction_date: form.transaction_date,
                amount: parseFloat(form.amount),
                notes: form.notes || null,
                receipt_url,
                status: "pending",
                service_description: "Χωρίς Περιγραφή (από Νέα Φόρμα)",
            }]);

            if (dbErr) {
                console.error("DB Insert Error:", dbErr);
                throw dbErr;
            }

            // Trigger email notification via edge function
            await supabase.functions.invoke('notify-admin', {
                body: {
                    type: 'new_invoice_request',
                    data: {
                        full_name: form.full_name,
                        company_name: form.company_name,
                        amount: form.amount
                    }
                }
            }).catch(console.error); // Catch but don't fail the request if notify fails

            setDone(true);
        } catch (err) {
            console.error(err);
            setError("Παρουσιάστηκε σφάλμα. Δοκιμάστε ξανά.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setDone(false);
        setFile(null);
        setForm({
            full_name: "", company_name: "", vat_number: "", tax_office: "",
            address: "", email: "", phone: "",
            transaction_date: "", bank_transaction_ref: "",
            amount: "", service_description: "", notes: "",
        });
    };

    /* ── Success screen ── */
    if (done) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center max-w-sm w-full">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.successTitle}</h2>
                    <p className="text-sm text-gray-500 mb-6">{t.successText}</p>
                    <button onClick={reset}
                        className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                        {t.another}
                    </button>
                </div>
            </div>
        );
    }

    /* ── Form ── */
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <img
                            src="https://atravel.gr/wp-content/uploads/2023/07/Alfa-Logo-Horizontal-Retina.png"
                            alt="ALFA Travel"
                            className="h-10 object-contain mb-4"
                        />
                        <h1 className="text-2xl font-semibold text-gray-900">{t.heading}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t.sub}</p>
                    </div>
                    <button
                        onClick={() => setLang(l => l === "el" ? "en" : "el")}
                        className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition mt-1"
                    >
                        {t.lang}
                    </button>
                </div>

                {/* Card */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">

                    {/* Personal / Company */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                            {lang === "el" ? "Στοιχεία Τιμολόγησης" : "Billing Details"}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={t.full_name}>
                                <input className={inputCls} value={form.full_name} onChange={upd("full_name")}
                                    placeholder={lang === "el" ? "π.χ. Μαρία Παπαδοπούλου" : "e.g. Maria Papadopoulou"} />
                            </Field>
                            <Field label={t.company} half>
                                <input className={inputCls} value={form.company_name} onChange={upd("company_name")}
                                    placeholder={lang === "el" ? "Επωνυμία επιχείρησης" : "Company Name"} />
                            </Field>
                            <Field label={t.vat} half>
                                <input className={inputCls} value={form.vat_number} onChange={upd("vat_number")}
                                    placeholder="π.χ. 123456789" />
                            </Field>

                            <div className="col-span-2 pt-1 pb-2">
                                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 p-2.5 rounded-lg flex items-center gap-2">
                                    <span className="flex-shrink-0">i</span>
                                    {t.aadeHint}
                                </p>
                            </div>

                            <Field label={t.email} half>
                                <input type="email" className={inputCls} value={form.email} onChange={upd("email")}
                                    placeholder="email@example.com" />
                            </Field>
                            <Field label={t.phone} half>
                                <input className={inputCls} value={form.phone} onChange={upd("phone")}
                                    placeholder="+30 694..." />
                            </Field>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Payment */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                            {lang === "el" ? "Στοιχεία Πληρωμής & Σχόλια" : "Payment Details & Notes"}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label={t.txn_date} half>
                                <input
                                    type="date"
                                    className={`${inputCls} cursor-pointer hover:border-blue-400`}
                                    value={form.transaction_date}
                                    onChange={upd("transaction_date")}
                                />
                            </Field>
                            <Field label={t.amount} half>
                                <input type="number" min="0" step="0.01" className={inputCls}
                                    value={form.amount} onChange={upd("amount")} placeholder="0.00" />
                            </Field>

                            {/* File upload */}
                            <Field label={t.receipt} half>
                                <input ref={fileRef} type="file" accept="image/*,.pdf"
                                    onChange={handleFile} className="hidden" />
                                {file ? (
                                    <div className="flex items-center gap-2 h-10 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                                        <FileText size={14} className="text-blue-500 shrink-0" />
                                        <span className="flex-1 truncate">{file.name}</span>
                                        <button type="button" onClick={() => setFile(null)}
                                            className="text-gray-400 hover:text-red-500 shrink-0">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => fileRef.current?.click()}
                                        className="w-full h-10 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition bg-gray-50/50">
                                        <Upload size={14} /> {t.receiptHint}
                                    </button>
                                )}
                            </Field>

                            <Field label={t.notes} half>
                                <input className={inputCls}
                                    value={form.notes} onChange={upd("notes")}
                                    placeholder={lang === "el" ? "Προαιρετικά..." : "Optional..."} />
                            </Field>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2">
                        {loading && <Loader2 size={15} className="animate-spin" />}
                        {loading ? t.submitting : t.submit}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    ALFA Travel · business@atravel.gr · +30 694 207 2312
                </p>
            </div>
        </div>
    );
}
