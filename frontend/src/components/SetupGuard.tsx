import { Navigate, Outlet } from "react-router";
import { useSetupStatus } from "@/hooks/useSetupStatus";

export function SetupGuard() {
  const { isComplete, isLoading } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return isComplete ? <Outlet /> : <Navigate to="/onboarding" replace />;
}
