import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import BankSync from "./pages/BankSync";
import ExportHub from "./pages/ExportHub";
import ProformaInvoice from "./pages/ProformaInvoice";
import ManageProformas from "./pages/ManageProformas";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import AccountantPortal from "./pages/AccountantPortal";
import NotFound from "./pages/NotFound";
import GeneralExpenses from "./pages/GeneralExpenses";
import GeneralIncome from "./pages/GeneralIncome";
import InvoiceList from "./pages/InvoiceList";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import AdminSettings from "./pages/AdminSettings";
import Reports from "./pages/Reports";
import ClientPortal from "./pages/ClientPortal";
import InvoiceExchange from "./pages/InvoiceExchange";
import BusinessIntelligence from "./pages/BusinessIntelligence";
import Landing from "./pages/Landing";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/accountant/:token" element={<AccountantPortal />} />
            <Route path="/client-portal" element={<ClientPortal />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="packages" element={<Packages />} />
                      <Route path="packages/:id" element={<PackageDetail />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="bank-sync" element={<BankSync />} />
                      <Route path="export-hub" element={<ExportHub />} />
                      <Route path="proforma" element={<ProformaInvoice />} />
                      <Route path="proformas" element={<ManageProformas />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="general-expenses" element={<GeneralExpenses />} />
                      <Route path="general-income" element={<GeneralIncome />} />
                      <Route path="invoice-list" element={<InvoiceList />} />
                      <Route path="suppliers" element={<Suppliers />} />
                      <Route path="customers" element={<Customers />} />
                      <Route path="admin" element={<AdminSettings />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="invoice-hub" element={<InvoiceExchange />} />
                      <Route path="business-intelligence" element={<BusinessIntelligence />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

