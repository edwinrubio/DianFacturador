import { useState } from "react";
import { useNavigate } from "react-router";

import { Progress } from "@/components/ui/progress";
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

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const navigate = useNavigate();

  const handleStepComplete = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
    } else {
      navigate("/");
    }
  };

  const progressValue = (step / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-16 px-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold">Configuración inicial</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Completa los siguientes pasos para comenzar a facturar electrónicamente.
        </p>

        <div className="mt-6">
          <Progress value={progressValue} className="w-full" />
          <p className="text-sm font-semibold mt-2">
            Paso {step} de {TOTAL_STEPS} — {STEP_TITLES[step - 1]}
          </p>
        </div>

        <div className="mt-8">
          {step === 1 && <StepBusiness onComplete={handleStepComplete} />}
          {step === 2 && <StepCertificate onComplete={handleStepComplete} />}
          {step === 3 && <StepResolution onComplete={handleStepComplete} />}
          {step === 4 && <StepEnvironment onComplete={handleStepComplete} />}
        </div>
      </div>
    </div>
  );
}
