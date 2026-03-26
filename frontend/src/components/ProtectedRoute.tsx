import { Navigate, Outlet } from "react-router";

export function ProtectedRoute() {
  const token = localStorage.getItem("access_token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
