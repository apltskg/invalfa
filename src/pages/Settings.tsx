import { useState, useEffect } from "react";
import {
    Save, Building2, Tag, CreditCard, Mail, Phone, MapPin, Globe,
    Loader2, Check, Copy, CheckCheck, ExternalLink, Hash, Landmark,
    Wallet, Pencil, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { IncomeCategoryManager } from "@/components/categories/IncomeCategoryManager";

/* ─── Types ─── */
interface AgencySettings {
    company_name: string;
    company_name_gr: string;
    activity: string;
    activity_gr: string;
    vat_number: string;
    doy: string;
    registry_number: string;
    address: string;
    address_gr: string;
    phone: string;
    email: string;
    eurobank_beneficiary: string;
    eurobank_iban: string;
    eurobank_bic: string;
    alpha_beneficiary: string;
    alpha_iban: string;
    alpha_bic: string;
    wise_beneficiary: string;
    wise_iban: string;
    wise_swift: string;
    wise_bank_address: string;
    viva_wallet_url: string;
    logo_url: string;
}

const DEFAULT_SETTINGS: AgencySettings = {
    company_name: "ALFA MONOPROSOPI I.K.E.",
    company_name_gr: "ΑΛΦΑ ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε.",
    activity: "General Tourism Office",
    activity_gr: "Γραφείο Γενικού Τουρισμού",
    vat_number: "EL801915410",
    doy: "ΔΟΥ ΚΑΤΕΡΙΝΗΣ",
    registry_number: "0936E60000242001",
    address: "Thesi Filakio Leptokaria, Pieria, Greece, 60063",
    address_gr: "Λεπτοκαρυά, Πιερία, Ελλάδα, 60063",
    phone: "+30 694 207 2312",
    email: "business@atravel.gr",
    eurobank_beneficiary: "ALFA ΜΟΝΟΠΡΟΣΩΠΗ Ι.Κ.Ε.",
    eurobank_iban: "GR3602607330000890201151103",
    eurobank_bic: "ERBKGRAA",
    alpha_beneficiary: "ΑLFΑ",
    alpha_iban: "GR7201407070707002002020365",
    alpha_bic: "CRBAGRAA",
    wise_beneficiary: "ALFA MONOPROSOPI IKE",
    wise_iban: "BE24905072665838",
    wise_swift: "TRWIBEB1XXX",
    wise_bank_address: "Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
    viva_wallet_url: "https://pay.vivawallet.com/atravel",
    logo_url: "",
};

/* ─── Copy button ─── */
function CopyBtn({ text, label }: { text: string; label: string }) {
    const [copied, setCopied] = useState(false);
    const handle = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    };
    return (
        <button
            onClick={handle}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${copied
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
        >
            {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
            {copied ? "Αντιγράφηκε!" : label}
        </button>
    );
}

/* ─── Pair: plain + message-ready ─── */
function CopyPair({ plain, message }: { plain: string; message: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <CopyBtn text={plain} label="Αντιγραφή" />
            <CopyBtn text={message} label="Ως μήνυμα 💬" />
        </div>
    );
}

/* ─── Display row (read-only) ─── */
function DisplayRow({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
    if (!value) return null;
    return (
        <div className="py-2 border-b border-slate-100 last:border-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
            <p className={`text-sm text-slate-800 ${mono ? "font-mono tracking-wider" : ""}`}>{value}</p>
        </div>
    );
}

/* ─── Edit field ─── */
function EditField({
    label, value, onChange, mono = false, multiline = false,
}: {
    label: string; value: string; onChange: (v: string) => void;
    mono?: boolean; multiline?: boolean;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</Label>
            {multiline ? (
                <Textarea
                    value={value} onChange={e => onChange(e.target.value)}
                    className="rounded-xl border-slate-200 text-sm resize-none"
                    rows={2}
                />
            ) : (
                <Input
                    value={value} onChange={e => onChange(e.target.value)}
                    className={`rounded-xl border-slate-200 text-sm h-9 ${mono ? "font-mono tracking-wider" : ""}`}
                />
            )}
        </div>
    );
}

/* ─── Section header ─── */
function SectionHeader({
    icon, title, plain, message,
}: {
    icon: React.ReactNode; title: string; plain: string; message: string;
}) {
    return (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                {icon}{title}
            </p>
            <CopyPair plain={plain} message={message} />
        </div>
    );
}

/* ─── Main ─── */
export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);

    useEffect(() => { fetchSettings(); }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase.from("agency_settings").select("*").single();
            if (error && error.code !== "PGRST116") throw error;
            if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
        } catch (e) {
            console.error(e);
            toast.error("Αποτυχία φόρτωσης ρυθμίσεων");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { data: existing } = await supabase.from("agency_settings").select("id").single();
            if (existing) {
                const { error } = await supabase.from("agency_settings").update(settings).eq("id", existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("agency_settings").insert([settings]);
                if (error) throw error;
            }
            toast.success("Αποθηκεύτηκε επιτυχώς");
            setSaved(true);
            setEditMode(false);
            setTimeout(() => setSaved(false), 3000);
        } catch (e: any) {
            console.error(e);
            toast.error("Αποτυχία αποθήκευσης");
        } finally {
            setSaving(false);
        }
    }

    const upd = (key: keyof AgencySettings) => (v: string) =>
        setSettings(s => ({ ...s, [key]: v }));

    /* ── copy-all text blocks ── */
    // ── Plain copy blocks ──
    const copyCompany = [
        `${settings.company_name} / ${settings.company_name_gr}`,
        `${settings.activity} / ${settings.activity_gr}`,
        `ΑΦΜ: ${settings.vat_number}  |  ${settings.doy}`,
        `ΓΕΜΗ: ${settings.registry_number}`,
        `${settings.address}`,
        `${settings.address_gr}`,
        `Tel: ${settings.phone}`,
        `Email: ${settings.email}`,
    ].join("\n");

    const copyEurobank = [
        `Eurobank`,
        `Δικαιούχος: ${settings.eurobank_beneficiary}`,
        `IBAN: ${settings.eurobank_iban}`,
        `BIC: ${settings.eurobank_bic}`,
    ].join("\n");

    const copyAlpha = [
        `Alpha Bank`,
        `Δικαιούχος: ${settings.alpha_beneficiary}`,
        `IBAN: ${settings.alpha_iban}`,
        `BIC: ${settings.alpha_bic}`,
    ].join("\n");

    const copyWise = [
        `Wise (International / SEPA)`,
        `Beneficiary: ${settings.wise_beneficiary}`,
        `IBAN: ${settings.wise_iban}`,
        `Swift/BIC: ${settings.wise_swift}`,
        `Bank address: ${settings.wise_bank_address}`,
    ].join("\n");

    const copyAllBanks = [copyEurobank, "", copyAlpha, "", copyWise].join("\n");

    // ── Message-ready copy blocks ──
    const msgCompany = [
        `Ορίστε τα στοιχεία μας:\n`,
        `🏢 Επωνυμία: ${settings.company_name_gr} (${settings.company_name})`,
        `📋 Δραστηριότητα: ${settings.activity_gr}`,
        `🔢 ΑΦΜ: ${settings.vat_number}  |  ${settings.doy}`,
        `📍 Διεύθυνση: ${settings.address_gr}`,
        `📞 Τηλ: ${settings.phone}`,
        `✉️ Email: ${settings.email}`,
    ].join("\n");

    const msgEurobank = [
        `Ορίστε τα στοιχεία μας για Eurobank:\n`,
        `🏦 Τράπεζα: Eurobank`,
        `👤 Δικαιούχος: ${settings.eurobank_beneficiary}`,
        `💳 IBAN: ${settings.eurobank_iban}`,
        `🔑 BIC: ${settings.eurobank_bic}`,
    ].join("\n");

    const msgAlpha = [
        `Ορίστε τα στοιχεία μας για Alpha Bank:\n`,
        `🏦 Τράπεζα: Alpha Bank`,
        `👤 Δικαιούχος: ${settings.alpha_beneficiary}`,
        `💳 IBAN: ${settings.alpha_iban}`,
        `🔑 BIC: ${settings.alpha_bic}`,
    ].join("\n");

    const msgWise = [
        `Ορίστε τα στοιχεία μας για διεθνείς μεταφορές (Wise / SEPA):\n`,
        `🏦 Bank: Wise`,
        `👤 Beneficiary: ${settings.wise_beneficiary}`,
        `💳 IBAN: ${settings.wise_iban}`,
        `🔑 Swift/BIC: ${settings.wise_swift}`,
        `📍 Bank address: ${settings.wise_bank_address}`,
    ].join("\n");

    const msgAllBanks = [
        `Ορίστε τα τραπεζικά μας στοιχεία:\n`,
        `🏦 Eurobank`,
        `👤 ${settings.eurobank_beneficiary}`,
        `💳 IBAN: ${settings.eurobank_iban}`,
        `🔑 BIC: ${settings.eurobank_bic}`,
        ``,
        `🏦 Alpha Bank`,
        `👤 ${settings.alpha_beneficiary}`,
        `💳 IBAN: ${settings.alpha_iban}`,
        `🔑 BIC: ${settings.alpha_bic}`,
        ``,
        `🌍 Wise (International / SEPA)`,
        `👤 ${settings.wise_beneficiary}`,
        `💳 IBAN: ${settings.wise_iban}`,
        `🔑 BIC: ${settings.wise_swift}`,
        `📍 ${settings.wise_bank_address}`,
        ``,
        `Παρακαλώ αναφέρετε τον σκοπό της πληρωμής κατά τη μεταφορά.`,
        `Ευχαριστούμε! 🙏`,
    ].join("\n");

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ρυθμίσεις</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Στοιχεία εταιρείας, τράπεζες και πληρωμές</p>
                </div>
                <div className="flex items-center gap-2">
                    {editMode ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setEditMode(false); fetchSettings(); }}
                                className="rounded-xl gap-2 border-slate-200 text-slate-500"
                            >
                                <X className="h-4 w-4" /> Άκυρο
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                size="sm"
                                className={`rounded-xl gap-2 transition-colors ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                                {saving ? "Αποθήκευση..." : saved ? "Αποθηκεύτηκε" : "Αποθήκευση"}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditMode(true)}
                            className="rounded-xl gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            <Pencil className="h-4 w-4" /> Επεξεργασία
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Company Info ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <SectionHeader
                    icon={<Building2 className="h-4 w-4 text-slate-400" />}
                    title="Στοιχεία Εταιρείας / Company Details"
                    plain={copyCompany}
                    message={msgCompany}
                />
                <CardContent className="p-6">
                    {editMode ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <EditField label="Επωνυμία (EN)" value={settings.company_name} onChange={upd("company_name")} />
                                <EditField label="Επωνυμία (ΕΛ)" value={settings.company_name_gr} onChange={upd("company_name_gr")} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <EditField label="Δραστηριότητα (EN)" value={settings.activity} onChange={upd("activity")} />
                                <EditField label="Δραστηριότητα (ΕΛ)" value={settings.activity_gr} onChange={upd("activity_gr")} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <EditField label="ΑΦΜ / VAT" value={settings.vat_number} onChange={upd("vat_number")} mono />
                                <EditField label="ΔΟΥ" value={settings.doy} onChange={upd("doy")} />
                                <EditField label="Αρ. ΓΕΜΗ / Registry" value={settings.registry_number} onChange={upd("registry_number")} mono />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <EditField label="Διεύθυνση (EN)" value={settings.address} onChange={upd("address")} multiline />
                                <EditField label="Διεύθυνση (ΕΛ)" value={settings.address_gr} onChange={upd("address_gr")} multiline />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <EditField label="Τηλέφωνο" value={settings.phone} onChange={upd("phone")} />
                                <EditField label="Email" value={settings.email} onChange={upd("email")} />
                            </div>
                            <EditField label="URL Λογότυπου" value={settings.logo_url} onChange={upd("logo_url")} />
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <DisplayRow label="Επωνυμία (EN)" value={settings.company_name} />
                            <DisplayRow label="Επωνυμία (ΕΛ)" value={settings.company_name_gr} />
                            <DisplayRow label="Δραστηριότητα (EN)" value={settings.activity} />
                            <DisplayRow label="Δραστηριότητα (ΕΛ)" value={settings.activity_gr} />
                            <DisplayRow label="ΑΦΜ / VAT" value={settings.vat_number} mono />
                            <DisplayRow label="ΔΟΥ" value={settings.doy} />
                            <DisplayRow label="Αρ. ΓΕΜΗ / Registry No." value={settings.registry_number} mono />
                            <DisplayRow label="Διεύθυνση (EN)" value={settings.address} />
                            <DisplayRow label="Διεύθυνση (ΕΛ)" value={settings.address_gr} />
                            <DisplayRow label="Τηλέφωνο" value={settings.phone} />
                            <DisplayRow label="Email" value={settings.email} />
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Banking ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        Τραπεζικά Στοιχεία / Bank Accounts
                    </p>
                    <CopyPair plain={copyAllBanks} message={msgAllBanks} />
                </div>
                <CardContent className="p-6 space-y-5">

                    {/* Eurobank */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-blue-100">
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                <Landmark size={13} /> Eurobank
                            </p>
                            <CopyPair plain={copyEurobank} message={msgEurobank} />
                        </div>
                        <div className="px-4 py-3">
                            {editMode ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <EditField label="Δικαιούχος" value={settings.eurobank_beneficiary} onChange={upd("eurobank_beneficiary")} />
                                        <EditField label="BIC" value={settings.eurobank_bic} onChange={upd("eurobank_bic")} mono />
                                    </div>
                                    <EditField label="IBAN" value={settings.eurobank_iban} onChange={upd("eurobank_iban")} mono />
                                </div>
                            ) : (
                                <div className="divide-y divide-blue-100/70">
                                    <DisplayRow label="Δικαιούχος" value={settings.eurobank_beneficiary} />
                                    <DisplayRow label="IBAN" value={settings.eurobank_iban} mono />
                                    <DisplayRow label="BIC / SWIFT" value={settings.eurobank_bic} mono />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Alpha Bank */}
                    <div className="rounded-xl border border-red-100 bg-red-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-100">
                            <p className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-2">
                                <Landmark size={13} /> Alpha Bank
                            </p>
                            <CopyPair plain={copyAlpha} message={msgAlpha} />
                        </div>
                        <div className="px-4 py-3">
                            {editMode ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <EditField label="Δικαιούχος" value={settings.alpha_beneficiary} onChange={upd("alpha_beneficiary")} />
                                        <EditField label="BIC" value={settings.alpha_bic} onChange={upd("alpha_bic")} mono />
                                    </div>
                                    <EditField label="IBAN" value={settings.alpha_iban} onChange={upd("alpha_iban")} mono />
                                </div>
                            ) : (
                                <div className="divide-y divide-red-100/70">
                                    <DisplayRow label="Δικαιούχος" value={settings.alpha_beneficiary} />
                                    <DisplayRow label="IBAN" value={settings.alpha_iban} mono />
                                    <DisplayRow label="BIC / SWIFT" value={settings.alpha_bic} mono />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Wise */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-100">
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-2">
                                <Globe size={13} /> Wise — International / SEPA
                            </p>
                            <CopyPair plain={copyWise} message={msgWise} />
                        </div>
                        <div className="px-4 py-3">
                            {editMode ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <EditField label="Beneficiary" value={settings.wise_beneficiary} onChange={upd("wise_beneficiary")} />
                                        <EditField label="Swift / BIC" value={settings.wise_swift} onChange={upd("wise_swift")} mono />
                                    </div>
                                    <EditField label="IBAN (BE)" value={settings.wise_iban} onChange={upd("wise_iban")} mono />
                                    <EditField label="Διεύθυνση Τράπεζας" value={settings.wise_bank_address} onChange={upd("wise_bank_address")} />
                                </div>
                            ) : (
                                <div className="divide-y divide-emerald-100/70">
                                    <DisplayRow label="Beneficiary" value={settings.wise_beneficiary} />
                                    <DisplayRow label="IBAN" value={settings.wise_iban} mono />
                                    <DisplayRow label="Swift / BIC" value={settings.wise_swift} mono />
                                    <DisplayRow label="Διεύθυνση Τράπεζας" value={settings.wise_bank_address} />
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Viva Wallet ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-violet-400" />
                        Viva Wallet — Πύλη Πληρωμής
                    </p>
                    <CopyBtn text={settings.viva_wallet_url} label="Αντιγραφή link" />
                </div>
                <CardContent className="p-6 space-y-3">
                    {editMode ? (
                        <EditField label="Payment Link" value={settings.viva_wallet_url} onChange={upd("viva_wallet_url")} />
                    ) : (
                        <DisplayRow label="Payment Link" value={settings.viva_wallet_url} />
                    )}
                    {settings.viva_wallet_url && (
                        <a
                            href={settings.viva_wallet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Άνοιγμα Πύλης Πληρωμής
                        </a>
                    )}
                </CardContent>
            </Card>

            {/* ── Expense categories ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-slate-400" />
                        Κατηγορίες Εξόδων
                    </p>
                </div>
                <CardContent className="p-6">
                    <CategoryManager />
                </CardContent>
            </Card>

            {/* ── Income categories ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-400" />
                        Κατηγορίες Εσόδων
                    </p>
                </div>
                <CardContent className="p-6">
                    <IncomeCategoryManager />
                </CardContent>
            </Card>
        </div>
    );
}
