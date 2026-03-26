import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {/* SetupGuard and onboarding routes will be added in Plan 05 */}
            <Route path="/" element={<div className="p-8">Dashboard stub - Plan 05</div>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
