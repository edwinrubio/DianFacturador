import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, FileText, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoices, useDeleteInvoice, type InvoiceListItem } from "@/hooks/useInvoices";

const DIAN_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  validated: "Validada",
  rejected: "Rechazada",
  error: "Error",
};

const DIAN_STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  validated: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  error: "bg-orange-100 text-orange-700 border-orange-200",
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  "01": "Factura",
  "91": "Nota Crédito",
  "92": "Nota Débito",
};

const INVOICE_TYPE_CLASSES: Record<string, string> = {
  "01": "bg-blue-100 text-blue-700 border-blue-200",
  "91": "bg-purple-100 text-purple-700 border-purple-200",
  "92": "bg-teal-100 text-teal-700 border-teal-200",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "validated", label: "Validada" },
  { value: "rejected", label: "Rechazada" },
  { value: "error", label: "Error" },
];

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function DianStatusBadge({ status }: { status: string }) {
  const label = DIAN_STATUS_LABELS[status] ?? status;
  const cls = DIAN_STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function InvoiceTypeBadge({ type }: { type: string }) {
  const label = INVOICE_TYPE_LABELS[type] ?? type;
  const cls = INVOICE_TYPE_CLASSES[type] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const { data: invoices, isLoading, isError } = useInvoices(statusFilter || undefined);
  const deleteInvoice = useDeleteInvoice();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(inv: InvoiceListItem) {
    if (!confirm(`¿Eliminar la factura ${inv.number ?? `#${inv.id}`}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(inv.id);
    try {
      await deleteInvoice.mutateAsync(inv.id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Facturas</h2>
        <Button onClick={() => navigate("/facturas/nueva")}>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Listado de Facturas
            </CardTitle>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando facturas...</p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Error al cargar las facturas. Intenta de nuevo.
            </p>
          )}
          {!isLoading && !isError && (!invoices || invoices.length === 0) && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay facturas todavía. Crea la primera con el botón de arriba.
            </p>
          )}
          {invoices && invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Número</th>
                    <th className="pb-3 pr-4 font-medium">Tipo</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium">Estado DIAN</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4 font-mono font-medium">
                        {inv.number ?? <span className="text-muted-foreground italic">Sin número</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <InvoiceTypeBadge type={inv.invoice_type} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{inv.client_name}</div>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{inv.issue_date}</td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium">{formatCOP(inv.total)}</td>
                      <td className="py-3 pr-4">
                        <DianStatusBadge status={inv.dian_status} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.dian_status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => navigate(`/facturas/${inv.id}/editar`)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDelete(inv)}
                                disabled={deletingId === inv.id}
                                title="Eliminar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
