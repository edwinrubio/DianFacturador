import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SetupGuard } from "@/components/SetupGuard";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ClientsPage from "@/pages/ClientsPage";
import ProductsPage from "@/pages/ProductsPage";
import QuotationsPage from "@/pages/QuotationsPage";
import DocumentsPage from "@/pages/DocumentsPage";
import SettingsPage from "@/pages/SettingsPage";
import QuotationFormPage from "@/pages/QuotationFormPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Auth required, but NOT behind SetupGuard (Pitfall 6 — avoid infinite redirect) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingPage />} />
          </Route>

          {/* Auth + Setup required */}
          <Route element={<ProtectedRoute />}>
            <Route element={<SetupGuard />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/facturas" element={<InvoicesPage />} />
                <Route path="/clientes" element={<ClientsPage />} />
                <Route path="/productos" element={<ProductsPage />} />
                <Route path="/cotizaciones" element={<QuotationsPage />} />
                <Route path="/cotizaciones/nueva" element={<QuotationFormPage />} />
                <Route path="/cotizaciones/:id/editar" element={<QuotationFormPage />} />
                <Route path="/documentos" element={<DocumentsPage />} />
                <Route path="/configuracion" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
