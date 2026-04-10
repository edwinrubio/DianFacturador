import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, ClipboardList, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuotations, useDeleteQuotation, type QuotationListItem } from "@/hooks/useQuotations";

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  invoiced: "Facturada",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  invoiced: "bg-purple-100 text-purple-700 border-purple-200",
};

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const cls = STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function QuotationsPage() {
  const navigate = useNavigate();
  const { data: quotations, isLoading, isError } = useQuotations();
  const deleteQuotation = useDeleteQuotation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(q: QuotationListItem) {
    if (!confirm(`¿Eliminar la cotización ${q.number}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(q.id);
    try {
      await deleteQuotation.mutateAsync(q.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Cotizaciones</h2>
        <Button onClick={() => navigate("/cotizaciones/nueva")}>
          <Plus className="h-4 w-4" />
          Nueva Cotización
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" />
            Listado de Cotizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando cotizaciones...</p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Error al cargar las cotizaciones. Intenta de nuevo.
            </p>
          )}
          {!isLoading && !isError && (!quotations || quotations.length === 0) && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay cotizaciones todavía. Crea la primera con el botón de arriba.
            </p>
          )}
          {quotations && quotations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Número</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4 font-mono font-medium">{q.number}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{q.client_name}</div>
                        <div className="text-xs text-muted-foreground">{q.client_document}</div>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{q.issue_date}</td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium">{formatCOP(q.total)}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/cotizaciones/${q.id}/editar`)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(q)}
                            disabled={deletingId === q.id}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
