import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  type Client,
  type ClientCreate,
} from "@/hooks/useClients";

// Colombian document types per DIAN
const DOCUMENT_TYPES = [
  { value: "13", label: "CC — Cédula de Ciudadanía" },
  { value: "31", label: "NIT — Número de Identificación Tributaria" },
  { value: "22", label: "CE — Cédula de Extranjería" },
  { value: "41", label: "Pasaporte" },
  { value: "48", label: "PPT — Permiso de Permanencia" },
  { value: "50", label: "DIE — Documento de Identidad Extranjero" },
];

const FISCAL_REGIMES = [
  { value: "R-99-PN", label: "R-99-PN — No responsable de IVA (Persona Natural)" },
  { value: "48", label: "48 — Responsable de IVA (Régimen Común)" },
];

const FISCAL_RESPONSIBILITIES = [
  { value: "R-99-PN", label: "R-99-PN — No aplica (Persona Natural)" },
  { value: "O-13", label: "O-13 — Gran contribuyente" },
  { value: "O-15", label: "O-15 — Autorretenedor" },
  { value: "O-23", label: "O-23 — Agente de retención IVA" },
  { value: "O-47", label: "O-47 — Régimen simple de tributación" },
];

const emptyForm: ClientCreate = {
  document_type: "13",
  document_number: "",
  name: "",
  trade_name: "",
  fiscal_regime: "R-99-PN",
  fiscal_responsibilities: "R-99-PN",
  address: "",
  city: "",
  department: "",
  email: "",
  phone: "",
};

let searchTimer: ReturnType<typeof setTimeout> | undefined;

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientCreate>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const { data: clients, isLoading } = useClients(debouncedSearch || undefined);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const openCreate = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      document_type: client.document_type,
      document_number: client.document_number,
      name: client.name,
      trade_name: client.trade_name ?? "",
      fiscal_regime: client.fiscal_regime,
      fiscal_responsibilities: client.fiscal_responsibilities,
      address: client.address,
      city: client.city,
      department: client.department,
      email: client.email,
      phone: client.phone ?? "",
    });
    setError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      ...form,
      trade_name: form.trade_name || undefined,
      phone: form.phone || undefined,
    };

    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, data: payload });
      } else {
        await createClient.mutateAsync(payload);
      }
      handleClose();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? "Ocurrió un error. Intenta nuevamente.");
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteClient.mutateAsync(client.id);
    } catch {
      alert("Error al eliminar el cliente.");
    }
  };

  const isNIT = form.document_type === "31";
  const isPending = createClient.isPending || updateClient.isPending;

  const docTypeLabel = (code: string) =>
    DOCUMENT_TYPES.find((d) => d.value === code)?.label.split(" — ")[0] ?? code;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Clientes</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Directorio de Clientes
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento o correo..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-6 py-4">Cargando...</p>
          ) : !clients?.length ? (
            <p className="text-sm text-muted-foreground px-6 py-4">
              {debouncedSearch
                ? "No se encontraron clientes con esa búsqueda."
                : "No hay clientes registrados. Crea el primero."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo Doc.</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Nombre / Razón Social</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{docTypeLabel(client.document_type)}</TableCell>
                    <TableCell>
                      {client.document_number}
                      {client.check_digit && (
                        <span className="text-muted-foreground ml-1">-{client.check_digit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span>{client.name}</span>
                      {client.trade_name && (
                        <span className="block text-xs text-muted-foreground">{client.trade_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{client.email}</TableCell>
                    <TableCell className="text-sm">{client.city}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(client)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(client)}
                          title="Eliminar"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={handleClose} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Document type + number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="document_type">Tipo de documento *</Label>
                <Select
                  id="document_type"
                  value={form.document_type}
                  onChange={(e) => setForm({ ...form, document_type: e.target.value })}
                  required
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="document_number">
                  Número de documento *
                  {isNIT && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (dígito verificación automático)
                    </span>
                  )}
                </Label>
                <Input
                  id="document_number"
                  value={form.document_number}
                  onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                  placeholder={isNIT ? "900123456" : "12345678"}
                  required
                />
              </div>
            </div>

            {/* Name + Trade name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">Nombre / Razón social *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trade_name">Nombre comercial</Label>
                <Input
                  id="trade_name"
                  value={form.trade_name ?? ""}
                  onChange={(e) => setForm({ ...form, trade_name: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* Fiscal regime + responsibilities */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="fiscal_regime">Régimen fiscal *</Label>
                <Select
                  id="fiscal_regime"
                  value={form.fiscal_regime}
                  onChange={(e) => setForm({ ...form, fiscal_regime: e.target.value })}
                  required
                >
                  {FISCAL_REGIMES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fiscal_responsibilities">Responsabilidades fiscales *</Label>
                <Select
                  id="fiscal_responsibilities"
                  value={form.fiscal_responsibilities}
                  onChange={(e) => setForm({ ...form, fiscal_responsibilities: e.target.value })}
                  required
                >
                  {FISCAL_RESPONSIBILITIES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle 123 # 45-67"
                required
              />
            </div>

            {/* City + Department */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Bogotá"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department">Departamento *</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Cundinamarca"
                  required
                />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@empresa.com"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="3001234567"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Guardando..."
                  : editingClient
                  ? "Actualizar Cliente"
                  : "Crear Cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
