import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Facturas</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Facturación Electrónica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás crear facturas de venta, notas crédito y notas débito con envío directo a la DIAN.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
