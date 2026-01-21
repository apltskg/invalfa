import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import BankSync from "./pages/BankSync";
import ExportHub from "./pages/ExportHub";
import ProformaInvoice from "./pages/ProformaInvoice";
import ManageProformas from "./pages/ManageProformas";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import AccountantPortal from "./pages/AccountantPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public route for accountant */}
            <Route path="/accountant/:token" element={<AccountantPortal />} />

            {/* Main app routes */}
            <Route path="/" element={<Navigate to="/packages" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/packages" element={<Packages />} />
              <Route path="/packages/:id" element={<PackageDetail />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/bank-sync" element={<BankSync />} />
              <Route path="/export-hub" element={<ExportHub />} />
              <Route path="/proforma" element={<ProformaInvoice />} />
              <Route path="/proformas" element={<ManageProformas />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
