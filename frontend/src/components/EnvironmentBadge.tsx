import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function EnvironmentBadge() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/settings");
      return response.data;
    },
  });

  const env = data?.dian_environment;
  if (!env) return null;

  const isProduccion = env === "produccion";

  return (
    <Badge
      variant="outline"
      className={
        isProduccion
          ? "bg-red-100 text-red-800 border-red-300"
          : "bg-yellow-100 text-yellow-800 border-yellow-300"
      }
    >
      {isProduccion ? "PRODUCCIÓN" : "HABILITACIÓN"}
    </Badge>
  );
}
