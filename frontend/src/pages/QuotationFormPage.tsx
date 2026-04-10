import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useQuotation,
  useCreateQuotation,
  useUpdateQuotation,
  type QuotationCreate,
  type QuotationUpdate,
} from "@/hooks/useQuotations";

interface LineFormValues {
  description: string;
  quantity: string;
  unit_price: string;
  discount_rate: string;
  tax_code: string;
  tax_rate: string;
}

interface FormValues {
  client_name: string;
  client_document: string;
  issue_date: string;
  expiry_date: string;
  notes: string;
  status: string;
  lines: LineFormValues[];
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calcLine(line: LineFormValues) {
  const qty = parseFloat(line.quantity) || 0;
  const price = parseFloat(line.unit_price) || 0;
  const disc = parseFloat(line.discount_rate) || 0;
  const taxRate = parseFloat(line.tax_rate) || 0;
  const lineTotal = qty * price * (1 - disc / 100);
  const taxAmount = lineTotal * (taxRate / 100);
  return { lineTotal, taxAmount };
}

const DEFAULT_LINE: LineFormValues = {
  description: "",
  quantity: "1",
  unit_price: "",
  discount_rate: "0",
  tax_code: "01",
  tax_rate: "19",
};

export default function QuotationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const quotationId = id ? parseInt(id, 10) : 0;

  const { data: existing, isLoading: loadingExisting } = useQuotation(quotationId);
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation(quotationId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      client_name: "",
      client_document: "",
      issue_date: new Date().toISOString().slice(0, 10),
      expiry_date: "",
      notes: "",
      status: "draft",
      lines: [{ ...DEFAULT_LINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      reset({
        client_name: existing.client_name,
        client_document: existing.client_document,
        issue_date: existing.issue_date,
        expiry_date: existing.expiry_date ?? "",
        notes: existing.notes ?? "",
        status: existing.status,
        lines: existing.lines.map((l) => ({
          description: l.description,
          quantity: String(l.quantity),
          unit_price: String(l.unit_price),
          discount_rate: String(l.discount_rate),
          tax_code: l.tax_code,
          tax_rate: String(l.tax_rate),
        })),
      });
    }
  }, [existing, reset]);

  const watchedLines = watch("lines");

  const totals = watchedLines.reduce(
    (acc, line) => {
      const { lineTotal, taxAmount } = calcLine(line);
      return {
        subtotal: acc.subtotal + lineTotal,
        taxTotal: acc.taxTotal + taxAmount,
        total: acc.total + lineTotal + taxAmount,
      };
    },
    { subtotal: 0, taxTotal: 0, total: 0 }
  );

  async function onSubmit(values: FormValues) {
    const lines = values.lines.map((l) => ({
      description: l.description,
      quantity: parseFloat(l.quantity) || 1,
      unit_price: parseFloat(l.unit_price) || 0,
      discount_rate: parseFloat(l.discount_rate) || 0,
      tax_code: l.tax_code,
      tax_rate: parseFloat(l.tax_rate) || 19,
    }));

    if (isEditing) {
      const payload: QuotationUpdate = {
        client_name: values.client_name,
        client_document: values.client_document,
        issue_date: values.issue_date || null,
        expiry_date: values.expiry_date || null,
        notes: values.notes || null,
        status: values.status || null,
        lines,
      };
      await updateQuotation.mutateAsync(payload);
    } else {
      const payload: QuotationCreate = {
        client_name: values.client_name,
        client_document: values.client_document,
        issue_date: values.issue_date || null,
        expiry_date: values.expiry_date || null,
        notes: values.notes || null,
        lines,
      };
      await createQuotation.mutateAsync(payload);
    }

    navigate("/cotizaciones");
  }

  if (isEditing && loadingExisting) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando cotización...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/cotizaciones")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-semibold">
          {isEditing ? `Editar Cotización ${existing?.number ?? ""}` : "Nueva Cotización"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Nombre / Razón Social *</Label>
                <Input
                  id="client_name"
                  {...register("client_name", { required: "Requerido" })}
                  placeholder="Nombre del cliente"
                  aria-invalid={!!errors.client_name}
                />
                {errors.client_name && (
                  <p className="text-xs text-destructive">{errors.client_name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client_document">NIT / CC *</Label>
                <Input
                  id="client_document"
                  {...register("client_document", { required: "Requerido" })}
                  placeholder="900123456-7"
                  aria-invalid={!!errors.client_document}
                />
                {errors.client_document && (
                  <p className="text-xs text-destructive">{errors.client_document.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue_date">Fecha de Emisión</Label>
                <Input id="issue_date" type="date" {...register("issue_date")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiry_date">Fecha de Vencimiento</Label>
                <Input id="expiry_date" type="date" {...register("expiry_date")} />
              </div>

              {isEditing && (
                <div className="space-y-1.5">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    {...register("status")}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviada</option>
                    <option value="accepted">Aceptada</option>
                    <option value="rejected">Rechazada</option>
                    <option value="invoiced">Facturada</option>
                  </select>
                </div>
              )}

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notas / Observaciones</Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  rows={2}
                  placeholder="Condiciones de pago, observaciones, etc."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Ítems</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...DEFAULT_LINE })}
              >
                <Plus className="h-4 w-4" />
                Agregar línea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2 font-medium min-w-[200px]">Descripción *</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">Cant.</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Precio Unit.</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">Desc. %</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">IVA %</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Subtotal</th>
                    <th className="pb-2 font-medium w-28 text-right">IVA</th>
                    <th className="pb-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const line = watchedLines[index];
                    const { lineTotal, taxAmount } = calcLine(line ?? field);
                    return (
                      <tr key={field.id} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <Input
                            {...register(`lines.${index}.description`, { required: true })}
                            placeholder="Descripción del producto o servicio"
                            aria-invalid={!!errors.lines?.[index]?.description}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="0.0001"
                            min="0"
                            {...register(`lines.${index}.quantity`)}
                            className="text-right"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            {...register(`lines.${index}.unit_price`)}
                            placeholder="0"
                            className="text-right"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...register(`lines.${index}.discount_rate`)}
                            className="text-right"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`lines.${index}.tax_rate`)}
                            className="text-right"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">
                          {formatCOP(lineTotal)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-muted-foreground">
                          {formatCOP(taxAmount)}
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 flex flex-col items-end gap-1 border-t pt-4">
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="tabular-nums font-medium w-32 text-right">{formatCOP(totals.subtotal)}</span>
              </div>
              <div className="flex gap-8 text-sm">
                <span className="text-muted-foreground">IVA:</span>
                <span className="tabular-nums font-medium w-32 text-right">{formatCOP(totals.taxTotal)}</span>
              </div>
              <div className="flex gap-8 text-base font-semibold border-t pt-2 mt-1">
                <span>Total:</span>
                <span className="tabular-nums w-32 text-right">{formatCOP(totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/cotizaciones")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : isEditing
              ? "Guardar Cambios"
              : "Crear Cotización"}
          </Button>
        </div>
      </form>
    </div>
  );
}
