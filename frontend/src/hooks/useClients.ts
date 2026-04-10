import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Client {
  id: number;
  document_type: string;
  document_number: string;
  check_digit: string | null;
  name: string;
  trade_name: string | null;
  fiscal_regime: string;
  fiscal_responsibilities: string;
  address: string;
  city: string;
  department: string;
  email: string;
  phone: string | null;
  is_active: boolean;
}

export interface ClientCreate {
  document_type: string;
  document_number: string;
  name: string;
  trade_name?: string;
  fiscal_regime: string;
  fiscal_responsibilities: string;
  address: string;
  city: string;
  department: string;
  email: string;
  phone?: string;
}

export interface ClientUpdate {
  document_type?: string;
  document_number?: string;
  name?: string;
  trade_name?: string;
  fiscal_regime?: string;
  fiscal_responsibilities?: string;
  address?: string;
  city?: string;
  department?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export function useClients(search?: string) {
  return useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => {
      const params = search ? { q: search } : {};
      const response = await api.get("/clients", { params });
      return response.data;
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientCreate) => {
      const response = await api.post("/clients", data);
      return response.data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ClientUpdate }) => {
      const response = await api.put(`/clients/${id}`, data);
      return response.data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}
