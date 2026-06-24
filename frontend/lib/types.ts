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
  postal_code?: string | null;
  city?: string | null;
  email?: string | null;
  commune_id?: number | null;
  commune_name?: string | null;
  validation_status?: string | null;
  validation_confidence?: number | null;
  validation_report?: Record<string, unknown> | null;
  sirene_snapshot?: Record<string, unknown> | null;
  validated_at?: string | null;
  assigned_requests_count?: number;
  access_token?: string;
  created_at?: string;
};

export type CommuneItem = {
  id: number;
  name: string;
  postal_code: string;
  department_code?: string | null;
  department_label?: string | null;
  email?: string | null;
  phone?: string | null;
  insee_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  email?: string | null;
  opt_in_email?: boolean;
  opt_in_sms?: boolean;
  opt_in_email_at?: string | null;
  opt_in_sms_at?: string | null;
  commune_id?: number | null;
  commune_name?: string | null;
  created_at?: string;
  updated_at?: string;
  total_requests?: number;
  last_request_at?: string | null;
};

export type ClientEditPayload = {
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  email: string | null;
  opt_in_email: boolean;
  opt_in_sms: boolean;
  opt_in_email_at: string | null;
  opt_in_sms_at: string | null;
};

/** Alias UI — table backend reste `clients`. */
export type ContactItem = ClientItem;

export type UserRole = "admin" | "mairie";

export type AdminNav =
  | "dashboard"
  | "demandes"
  | "mairie"
  | "mairie_archives"
  | "partners"
  | "contacts"
  | "communes";
