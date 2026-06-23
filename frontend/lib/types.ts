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
  assigned_service?: string | null;
  partner_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: string | null;
  commune_id?: number | null;
  commune_name?: string | null;
};

export type AssignOption = {
  id: string;
  label: string;
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
  commune_id?: number | null;
  commune_name?: string | null;
  assigned_requests_count?: number;
  access_token?: string;
  created_at?: string;
};

export type CommuneItem = {
  id: number;
  name: string;
  postal_code: string;
  department?: string | null;
  is_active: boolean;
  created_at?: string;
  total_requests?: number;
  active_requests?: number;
  partners_count?: number;
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

export type AdminNav =
  | "dashboard"
  | "mairie"
  | "mairie_archives"
  | "partners"
  | "clients"
  | "communes";
