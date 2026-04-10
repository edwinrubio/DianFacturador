import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface QuotationLine {
  id: number;
  quotation_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  tax_code: string;
  tax_rate: number;
  line_total: number;
  tax_amount: number;
}

export interface QuotationLineCreate {
  description: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  tax_code: string;
  tax_rate: number;
}

export interface QuotationListItem {
  id: number;
  number: string;
  client_name: string;
  client_document: string;
  issue_date: string;
  total: number;
  status: string;
}

export interface Quotation {
  id: number;
  number: string;
  client_id: number | null;
  client_name: string;
  client_document: string;
  issue_date: string;
  expiry_date: string | null;
  notes: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  status: string;
  created_at: string;
  lines: QuotationLine[];
}

export interface QuotationCreate {
  client_id?: number | null;
  client_name: string;
  client_document: string;
  issue_date?: string | null;
  expiry_date?: string | null;
  notes?: string | null;
  lines: QuotationLineCreate[];
}

export interface QuotationUpdate extends QuotationCreate {
  status?: string | null;
}

const QUOTATIONS_KEY = "quotations";

export function useQuotations(status?: string) {
  return useQuery<QuotationListItem[]>({
    queryKey: [QUOTATIONS_KEY, { status }],
    queryFn: async () => {
      const params = status ? { status } : {};
      const res = await api.get("/quotations", { params });
      return res.data;
    },
  });
}

export function useQuotation(id: number) {
  return useQuery<Quotation>({
    queryKey: [QUOTATIONS_KEY, id],
    queryFn: async () => {
      const res = await api.get(`/quotations/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation<Quotation, Error, QuotationCreate>({
    mutationFn: async (data) => {
      const res = await api.post("/quotations", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

export function useUpdateQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation<Quotation, Error, QuotationUpdate>({
    mutationFn: async (data) => {
      const res = await api.put(`/quotations/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/quotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUOTATIONS_KEY] });
    },
  });
}
