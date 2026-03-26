import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
const LOOKUP = "01987654321";

function calculateCheckDigit(nit: string): string {
  const digits = nit.replace(/\D/g, "");
  if (!digits) return "";
  const reversed = digits.split("").reverse();
  const sum = reversed.reduce(
    (acc, d, i) => acc + (WEIGHTS[i] || 0) * parseInt(d),
    0
  );
  return LOOKUP[sum % 11];
}

const businessSchema = z.object({
  nit: z
    .string()
    .min(1, "Este campo es obligatorio.")
    .regex(/^\d+$/, "Ingresa solo los dígitos del NIT, sin guiones ni puntos."),
  razon_social: z.string().min(1, "Este campo es obligatorio."),
  fiscal_regime: z.enum(["simplificado", "comun"], {
    required_error: "Este campo es obligatorio.",
  }),
  address: z.string().min(1, "Este campo es obligatorio."),
  city: z.string().min(1, "Este campo es obligatorio."),
  department: z.string().min(1, "Este campo es obligatorio."),
  email: z
    .string()
    .min(1, "Este campo es obligatorio.")
    .email("Ingresa un correo electrónico válido."),
  phone: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface StepBusinessProps {
  onComplete: () => void;
}

export function StepBusiness({ onComplete }: StepBusinessProps) {
  const [checkDigit, setCheckDigit] = useState<string>("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      nit: "",
      razon_social: "",
      fiscal_regime: undefined,
      address: "",
      city: "",
      department: "",
      email: "",
      phone: "",
    },
  });

  const handleNitBlur = (nit: string) => {
    setCheckDigit(calculateCheckDigit(nit));
  };

  const onSubmit = async (data: BusinessFormData) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await api.put("/settings/profile", data);
      onComplete();
    } catch {
      setApiError("Ocurrió un error al guardar. Intenta de nuevo o recarga la página.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Datos de la Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIT</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="900123456"
                      onBlur={(e) => {
                        field.onBlur();
                        handleNitBlur(e.target.value);
                      }}
                    />
                  </FormControl>
                  {checkDigit !== "" && (
                    <p className="text-sm font-semibold text-muted-foreground">
                      Dígito de verificación: {checkDigit}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="razon_social"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mi Empresa S.A.S." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscal_regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Régimen Fiscal</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="" disabled>
                        Selecciona el régimen
                      </option>
                      <option value="simplificado">
                        Régimen Simple de Tributación
                      </option>
                      <option value="comun">Responsable de IVA</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Calle 123 # 45-67" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bogotá" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departamento</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Cundinamarca" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="empresa@ejemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+57 300 000 0000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {apiError && (
              <Alert variant="destructive">
                <AlertDescription>{apiError}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar y continuar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
