export type LcProjectSummary = {
  id: number;
  name: string;
  client_name?: string | null;
  crm_platform?: string | null;
  status: string;
};

export type LcMeta = {
  product: string;
  api_version: string;
  modules: Record<string, string>;
  import_formats: string[];
  object_storage_configured: boolean;
};
