import { useState, useEffect } from "react";
import { Save, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const [settings, setSettings] = useState<AgencySettings>({
        company_name: "",
        vat_number: "",
        address: "",
        phone: "",
        email: "",
        iban: "",
        swift: "",
        bank_name: "",
        logo_url: ""
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            // For now, store in localStorage (later move to Supabase jsonb or table)
            const stored = localStorage.getItem('agency_settings');
            if (stored) {
                setSettings(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            // For now, save to localStorage (later migrate to Supabase)
            localStorage.setItem('agency_settings', JSON.stringify(settings));
            toast.success("Settings saved successfully");
        } catch (error: any) {
            console.error("Save error:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="mt-1 text-muted-foreground">Manage your agency information and bank details</p>
            </div>

            <Card className="p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">Agency Details</h2>
                        <p className="text-sm text-muted-foreground">Information shown on invoices and documents</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="company_name">Company Name *</Label>
                            <Input
                                id="company_name"
                                value={settings.company_name}
                                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                placeholder="e.g., Travel Agency Ltd"
                                className="rounded-xl h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vat_number">VAT Number</Label>
                            <Input
                                id="vat_number"
                                value={settings.vat_number}
                                onChange={(e) => setSettings({ ...settings, vat_number: e.target.value })}
                                placeholder="e.g., GR123456789"
                                className="rounded-xl h-11"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                            id="address"
                            value={settings.address}
                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            placeholder="Street, City, Postal Code, Country"
                            className="rounded-xl min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={settings.phone}
                                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                placeholder="+30 123 456 7890"
                                className="rounded-xl h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={settings.email}
                                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                placeholder="info@agency.com"
                                className="rounded-xl h-11"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_name">Bank Name</Label>
                                <Input
                                    id="bank_name"
                                    value={settings.bank_name}
                                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                                    placeholder="e.g., National Bank of Greece"
                                    className="rounded-xl h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="iban">IBAN</Label>
                                    <Input
                                        id="iban"
                                        value={settings.iban}
                                        onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                                        placeholder="GR16 0110 1250 0000 0001 2345 678"
                                        className="rounded-xl h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="swift">SWIFT/BIC</Label>
                                    <Input
                                        id="swift"
                                        value={settings.swift}
                                        onChange={(e) => setSettings({ ...settings, swift: e.target.value })}
                                        placeholder="e.g., ETHNGRAA"
                                        className="rounded-xl h-11"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold mb-4">Branding</h3>
                        <div className="space-y-2">
                            <Label htmlFor="logo_url">Logo URL</Label>
                            <Input
                                id="logo_url"
                                value={settings.logo_url}
                                onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                                className="rounded-xl h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                                Upload your logo to a cloud service and paste the URL here
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-xl h-11 px-8 gap-2"
                            size="lg"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "Saving..." : "Save Settings"}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
