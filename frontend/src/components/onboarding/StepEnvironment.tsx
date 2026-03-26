import { useState } from "react";
import { Loader2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StepEnvironmentProps {
  onComplete: () => void;
}

export function StepEnvironment({ onComplete }: StepEnvironmentProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selected === null) return;
    setApiError(null);
    setIsSubmitting(true);
    try {
      await api.put("/settings/environment", { dian_environment: selected });
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
            onClick={() => setSelected("habilitacion")}
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
            onClick={() => setSelected("produccion")}
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
