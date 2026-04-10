import { useState, useEffect } from "react";
import { Package, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type Product,
  type ProductCreate,
  type ProductUpdate,
} from "@/hooks/useProducts";

// UNECE unit of measure codes used in Colombian UBL invoicing
const UNIT_OPTIONS = [
  { value: "94", label: "94 — Unidad" },
  { value: "EA", label: "EA — Each (unidad)" },
  { value: "KGM", label: "KGM — Kilogramo" },
  { value: "HUR", label: "HUR — Hora" },
  { value: "MON", label: "MON — Mes" },
  { value: "LTR", label: "LTR — Litro" },
  { value: "MTR", label: "MTR — Metro" },
  { value: "MTQ", label: "MTQ — Metro cúbico" },
  { value: "MTK", label: "MTK — Metro cuadrado" },
  { value: "DAY", label: "DAY — Día" },
];

// DIAN tax codes
const TAX_CODE_OPTIONS = [
  { value: "01", label: "01 — IVA" },
  { value: "04", label: "04 — INC" },
  { value: "03", label: "03 — ICA" },
];

// Common Colombian tax rates
const TAX_RATE_OPTIONS = [
  { value: "0", label: "0%" },
  { value: "5", label: "5%" },
  { value: "8", label: "8%" },
  { value: "19", label: "19%" },
];

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getUnitLabel(code: string): string {
  const opt = UNIT_OPTIONS.find((o) => o.value === code);
  return opt ? opt.value : code;
}

function getTaxCodeLabel(code: string): string {
  const opt = TAX_CODE_OPTIONS.find((o) => o.value === code);
  return opt ? opt.label : code;
}

interface FormState {
  code: string;
  description: string;
  unit_measure: string;
  unit_price: string;
  tax_code: string;
  tax_rate: string;
}

const DEFAULT_FORM: FormState = {
  code: "",
  description: "",
  unit_measure: "94",
  unit_price: "",
  tax_code: "01",
  tax_rate: "19",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: products = [], isLoading } = useProducts(debouncedSearch || undefined);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  function openCreate() {
    setEditingProduct(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      code: product.code ?? "",
      description: product.description,
      unit_measure: product.unit_measure,
      unit_price: String(product.unit_price),
      tax_code: product.tax_code,
      tax_rate: String(product.tax_rate),
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setFormError(null);
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.description.trim()) {
      setFormError("La descripción es obligatoria.");
      return;
    }
    const price = parseFloat(form.unit_price);
    if (isNaN(price) || price < 0) {
      setFormError("El precio unitario debe ser un número válido.");
      return;
    }
    const rate = parseFloat(form.tax_rate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setFormError("La tarifa de impuesto debe estar entre 0 y 100.");
      return;
    }

    try {
      if (editingProduct) {
        const data: ProductUpdate = {
          code: form.code.trim() || null,
          description: form.description.trim(),
          unit_measure: form.unit_measure,
          unit_price: price,
          tax_code: form.tax_code,
          tax_rate: rate,
        };
        await updateMutation.mutateAsync({ id: editingProduct.id, data });
      } else {
        const data: ProductCreate = {
          code: form.code.trim() || null,
          description: form.description.trim(),
          unit_measure: form.unit_measure,
          unit_price: price,
          tax_code: form.tax_code,
          tax_rate: rate,
        };
        await createMutation.mutateAsync(data);
      }
      closeDialog();
    } catch {
      setFormError("Ocurrió un error al guardar. Intente nuevamente.");
    }
  }

  async function handleDelete(product: Product) {
    try {
      await deleteMutation.mutateAsync(product.id);
      setDeleteConfirm(null);
    } catch {
      // Silent — the product list will not update if delete fails
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Productos y Servicios</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Catálogo de Productos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Cargando productos...
            </p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {debouncedSearch
                ? "No se encontraron productos con ese criterio."
                : "Aún no hay productos. Crea el primero con el botón de arriba."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Impuesto</TableHead>
                  <TableHead className="text-right">Tarifa</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.code ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs">
                      {product.description}
                    </TableCell>
                    <TableCell>{getUnitLabel(product.unit_measure)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCOP(product.unit_price)}
                    </TableCell>
                    <TableCell>{getTaxCodeLabel(product.tax_code)}</TableCell>
                    <TableCell className="text-right">
                      {product.tax_rate}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(product)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteConfirm(product)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent onClose={closeDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Producto" : "Nuevo Producto"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              {/* Code */}
              <div className="grid gap-1.5">
                <Label htmlFor="code">Código interno (opcional)</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Ej. SERV-001"
                  value={form.code}
                  onChange={handleFormChange}
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div className="grid gap-1.5">
                <Label htmlFor="description">
                  Descripción <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Ej. Consultoría de software"
                  value={form.description}
                  onChange={handleFormChange}
                  maxLength={500}
                  required
                />
              </div>

              {/* Unit measure + price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="unit_measure">Unidad de medida</Label>
                  <Select
                    id="unit_measure"
                    name="unit_measure"
                    value={form.unit_measure}
                    onChange={handleFormChange}
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="unit_price">
                    Precio unitario (COP) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={form.unit_price}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              {/* Tax code + rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="tax_code">Tipo de impuesto</Label>
                  <Select
                    id="tax_code"
                    name="tax_code"
                    value={form.tax_code}
                    onChange={handleFormChange}
                  >
                    {TAX_CODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="tax_rate">Tarifa (%)</Label>
                  <Select
                    id="tax_rate"
                    name="tax_rate"
                    value={form.tax_rate}
                    onChange={handleFormChange}
                  >
                    {TAX_RATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : editingProduct ? "Guardar cambios" : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent onClose={() => setDeleteConfirm(null)}>
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar{" "}
            <span className="font-medium text-foreground">
              {deleteConfirm?.description}
            </span>
            ? Esta acción lo ocultará del catálogo.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
