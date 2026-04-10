import { NavLink, Outlet } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  ClipboardList,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react";

import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Panel" },
  { to: "/facturas", icon: FileText, label: "Facturas" },
  { to: "/clientes", icon: Users, label: "Clientes" },
  { to: "/productos", icon: Package, label: "Productos" },
  { to: "/cotizaciones", icon: ClipboardList, label: "Cotizaciones" },
  { to: "/documentos", icon: FolderOpen, label: "Documentos" },
  { to: "/configuracion", icon: Settings, label: "Configuración" },
] as const;

export function AppShell() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="px-4 py-4 border-b">
          <h1 className="text-sm font-bold">DIAN Facturador</h1>
          <div className="mt-1">
            <EnvironmentBadge />
          </div>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
