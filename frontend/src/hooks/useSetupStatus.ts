import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface SetupStatus {
  is_complete: boolean;
  steps: {
    business_profile: boolean;
    certificate: boolean;
    resolution: boolean;
    environment: boolean;
  };
  missing: string[];
}

export function useSetupStatus() {
  const { data, isLoading, refetch } = useQuery<SetupStatus>({
    queryKey: ["setup-status"],
    queryFn: async () => {
      const response = await api.get("/setup/status");
      return response.data;
    },
  });

  return {
    isComplete: data?.is_complete ?? false,
    steps: data?.steps,
    missing: data?.missing ?? [],
    isLoading,
    refetch,
  };
}
