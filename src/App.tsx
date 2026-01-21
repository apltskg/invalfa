import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import BankSync from "./pages/BankSync";
import ExportHub from "./pages/ExportHub";
import ProformaInvoice from "./pages/ProformaInvoice";
import ManageProformas from "./pages/ManageProformas";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/packages" replace />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/packages/:id" element={<PackageDetail />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/bank-sync" element={<BankSync />} />
            <Route path="/export-hub" element={<ExportHub />} />
            <Route path="/proforma" element={<ProformaInvoice />} />
            <Route path="/proformas" element={<ManageProformas />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
