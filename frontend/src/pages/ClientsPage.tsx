import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Clientes</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Gestión de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás crear, editar y eliminar clientes con sus datos fiscales (NIT/CC, dirección, régimen).
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Esta sección estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
