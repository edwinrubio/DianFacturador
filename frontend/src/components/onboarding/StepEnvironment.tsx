import { useState } from "react";
import { Loader2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_URLS: Record<string, string> = {
  habilitacion: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
  produccion: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
};

interface StepEnvironmentProps {
  onComplete: () => void;
}

export function StepEnvironment({ onComplete }: StepEnvironmentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [softwarePin, setSoftwarePin] = useState("");
  const [wsdlUrl, setWsdlUrl] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnvironmentSelect = (env: string) => {
    setSelected(env);
    setWsdlUrl(DEFAULT_URLS[env] || "");
  };

  const handleSubmit = async () => {
    if (selected === null) return;
    setApiError(null);
    setIsSubmitting(true);
    try {
      await api.put("/settings/environment", {
        dian_environment: selected,
        software_pin: softwarePin || null,
        dian_wsdl_url: wsdlUrl || null,
      });
      onComplete();
    } catch {
      setApiError(
        "Ocurrió un error al guardar. Intenta de nuevo o recarga la página."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Entorno DIAN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleEnvironmentSelect("habilitacion")}
            className={[
              "rounded-lg border p-4 text-left transition-all cursor-pointer",
              "bg-yellow-50 border-yellow-300",
              selected === "habilitacion" ? "ring-2 ring-primary" : "",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Habilitación (Pruebas)</p>
            <p className="text-sm text-muted-foreground mt-1">
              Para hacer pruebas ante la DIAN. Los documentos NO tienen validez
              legal.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleEnvironmentSelect("produccion")}
            className={[
              "rounded-lg border p-4 text-left transition-all cursor-pointer",
              "bg-red-50 border-red-300",
              selected === "produccion" ? "ring-2 ring-primary" : "",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">Producción</p>
            <p className="text-sm text-muted-foreground mt-1">
              Para facturación electrónica real. Los documentos tienen validez
              legal ante la DIAN.
            </p>
          </button>
        </div>

        {selected && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="software-pin">PIN del Software (DIAN)</Label>
              <Input
                id="software-pin"
                type="text"
                placeholder="Ej: 20191"
                value={softwarePin}
                onChange={(e) => setSoftwarePin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                El PIN asignado por la DIAN para tu software de facturación.
                Lo encuentras en el portal de habilitación.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wsdl-url">URL del servicio DIAN (WSDL)</Label>
              <Input
                id="wsdl-url"
                type="url"
                placeholder="https://vpfe-hab.dian.gov.co/..."
                value={wsdlUrl}
                onChange={(e) => setWsdlUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se autocompleta al seleccionar el entorno. Solo modifica si la
                DIAN te proporcionó una URL diferente.
              </p>
            </div>
          </div>
        )}

        {apiError && (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6">
          <Button
            type="button"
            className="w-full"
            disabled={selected === null || isSubmitting}
            onClick={handleSubmit}
            aria-busy={isSubmitting}
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Completar configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
