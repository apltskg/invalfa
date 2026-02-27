import { useState, useEffect } from "react";
import {
    Save, Building2, Tag, CreditCard, Mail, Phone, MapPin, Globe,
    Loader2, Check, Copy, CheckCheck, ExternalLink, Hash, Landmark, Wallet
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
    // Eurobank
    eurobank_beneficiary: string;
    eurobank_iban: string;
    eurobank_bic: string;
    // Alpha Bank
    alpha_beneficiary: string;
    alpha_iban: string;
    alpha_bic: string;
    // Wise
    wise_beneficiary: string;
    wise_iban: string;
    wise_swift: string;
    wise_bank_address: string;
    // Viva Wallet
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

function CopyField({
    label,
    value,
    onChange,
    mono = false,
    icon,
    readOnly = false,
}: {
    label: string;
    value: string;
    onChange?: (v: string) => void;
    mono?: boolean;
    icon?: React.ReactNode;
    readOnly?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                {icon}
                {label}
            </Label>
            <div className="flex gap-2">
                <Input
                    value={value}
                    onChange={e => onChange?.(e.target.value)}
                    readOnly={readOnly}
                    className={`rounded-xl border-slate-200 text-sm h-9 flex-1 ${mono ? "font-mono tracking-wider" : ""} ${readOnly ? "bg-slate-50 cursor-default" : ""}`}
                />
                <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy"
                    className={`flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border transition-all duration-200 ${copied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                            : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                        }`}
                >
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    );
}

function BankCard({
    title,
    color,
    icon,
    children,
}: {
    title: string;
    color: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className={`rounded-xl border p-4 space-y-3 ${color}`}>
            <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-80">
                {icon}
                {title}
            </p>
            {children}
        </div>
    );
}

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);

    useEffect(() => { fetchSettings(); }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase.from("agency_settings").select("*").single();
            if (error && error.code !== "PGRST116") throw error;
            if (data) {
                // Merge with defaults so new fields are pre-filled
                setSettings({ ...DEFAULT_SETTINGS, ...data });
            }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ρυθμίσεις</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Στοιχεία εταιρείας, τράπεζες και πληρωμές</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={`rounded-xl gap-2 h-9 text-sm transition-colors ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saving ? "Αποθήκευση..." : saved ? "Αποθηκεύτηκε" : "Αποθήκευση"}
                </Button>
            </div>

            {/* ── Company Info ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        Στοιχεία Εταιρείας / Company Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    {/* Names */}
                    <div className="grid grid-cols-2 gap-5">
                        <CopyField
                            label="Επωνυμία (EN)"
                            value={settings.company_name}
                            onChange={upd("company_name")}
                        />
                        <CopyField
                            label="Επωνυμία (ΕΛ)"
                            value={settings.company_name_gr}
                            onChange={upd("company_name_gr")}
                        />
                    </div>

                    {/* Activities */}
                    <div className="grid grid-cols-2 gap-5">
                        <CopyField
                            label="Δραστηριότητα (EN)"
                            value={settings.activity}
                            onChange={upd("activity")}
                        />
                        <CopyField
                            label="Δραστηριότητα (ΕΛ)"
                            value={settings.activity_gr}
                            onChange={upd("activity_gr")}
                        />
                    </div>

                    {/* Tax / Registry */}
                    <div className="grid grid-cols-3 gap-5">
                        <CopyField
                            label="ΑΦΜ / VAT"
                            value={settings.vat_number}
                            onChange={upd("vat_number")}
                            mono
                            icon={<Hash className="h-3 w-3" />}
                        />
                        <CopyField
                            label="ΔΟΥ"
                            value={settings.doy}
                            onChange={upd("doy")}
                        />
                        <CopyField
                            label="Αρ. ΓΕΜΗ / Registry No."
                            value={settings.registry_number}
                            onChange={upd("registry_number")}
                            mono
                            icon={<Hash className="h-3 w-3" />}
                        />
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" /> Διεύθυνση (EN)
                            </Label>
                            <div className="flex gap-2">
                                <Textarea
                                    value={settings.address}
                                    onChange={e => upd("address")(e.target.value)}
                                    className="rounded-xl border-slate-200 text-sm resize-none flex-1"
                                    rows={2}
                                />
                                <button
                                    type="button"
                                    onClick={() => { navigator.clipboard.writeText(settings.address); toast.success("Copied!"); }}
                                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all self-start mt-0"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" /> Διεύθυνση (ΕΛ)
                            </Label>
                            <div className="flex gap-2">
                                <Textarea
                                    value={settings.address_gr}
                                    onChange={e => upd("address_gr")(e.target.value)}
                                    className="rounded-xl border-slate-200 text-sm resize-none flex-1"
                                    rows={2}
                                />
                                <button
                                    type="button"
                                    onClick={() => { navigator.clipboard.writeText(settings.address_gr); toast.success("Copied!"); }}
                                    className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all self-start"
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-5">
                        <CopyField
                            label="Τηλέφωνο"
                            value={settings.phone}
                            onChange={upd("phone")}
                            icon={<Phone className="h-3 w-3" />}
                        />
                        <CopyField
                            label="Email"
                            value={settings.email}
                            onChange={upd("email")}
                            icon={<Mail className="h-3 w-3" />}
                        />
                    </div>

                    {/* Logo */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> URL Λογότυπου
                        </Label>
                        <Input
                            value={settings.logo_url}
                            onChange={e => upd("logo_url")(e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="rounded-xl border-slate-200 text-sm h-9"
                        />
                        <p className="text-xs text-slate-400">Ανεβάστε το λογότυπο σε cloud και επικολλήστε το URL</p>
                    </div>
                </CardContent>
            </Card>

            {/* ── Banking ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        Τραπεζικά Στοιχεία / Bank Accounts
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">

                    {/* Eurobank */}
                    <BankCard
                        title="Eurobank"
                        color="bg-blue-50 border-blue-100"
                        icon={<Landmark className="h-3.5 w-3.5 text-blue-500" />}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <CopyField
                                label="Δικαιούχος / Beneficiary"
                                value={settings.eurobank_beneficiary}
                                onChange={upd("eurobank_beneficiary")}
                            />
                            <CopyField
                                label="BIC / SWIFT"
                                value={settings.eurobank_bic}
                                onChange={upd("eurobank_bic")}
                                mono
                            />
                        </div>
                        <CopyField
                            label="IBAN"
                            value={settings.eurobank_iban}
                            onChange={upd("eurobank_iban")}
                            mono
                        />
                    </BankCard>

                    {/* Alpha Bank */}
                    <BankCard
                        title="Alpha Bank"
                        color="bg-red-50 border-red-100"
                        icon={<Landmark className="h-3.5 w-3.5 text-red-500" />}
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <CopyField
                                label="Δικαιούχος / Beneficiary"
                                value={settings.alpha_beneficiary}
                                onChange={upd("alpha_beneficiary")}
                            />
                            <CopyField
                                label="BIC / SWIFT"
                                value={settings.alpha_bic}
                                onChange={upd("alpha_bic")}
                                mono
                            />
                        </div>
                        <CopyField
                            label="IBAN"
                            value={settings.alpha_iban}
                            onChange={upd("alpha_iban")}
                            mono
                        />
                    </BankCard>

                    {/* Wise */}
                    <BankCard
                        title="Wise (International / SEPA)"
                        color="bg-emerald-50 border-emerald-100"
                        icon={<Globe className="h-3.5 w-3.5 text-emerald-600" />}
                    >
                        <p className="text-xs text-emerald-700 bg-emerald-100 rounded-lg px-3 py-1.5">
                            💡 Use for <strong>SEPA domestic</strong> transfers or <strong>international Swift</strong> from outside SEPA.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <CopyField
                                label="Δικαιούχος / Beneficiary"
                                value={settings.wise_beneficiary}
                                onChange={upd("wise_beneficiary")}
                            />
                            <CopyField
                                label="Swift / BIC"
                                value={settings.wise_swift}
                                onChange={upd("wise_swift")}
                                mono
                            />
                        </div>
                        <CopyField
                            label="IBAN (BE)"
                            value={settings.wise_iban}
                            onChange={upd("wise_iban")}
                            mono
                        />
                        <CopyField
                            label="Διεύθυνση Τράπεζας / Bank Address"
                            value={settings.wise_bank_address}
                            onChange={upd("wise_bank_address")}
                        />
                    </BankCard>
                </CardContent>
            </Card>

            {/* ── Viva Wallet ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-violet-400" />
                        Viva Wallet — Πύλη Πληρωμής
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <CopyField
                        label="Payment Link"
                        value={settings.viva_wallet_url}
                        onChange={upd("viva_wallet_url")}
                        icon={<Globe className="h-3 w-3" />}
                    />
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
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-slate-400" />
                        Κατηγορίες Εξόδων
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <CategoryManager />
                </CardContent>
            </Card>

            {/* ── Income categories ── */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Tag className="h-4 w-4 text-emerald-400" />
                        Κατηγορίες Εσόδων
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <IncomeCategoryManager />
                </CardContent>
            </Card>
        </div>
    );
}
