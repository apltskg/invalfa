import { useState, useEffect } from "react";
import { Save, Building2, Tag, CreditCard, Mail, Phone, MapPin, Globe, Loader2, Check } from "lucide-react";
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
    vat_number: string;
    address: string;
    phone: string;
    email: string;
    iban: string;
    swift: string;
    bank_name: string;
    logo_url: string;
}

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [settings, setSettings] = useState<AgencySettings>({
        company_name: "", vat_number: "", address: "",
        phone: "", email: "", iban: "", swift: "",
        bank_name: "", logo_url: ""
    });

    useEffect(() => { fetchSettings(); }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase.from("agency_settings").select("*").single();
            if (error && error.code !== "PGRST116") throw error;
            if (data) setSettings(data);
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

    const field = (
        id: keyof AgencySettings,
        label: string,
        placeholder: string,
        type = "text",
        multiline = false
    ) => (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Label>
            {multiline ? (
                <Textarea
                    id={id}
                    value={settings[id]}
                    onChange={e => setSettings({ ...settings, [id]: e.target.value })}
                    placeholder={placeholder}
                    className="rounded-xl border-slate-200 text-sm resize-none"
                    rows={2}
                />
            ) : (
                <Input
                    id={id}
                    type={type}
                    value={settings[id]}
                    onChange={e => setSettings({ ...settings, [id]: e.target.value })}
                    placeholder={placeholder}
                    className="rounded-xl border-slate-200 text-sm h-9"
                />
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Ρυθμίσεις</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Στοιχεία εταιρείας και τραπεζικές πληροφορίες</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={`rounded-xl gap-2 h-9 text-sm transition-colors ${saved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                    {saving
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : saved
                            ? <Check className="h-4 w-4" />
                            : <Save className="h-4 w-4" />}
                    {saving ? "Αποθήκευση..." : saved ? "Αποθηκεύτηκε" : "Αποθήκευση"}
                </Button>
            </div>

            {/* Company info */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        Στοιχεία Εταιρείας
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        {field("company_name", "Επωνυμία *", "π.χ. Τουριστικό Γραφείο ΕΠΕ")}
                        {field("vat_number", "ΑΦΜ", "π.χ. EL123456789")}
                    </div>
                    {field("address", "Διεύθυνση", "Οδός, Πόλη, Τ.Κ.", "text", true)}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Phone className="h-3 w-3" /> Τηλέφωνο
                            </Label>
                            <Input
                                value={settings.phone}
                                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                placeholder="+30 123 456 7890"
                                className="rounded-xl border-slate-200 text-sm h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Mail className="h-3 w-3" /> Email
                            </Label>
                            <Input
                                type="email"
                                value={settings.email}
                                onChange={e => setSettings({ ...settings, email: e.target.value })}
                                placeholder="info@agency.com"
                                className="rounded-xl border-slate-200 text-sm h-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                            <Globe className="h-3 w-3" /> URL Λογότυπου
                        </Label>
                        <Input
                            value={settings.logo_url}
                            onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            className="rounded-xl border-slate-200 text-sm h-9"
                        />
                        <p className="text-xs text-slate-400">Ανεβάστε το λογότυπο σε cloud και επικολλήστε το URL</p>
                    </div>
                </CardContent>
            </Card>

            {/* Banking info */}
            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
                <CardHeader className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        Τραπεζικά Στοιχεία
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                    {field("bank_name", "Τράπεζα", "π.χ. Εθνική Τράπεζα της Ελλάδος")}
                    <div className="grid grid-cols-2 gap-5">
                        {field("iban", "IBAN", "GR16 0110 1250 0000 0001 2345 678")}
                        {field("swift", "SWIFT / BIC", "π.χ. ETHNGRAA")}
                    </div>
                    {/* Preview */}
                    {(settings.iban || settings.bank_name) && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm">
                            <p className="text-xs font-semibold text-blue-700 mb-2">Προεπισκόπηση</p>
                            <p className="text-slate-700 font-medium">{settings.bank_name || "—"}</p>
                            <p className="text-slate-500 font-mono text-xs mt-0.5">{settings.iban || "—"}</p>
                            {settings.swift && <p className="text-slate-400 text-xs mt-0.5">SWIFT: {settings.swift}</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Expense categories */}
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

            {/* Income categories */}
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
