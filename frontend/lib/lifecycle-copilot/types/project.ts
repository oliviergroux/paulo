export type LcProjectSummary = {
  id: number;
  name: string;
  client_name?: string | null;
  crm_platform?: string | null;
  status: string;
};

export type LcProjectDetail = LcProjectSummary & {
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LcMeta = {
  product: string;
  api_version: string;
  modules: Record<string, string>;
  import_formats: string[];
  object_storage_configured: boolean;
};

export type LcDictionaryEntry = {
  id: number;
  project_id: number;
  table_name: string;
  column_name: string;
  data_type?: string | null;
  description?: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  foreign_table?: string | null;
  foreign_column?: string | null;
};

export type LcDictionaryTableSummary = {
  table_name: string;
  column_count: number;
};

export type LcDictionaryImportResult = {
  imported_rows: number;
  table_count: number;
  column_count: number;
  source_file_name: string;
};

export type LcDatasetColumn = {
  id: number;
  dataset_id: number;
  name: string;
  position: number;
  inferred_type?: string | null;
};

export type LcDatasetSummary = {
  id: number;
  project_id: number;
  name: string;
  file_name: string;
  file_format: string;
  row_count: number;
  column_count: number;
  file_size_bytes: number;
  status: string;
  imported_at?: string | null;
  has_local_copy: boolean;
};

export type LcDatasetDetail = LcDatasetSummary & {
  columns: LcDatasetColumn[];
  profiles?: LcColumnProfile[];
};

export type LcColumnProfile = {
  id: number;
  dataset_column_id: number;
  column_name?: string | null;
  total_rows: number;
  null_count: number;
  distinct_count: number;
  sample_values: string[];
  min_value?: string | null;
  max_value?: string | null;
  computed_at?: string | null;
};
