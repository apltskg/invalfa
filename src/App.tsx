import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
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
import LandingEN from "./pages/LandingEN";
import InvoiceRequest from "./pages/InvoiceRequest";
import InvoiceRequestsInbox from "./pages/InvoiceRequestsInbox";
import Travellers from "./pages/Travellers";
import MonthlyClosing from "./pages/MonthlyClosing";
import QuickScan from "./pages/QuickScan";
import ViewInvoice from "./pages/ViewInvoice";
import Demo from "./pages/Demo";
import TemplateLanding from "./pages/TemplateLanding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import LandingRedirect from "./pages/LandingRedirect";
import { CookieConsent } from "./components/shared/CookieConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/landing/en" element={<LandingEN />} />
            <Route path="/accountant/:token" element={<AccountantPortal />} />
            <Route path="/client-portal" element={<ClientPortal />} />
            <Route path="/invoice-request" element={<InvoiceRequest />} />
            <Route path="/view-invoice/:token" element={<ViewInvoice />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/template" element={<TemplateLanding />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/quick-scan" element={
              <ProtectedRoute><QuickScan /></ProtectedRoute>
            } />

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
                      <Route path="invoice-requests" element={<InvoiceRequestsInbox />} />
                      <Route path="travellers" element={<Travellers />} />
                      <Route path="monthly-closing" element={<MonthlyClosing />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
        <CookieConsent />
      </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

