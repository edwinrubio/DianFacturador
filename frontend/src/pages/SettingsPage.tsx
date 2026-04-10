import { useState } from "react";
import { useNavigate } from "react-router";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StepBusiness } from "@/components/onboarding/StepBusiness";
import { StepCertificate } from "@/components/onboarding/StepCertificate";
import { StepResolution } from "@/components/onboarding/StepResolution";
import { StepEnvironment } from "@/components/onboarding/StepEnvironment";

const STEP_TITLES = [
  "Datos de la Empresa",
  "Certificado Digital",
  "Resolución de Facturación",
  "Entorno DIAN",
] as const;

const TOTAL_STEPS = 4;

export default function SettingsPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  const handleStepComplete = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    } else {
      setCompleted(true);
    }
  };

  const progressValue = (step / TOTAL_STEPS) * 100;

  if (completed) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h2 className="text-2xl font-semibold">Configuración actualizada</h2>
        <p className="text-sm text-muted-foreground">
          Los cambios se guardaron correctamente.
        </p>
        <Button onClick={() => navigate("/")}>Volver al panel principal</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h2 className="text-2xl font-semibold">Configuración</h2>
      </div>

      <div className="mb-6">
        <Progress value={progressValue} className="w-full" />
        <div className="flex justify-between mt-2">
          {STEP_TITLES.map((title, i) => (
            <button
              key={title}
              type="button"
              onClick={() => setStep((i + 1) as 1 | 2 | 3 | 4)}
              className={`text-xs cursor-pointer ${
                step === i + 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i + 1}. {title}
            </button>
          ))}
        </div>
      </div>

      {step === 1 && <StepBusiness onComplete={handleStepComplete} />}
      {step === 2 && <StepCertificate onComplete={handleStepComplete} />}
      {step === 3 && <StepResolution onComplete={handleStepComplete} />}
      {step === 4 && <StepEnvironment onComplete={handleStepComplete} />}
    </div>
  );
}
