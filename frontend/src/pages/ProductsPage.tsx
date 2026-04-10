import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Productos y Servicios</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Catálogo de Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás gestionar tu catálogo de productos y servicios con precios, códigos IVA y unidades de medida.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
