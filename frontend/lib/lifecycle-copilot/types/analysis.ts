export type LcMappingMatch = {
  dataset_id: number;
  dataset_column_id: number;
  dataset_column_name: string;
  dictionary_entry_id?: number | null;
  dictionary_table_name?: string | null;
  dictionary_column_name?: string | null;
  confidence?: number | null;
  method?: string | null;
};

export type LcMappingSummary = {
  total_columns: number;
  mapped_columns: number;
  unmapped_columns: number;
  coverage_percent: number;
  missing_dictionary_columns: number;
  matches: LcMappingMatch[];
  gaps: {
    undocumented_columns: Array<{ dataset_id?: number; column_name?: string }>;
    missing_in_exports: Array<{ table_name?: string; column_name?: string }>;
  };
};

export type LcQualityAlert = {
  severity: string;
  code: string;
  dataset_id?: number | null;
  dataset_name?: string | null;
  column_name?: string | null;
  message: string;
};

export type LcQualityReport = {
  overall_score: number;
  alert_count: number;
  alerts: LcQualityAlert[];
  summary: string;
  mapping_coverage_percent?: number | null;
  computed_at?: string | null;
};

export type LcRecommendation = {
  category: string;
  priority: string;
  title: string;
  detail: string;
  action: string;
};

export type LcRecommendationsReport = {
  project_name?: string;
  recommendation_count: number;
  recommendations: LcRecommendation[];
  created_at?: string | null;
};

export type LcSynthesisReport = {
  content_markdown: string;
  generated_by?: string;
  created_at?: string | null;
};
