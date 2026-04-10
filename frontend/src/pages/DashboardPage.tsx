import { useQuery } from "@tanstack/react-query";
import { Settings, Shield, FileText, RefreshCw } from "lucide-react";

import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SetupStatus {
  is_complete: boolean;
  steps: Record<string, boolean>;
}

interface ProfileResponse {
  nit: string;
  check_digit: string;
  razon_social: string;
  fiscal_regime: string;
  email: string;
  has_certificate: boolean;
  dian_environment: string | null;
  software_pin: string | null;
  dian_wsdl_url: string | null;
}

interface ResolutionResponse {
  id: number;
  prefix: string;
  from_number: number;
  to_number: number;
  current_number: number | null;
  technical_key: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const { data: setup } = useQuery<SetupStatus>({
    queryKey: ["setup-status"],
    queryFn: () => api.get("/setup/status").then((r) => r.data),
  });

  const { data: profile } = useQuery<ProfileResponse>({
    queryKey: ["profile"],
    queryFn: () => api.get("/settings").then((r) => r.data),
    enabled: setup?.is_complete,
  });

  const { data: resolutions } = useQuery<ResolutionResponse[]>({
    queryKey: ["resolutions"],
    queryFn: () => api.get("/resolutions").then((r) => r.data),
    enabled: setup?.is_complete,
  });

  const activeResolution = resolutions?.find((r) => r.is_active);
  const remaining = activeResolution
    ? activeResolution.to_number - (activeResolution.current_number ?? activeResolution.from_number)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Panel principal</h2>
        {profile && (
          <p className="text-sm text-muted-foreground mt-1">
            {profile.razon_social} — NIT {profile.nit}-{profile.check_digit}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Entorno DIAN */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entorno DIAN</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {profile?.dian_environment === "habilitacion" ? (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                Habilitación (Pruebas)
              </Badge>
            ) : profile?.dian_environment === "produccion" ? (
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                Producción
              </Badge>
            ) : (
              <Badge variant="outline">No configurado</Badge>
            )}
            {profile?.software_pin && (
              <p className="text-xs text-muted-foreground mt-2">
                PIN: {profile.software_pin}
              </p>
            )}
            {profile?.dian_wsdl_url && (
              <p className="text-xs text-muted-foreground mt-1 truncate" title={profile.dian_wsdl_url}>
                URL: {profile.dian_wsdl_url}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resolución activa */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolución activa</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {activeResolution ? (
              <>
                <p className="text-lg font-bold">{activeResolution.prefix}</p>
                <p className="text-xs text-muted-foreground">
                  Rango: {activeResolution.from_number.toLocaleString()} — {activeResolution.to_number.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Actual: {(activeResolution.current_number ?? activeResolution.from_number).toLocaleString()}
                </p>
                {remaining !== null && (
                  <p className="text-xs mt-1">
                    <span className={remaining < 100 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                      {remaining.toLocaleString()} números disponibles
                    </span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Vigencia: {activeResolution.valid_from} al {activeResolution.valid_to}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin resolución activa</p>
            )}
          </CardContent>
        </Card>

        {/* Certificado */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Certificado digital</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {profile?.has_certificate ? (
              <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                Certificado cargado
              </Badge>
            ) : (
              <Badge variant="destructive">Sin certificado</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/onboarding"}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reconfigurar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
