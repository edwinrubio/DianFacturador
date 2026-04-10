import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Documentos</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5" />
            Historial de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás consultar el historial de documentos enviados a la DIAN, descargar PDF y XML, y exportar a Excel.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
