import { useState } from "react";
import { useNavigate } from "react-router";
import { FolderOpen, Search, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDocuments, type DocumentFilters, type DocumentListItem } from "@/hooks/useDocuments";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "invoice", label: "Factura de Venta" },
  { value: "credit_note", label: "Nota Crédito" },
  { value: "debit_note", label: "Nota Débito" },
  { value: "quotation", label: "Cotización" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "validated", label: "Validado" },
  { value: "rejected", label: "Rechazado" },
  { value: "sent", label: "Enviado" },
  { value: "accepted", label: "Aceptado" },
  { value: "invoiced", label: "Facturado" },
];

// ─── Styling maps ─────────────────────────────────────────────────────────────

const TYPE_CLASSES: Record<string, string> = {
  "Factura de Venta": "bg-blue-100 text-blue-700 border-blue-200",
  "Nota Crédito": "bg-orange-100 text-orange-700 border-orange-200",
  "Nota Débito": "bg-red-100 text-red-700 border-red-200",
  "Cotización": "bg-purple-100 text-purple-700 border-purple-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  validated: "Validado",
  rejected: "Rechazado",
  sent: "Enviado",
  accepted: "Aceptado",
  invoiced: "Facturado",
};

const STATUS_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  validated: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  invoiced: "bg-purple-100 text-purple-700 border-purple-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_CLASSES[type] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const cls = STATUS_CLASSES[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState<DocumentFilters>({});

  const { data: documents, isLoading, isError } = useDocuments(filters);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchInput.trim() || undefined }));
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({ ...prev, type: e.target.value || undefined }));
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setFilters((prev) => ({ ...prev, status: e.target.value || undefined }));
  }

  function handleFromDate(e: React.ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, from_date: e.target.value || undefined }));
  }

  function handleToDate(e: React.ChangeEvent<HTMLInputElement>) {
    setFilters((prev) => ({ ...prev, to_date: e.target.value || undefined }));
  }

  function clearFilters() {
    setSearchInput("");
    setFilters({});
  }

  const hasActiveFilters =
    filters.type || filters.status || filters.q || filters.from_date || filters.to_date;

  function handleRowClick(doc: DocumentListItem) {
    if (doc.source === "quotation") {
      navigate(`/cotizaciones/${doc.id}/editar`);
    } else {
      navigate(`/facturas/${doc.id}`);
    }
  }

  function handleExportCSV() {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.from_date) params.set("from_date", filters.from_date);
    if (filters.to_date) params.set("to_date", filters.to_date);
    const base = import.meta.env.VITE_API_BASE_URL || "/api";
    const qs = params.toString();
    window.open(`${base}/documents/export/csv${qs ? `?${qs}` : ""}`, "_blank");
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Documentos</h2>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-wrap gap-3 items-end"
          >
            {/* Search */}
            <div className="flex-1 min-w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Número, cliente, NIT…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Type */}
            <div className="min-w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tipo
              </label>
              <select
                value={filters.type ?? ""}
                onChange={handleTypeChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="min-w-44">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Estado
              </label>
              <select
                value={filters.status ?? ""}
                onChange={handleStatusChange}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From date */}
            <div className="min-w-36">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Desde
              </label>
              <Input
                type="date"
                value={filters.from_date ?? ""}
                onChange={handleFromDate}
              />
            </div>

            {/* To date */}
            <div className="min-w-36">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Hasta
              </label>
              <Input
                type="date"
                value={filters.to_date ?? ""}
                onChange={handleToDate}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button type="submit">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              {hasActiveFilters && (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-5 w-5" />
            Historial de Documentos
            {documents && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {documents.length} documento{documents.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando documentos…
            </p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Error al cargar los documentos. Intenta de nuevo.
            </p>
          )}
          {!isLoading && !isError && (!documents || documents.length === 0) && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No se encontraron documentos con los filtros aplicados."
                : "No hay documentos todavía. Crea una factura o cotización para comenzar."}
            </p>
          )}
          {documents && documents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Número</th>
                    <th className="pb-3 pr-4 font-medium">Tipo</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={`${doc.source}-${doc.id}`}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(doc)}
                    >
                      <td className="py-3 pr-4 font-mono font-medium">
                        {doc.number}
                      </td>
                      <td className="py-3 pr-4">
                        <TypeBadge type={doc.document_type} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium">{doc.client_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc.client_document}
                        </div>
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{doc.issue_date}</td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium">
                        {formatCOP(doc.total)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(doc);
                          }}
                          className="text-xs"
                        >
                          Ver detalle
                        </Button>
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
