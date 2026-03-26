import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Configuración completada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tu empresa está lista para emitir documentos electrónicos ante la DIAN.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
