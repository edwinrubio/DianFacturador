import { useState, useRef } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StepCertificateProps {
  onComplete: () => void;
}

export function StepCertificate({ onComplete }: StepCertificateProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFileError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setFileError(null);
    setPassphraseError(null);

    let hasError = false;
    if (!selectedFile) {
      setFileError("Este campo es obligatorio.");
      hasError = true;
    }
    if (!passphrase) {
      setPassphraseError("Este campo es obligatorio.");
      hasError = true;
    }
    if (hasError) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile!);
      formData.append("passphrase", passphrase);
      await api.post("/settings/certificate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onComplete();
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error?.response?.status === 422) {
        setApiError(
          "Certificado inválido o contraseña incorrecta. Verifica que el archivo .p12 y la contraseña sean correctos."
        );
      } else {
        setApiError(
          "Ocurrió un error al guardar. Intenta de nuevo o recarga la página."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Certificado Digital</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="certificate-file">
              Archivo del certificado (.p12 o .pfx)
            </Label>
            <Input
              id="certificate-file"
              ref={fileInputRef}
              type="file"
              accept=".p12,.pfx"
              onChange={handleFileChange}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
            )}
            {fileError && (
              <p className="text-sm font-medium text-destructive">{fileError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate-passphrase">Contraseña del certificado</Label>
            <div className="relative">
              <Input
                id="certificate-passphrase"
                type={showPassword ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pr-10"
                placeholder="Contraseña del archivo .p12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passphraseError && (
              <p className="text-sm font-medium text-destructive">{passphraseError}</p>
            )}
          </div>

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
      </CardContent>
    </Card>
  );
}
