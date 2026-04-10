import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_measure: string;
  unit_price: number;
  discount_rate: number;
  tax_code: string;
  tax_rate: number;
  line_total: number;
  tax_amount: number;
}

export interface InvoiceLineCreate {
  description: string;
  quantity: number;
  unit_measure: string;
  unit_price: number;
  discount_rate: number;
  tax_code: string;
  tax_rate: number;
}

export interface InvoiceListItem {
  id: number;
  number: string | null;
  invoice_type: string;
  client_name: string;
  issue_date: string;
  total: number;
  dian_status: string;
}

export interface Invoice {
  id: number;
  number: string | null;
  invoice_type: string;
  client_id: number | null;
  client_name: string;
  client_document_type: string;
  client_document: string;
  client_email: string | null;
  issue_date: string;
  due_date: string | null;
  payment_method: string;
  notes: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  cufe: string | null;
  dian_status: string;
  dian_response: string | null;
  xml_path: string | null;
  pdf_path: string | null;
  resolution_id: number | null;
  created_at: string;
  lines: InvoiceLine[];
}

export interface InvoiceCreate {
  invoice_type?: string;
  client_id?: number | null;
  client_name: string;
  client_document_type?: string;
  client_document: string;
  client_email?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  payment_method?: string;
  notes?: string | null;
  resolution_id?: number | null;
  lines: InvoiceLineCreate[];
}

export interface InvoiceUpdate extends InvoiceCreate {}

const INVOICES_KEY = "invoices";

export function useInvoices(status?: string, type?: string) {
  return useQuery<InvoiceListItem[]>({
    queryKey: [INVOICES_KEY, { status, type }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (type) params.type = type;
      const res = await api.get("/invoices", { params });
      return res.data;
    },
  });
}

export function useInvoice(id: number) {
  return useQuery<Invoice>({
    queryKey: [INVOICES_KEY, id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, InvoiceCreate>({
    mutationFn: async (data) => {
      const res = await api.post("/invoices", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

export function useUpdateInvoice(id: number) {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, InvoiceUpdate>({
    mutationFn: async (data) => {
      const res = await api.put(`/invoices/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await api.delete(`/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] });
    },
  });
}
