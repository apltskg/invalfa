import { DemoProvider } from "@/contexts/DemoContext";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { AppLayout } from "@/components/layout/AppLayout";
import DemoDashboard from "./DemoDashboard";
import { MonthProvider } from "@/contexts/MonthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

/**
 * /demo — Public demo page that showcases the template
 * with mock data, no auth required.
 */
export default function Demo() {
  return (
    <LanguageProvider>
      <MonthProvider>
        <DemoProvider isDemo={true}>
          <DemoBanner />
          <div className="pt-10">
            <DemoDashboard />
          </div>
        </DemoProvider>
      </MonthProvider>
    </LanguageProvider>
  );
}
