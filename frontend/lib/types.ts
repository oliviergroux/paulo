export type RequestItem = {
  id: number;
  phone: string;
  transcription: string;
  category: string;
  subtype: string;
  status: string;
  created_at: string;
  handled_at?: string | null;
  assigned_partner_id?: number | null;
  partner_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
};

export type PartnerSummary = {
  id: number;
  name: string;
  category: string;
  subtype: string;
  is_active: boolean;
};

export type PartnerDetail = PartnerSummary & {
  siret?: string;
  phone?: string;
  phone_type?: string;
  address?: string;
  assigned_requests_count?: number;
  access_token?: string;
  created_at?: string;
};

export type ClientItem = {
  id: number;
  phone: string;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  created_at?: string;
  updated_at?: string;
  total_requests?: number;
  last_request_at?: string | null;
};

export type UserRole = "admin" | "mairie";

export type AdminNav = "dashboard" | "mairie" | "partners" | "clients";
