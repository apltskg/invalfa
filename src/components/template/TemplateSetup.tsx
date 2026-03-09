import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Download, Eye } from "lucide-react";
import { APP_CONFIG } from "@/config/app.config";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplateConfigState {
  company: typeof APP_CONFIG.company;
  features: typeof APP_CONFIG.features;
  locale: typeof APP_CONFIG.locale;
}

export function TemplateSetup() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<TemplateConfigState>({
    company: { ...APP_CONFIG.company },
    features: { ...APP_CONFIG.features },
    locale: { ...APP_CONFIG.locale }
  });

  const [showConfig, setShowConfig] = useState(false);

  const updateCompanyField = (field: keyof typeof config.company, value: string) => {
    setConfig(prev => ({
      ...prev,
      company: { ...prev.company, [field]: value }
    }));
  };

  const toggleFeature = (feature: keyof typeof config.features) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [feature]: !prev.features[feature] }
    }));
  };

  const generateConfigFile = () => {
    const configContent = `// Auto-generated configuration file
// Update this file to customize your travel business app

export const APP_CONFIG = ${JSON.stringify(config, null, 2)} as const;

export type AppConfig = typeof APP_CONFIG;
`;
    
    const blob = new Blob([configContent], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.config.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Travel Business Template Setup</h1>
        <p className="text-muted-foreground">
          Configure your travel business management application in minutes
        </p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Update these details to brand the application for your business
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={config.company.name}
                onChange={(e) => updateCompanyField('name', e.target.value)}
                placeholder="Your Travel Agency Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-vat">VAT Number</Label>
              <Input
                id="company-vat"
                value={config.company.vatNumber}
                onChange={(e) => updateCompanyField('vatNumber', e.target.value)}
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-email">Email</Label>
              <Input
                id="company-email"
                type="email"
                value={config.company.email}
                onChange={(e) => updateCompanyField('email', e.target.value)}
                placeholder="info@youragency.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-phone">Phone</Label>
              <Input
                id="company-phone"
                value={config.company.phone}
                onChange={(e) => updateCompanyField('phone', e.target.value)}
                placeholder="+30 123 456 7890"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Address</Label>
            <Textarea
              id="company-address"
              value={config.company.address}
              onChange={(e) => updateCompanyField('address', e.target.value)}
              placeholder="Your business address..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Configuration</CardTitle>
          <CardDescription>
            Enable or disable features based on your business needs
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getFeatureDescription(key)}
                  </p>
                </div>
                <Switch
                  checked={Boolean(enabled)}
                  onCheckedChange={() => toggleFeature(key as keyof typeof config.features)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button onClick={() => setShowConfig(!showConfig)} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          {showConfig ? 'Hide' : 'Preview'} Configuration
        </Button>
        <Button onClick={generateConfigFile}>
          <Download className="h-4 w-4 mr-2" />
          Download Config File
        </Button>
      </div>

      {/* Configuration Preview */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Preview</CardTitle>
            <CardDescription>
              Copy this configuration to your app.config.ts file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              <code>{JSON.stringify(config, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    aiExtraction: "AI-powered invoice data extraction",
    bankSync: "Bank statement synchronization",
    greekIntegrations: "Greek-specific integrations (myDATA, AFM)",
    multiCurrency: "Multiple currency support",
    emailNotifications: "Automated email notifications",
    advancedAnalytics: "Advanced reporting and analytics",
    clientPortal: "Customer portal access",
    mobileApp: "Mobile application features"
  };
  return descriptions[key] || "Feature description";
}