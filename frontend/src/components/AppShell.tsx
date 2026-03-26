import { Outlet } from "react-router";
import { LogOut } from "lucide-react";

import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-sm font-semibold">DIAN Facturador</h1>
          <div className="flex items-center gap-3">
            <EnvironmentBadge />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
