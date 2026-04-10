import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

export default function QuotationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Cotizaciones</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" />
            Gestión de Cotizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás crear cotizaciones y convertirlas en facturas con un solo clic.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
