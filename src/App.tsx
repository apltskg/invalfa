import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
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
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";

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
            <Route path="/accountant/:token" element={<AccountantPortal />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/analytics" replace />} />
                      <Route path="/packages" element={<Packages />} />
                      <Route path="/packages/:id" element={<PackageDetail />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/bank-sync" element={<BankSync />} />
                      <Route path="/export-hub" element={<ExportHub />} />
                      <Route path="/proforma" element={<ProformaInvoice />} />
                      <Route path="/proformas" element={<ManageProformas />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/general-expenses" element={<GeneralExpenses />} />
                      <Route path="/general-income" element={<GeneralIncome />} />
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
