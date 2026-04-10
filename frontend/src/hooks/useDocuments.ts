import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DocumentListItem {
  id: number;
  source: "invoice" | "quotation";
  number: string;
  document_type: string;
  client_name: string;
  client_document: string;
  issue_date: string;
  total: number;
  status: string;
  has_pdf: boolean;
  has_xml: boolean;
}

export interface DocumentFilters {
  type?: string;
  status?: string;
  q?: string;
  from_date?: string;
  to_date?: string;
}

const DOCUMENTS_KEY = "documents";

export function useDocuments(filters?: DocumentFilters) {
  return useQuery<DocumentListItem[]>({
    queryKey: [DOCUMENTS_KEY, filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.type) params.type = filters.type;
      if (filters?.status) params.status = filters.status;
      if (filters?.q) params.q = filters.q;
      if (filters?.from_date) params.from_date = filters.from_date;
      if (filters?.to_date) params.to_date = filters.to_date;
      const res = await api.get("/documents", { params });
      return res.data;
    },
  });
}
