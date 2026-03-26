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

const resolutionSchema = z
  .object({
    prefix: z.string().min(1, "Este campo es obligatorio."),
    from_number: z.coerce
      .number()
      .int()
      .min(1, "Este campo es obligatorio."),
    to_number: z.coerce
      .number()
      .int()
      .min(1, "Este campo es obligatorio."),
    technical_key: z.string().min(1, "Este campo es obligatorio."),
    valid_from: z.string().min(1, "Este campo es obligatorio."),
    valid_to: z.string().min(1, "Este campo es obligatorio."),
    resolution_number: z.string().optional(),
  })
  .refine((data) => data.from_number < data.to_number, {
    message: "El número desde debe ser menor que el número hasta.",
    path: ["to_number"],
  });

type ResolutionFormData = z.infer<typeof resolutionSchema>;

interface StepResolutionProps {
  onComplete: () => void;
}

export function StepResolution({ onComplete }: StepResolutionProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResolutionFormData>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: {
      prefix: "",
      from_number: undefined,
      to_number: undefined,
      technical_key: "",
      valid_from: "",
      valid_to: "",
      resolution_number: "",
    },
  });

  const onSubmit = async (data: ResolutionFormData) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await api.post("/resolutions", data);
      onComplete();
    } catch {
      setApiError(
        "Ocurrió un error al guardar. Intenta de nuevo o recarga la página."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Resolución de Facturación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefijo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="SETP" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="from_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número desde</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="to_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número hasta</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="5000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="technical_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clave técnica</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="fc8eac422eba16e22ffd8c6f94b3f40a6e38162c" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valid_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha inicio</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valid_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha vencimiento</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolution_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de resolución (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="18760000001" />
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
