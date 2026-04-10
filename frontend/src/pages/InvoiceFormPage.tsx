import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useInvoice,
  useCreateInvoice,
  useUpdateInvoice,
  type InvoiceCreate,
  type InvoiceUpdate,
} from "@/hooks/useInvoices";

interface LineFormValues {
  description: string;
  quantity: string;
  unit_measure: string;
  unit_price: string;
  discount_rate: string;
  tax_code: string;
  tax_rate: string;
}

interface FormValues {
  invoice_type: string;
  client_name: string;
  client_document_type: string;
  client_document: string;
  client_email: string;
  issue_date: string;
  due_date: string;
  payment_method: string;
  notes: string;
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
  const gross = qty * price;
  const discountAmount = gross * (disc / 100);
  const lineTotal = gross - discountAmount;
  const taxAmount = lineTotal * (taxRate / 100);
  return { gross, discountAmount, lineTotal, taxAmount };
}

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const DEFAULT_LINE: LineFormValues = {
  description: "",
  quantity: "1",
  unit_measure: "94",
  unit_price: "",
  discount_rate: "0",
  tax_code: "01",
  tax_rate: "19",
};

export default function InvoiceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const invoiceId = id ? parseInt(id, 10) : 0;

  const { data: existing, isLoading: loadingExisting } = useInvoice(invoiceId);
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice(invoiceId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      invoice_type: "01",
      client_name: "",
      client_document_type: "31",
      client_document: "",
      client_email: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      payment_method: "10",
      notes: "",
      lines: [{ ...DEFAULT_LINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    if (existing) {
      reset({
        invoice_type: existing.invoice_type,
        client_name: existing.client_name,
        client_document_type: existing.client_document_type,
        client_document: existing.client_document,
        client_email: existing.client_email ?? "",
        issue_date: existing.issue_date,
        due_date: existing.due_date ?? "",
        payment_method: existing.payment_method,
        notes: existing.notes ?? "",
        lines: existing.lines.map((l) => ({
          description: l.description,
          quantity: String(l.quantity),
          unit_measure: l.unit_measure,
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
      const { gross, discountAmount, lineTotal, taxAmount } = calcLine(line);
      return {
        subtotal: acc.subtotal + gross,
        discountTotal: acc.discountTotal + discountAmount,
        lineSubtotal: acc.lineSubtotal + lineTotal,
        taxTotal: acc.taxTotal + taxAmount,
        total: acc.total + lineTotal + taxAmount,
      };
    },
    { subtotal: 0, discountTotal: 0, lineSubtotal: 0, taxTotal: 0, total: 0 }
  );

  async function onSubmit(values: FormValues) {
    const lines = values.lines.map((l) => ({
      description: l.description,
      quantity: parseFloat(l.quantity) || 1,
      unit_measure: l.unit_measure || "94",
      unit_price: parseFloat(l.unit_price) || 0,
      discount_rate: parseFloat(l.discount_rate) || 0,
      tax_code: l.tax_code || "01",
      tax_rate: parseFloat(l.tax_rate) || 19,
    }));

    if (isEditing) {
      const payload: InvoiceUpdate = {
        invoice_type: values.invoice_type,
        client_name: values.client_name,
        client_document_type: values.client_document_type,
        client_document: values.client_document,
        client_email: values.client_email || null,
        issue_date: values.issue_date || null,
        due_date: values.due_date || null,
        payment_method: values.payment_method,
        notes: values.notes || null,
        lines,
      };
      await updateInvoice.mutateAsync(payload);
    } else {
      const payload: InvoiceCreate = {
        invoice_type: values.invoice_type,
        client_name: values.client_name,
        client_document_type: values.client_document_type,
        client_document: values.client_document,
        client_email: values.client_email || null,
        issue_date: values.issue_date || null,
        due_date: values.due_date || null,
        payment_method: values.payment_method,
        notes: values.notes || null,
        lines,
      };
      await createInvoice.mutateAsync(payload);
    }

    navigate("/facturas");
  }

  if (isEditing && loadingExisting) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Cargando factura...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/facturas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-semibold">
          {isEditing ? `Editar Factura ${existing?.number ?? ""}` : "Nueva Factura"}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de documento y condiciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de Documento y Condiciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="invoice_type">Tipo de Documento *</Label>
                <select id="invoice_type" {...register("invoice_type")} className={SELECT_CLASS}>
                  <option value="01">Factura de Venta (01)</option>
                  <option value="91">Nota Crédito (91)</option>
                  <option value="92">Nota Débito (92)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment_method">Forma de Pago *</Label>
                <select id="payment_method" {...register("payment_method")} className={SELECT_CLASS}>
                  <option value="10">Contado (10)</option>
                  <option value="20">Crédito (20)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue_date">Fecha de Emisión</Label>
                <Input id="issue_date" type="date" {...register("issue_date")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date">Fecha de Vencimiento</Label>
                <Input id="due_date" type="date" {...register("due_date")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
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
                <Label htmlFor="client_document_type">Tipo de Documento *</Label>
                <select
                  id="client_document_type"
                  {...register("client_document_type")}
                  className={SELECT_CLASS}
                >
                  <option value="31">NIT (31)</option>
                  <option value="13">Cédula de Ciudadanía (13)</option>
                  <option value="22">Cédula de Extranjería (22)</option>
                  <option value="91">NUIP (91)</option>
                  <option value="11">Registro Civil (11)</option>
                  <option value="41">Pasaporte (41)</option>
                  <option value="42">Doc. Extranjero (42)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client_document">Número de Documento *</Label>
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
                <Label htmlFor="client_email">Correo Electrónico</Label>
                <Input
                  id="client_email"
                  type="email"
                  {...register("client_email")}
                  placeholder="cliente@empresa.com"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notas / Observaciones</Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  rows={2}
                  placeholder="Observaciones, condiciones de pago, etc."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ítems */}
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
                    <th className="pb-2 pr-2 font-medium w-20">U/M</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Precio Unit.</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">Desc. %</th>
                    <th className="pb-2 pr-2 font-medium w-20 text-right">IVA %</th>
                    <th className="pb-2 pr-2 font-medium w-28 text-right">Subtotal</th>
                    <th className="pb-2 font-medium w-24 text-right">IVA</th>
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
                            placeholder="Producto o servicio"
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
                            {...register(`lines.${index}.unit_measure`)}
                            placeholder="94"
                            className="w-16"
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
                <span className="text-muted-foreground">Subtotal bruto:</span>
                <span className="tabular-nums font-medium w-32 text-right">{formatCOP(totals.subtotal)}</span>
              </div>
              {totals.discountTotal > 0 && (
                <div className="flex gap-8 text-sm">
                  <span className="text-muted-foreground">Descuentos:</span>
                  <span className="tabular-nums font-medium w-32 text-right text-destructive">
                    -{formatCOP(totals.discountTotal)}
                  </span>
                </div>
              )}
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
          <Button type="button" variant="outline" onClick={() => navigate("/facturas")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : isEditing
              ? "Guardar Cambios"
              : "Guardar Borrador"}
          </Button>
        </div>
      </form>
    </div>
  );
}
