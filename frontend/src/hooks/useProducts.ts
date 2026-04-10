import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Product {
  id: number;
  code: string | null;
  description: string;
  unit_measure: string;
  unit_price: number;
  tax_code: string;
  tax_rate: number;
  is_active: boolean;
}

export interface ProductCreate {
  code?: string | null;
  description: string;
  unit_measure: string;
  unit_price: number;
  tax_code: string;
  tax_rate: number;
}

export interface ProductUpdate {
  code?: string | null;
  description?: string;
  unit_measure?: string;
  unit_price?: number;
  tax_code?: string;
  tax_rate?: number;
  is_active?: boolean;
}

export function useProducts(search?: string) {
  return useQuery<Product[]>({
    queryKey: ["products", search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (search) params.q = search;
      const response = await api.get("/products", { params });
      return response.data;
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ProductCreate) => {
      const response = await api.post("/products", data);
      return response.data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ProductUpdate }) => {
      const response = await api.put(`/products/${id}`, data);
      return response.data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
