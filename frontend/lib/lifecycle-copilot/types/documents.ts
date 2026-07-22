export type LcDocumentSummary = {
  id: number;
  project_id: number;
  name: string;
  file_name: string;
  doc_type: string;
  page_count: number;
  char_count: number;
  chunk_count: number;
  file_size_bytes: number;
  status: string;
  uploaded_at?: string | null;
  analyzed_at?: string | null;
};

export type LcAoRequirement = {
  id: string;
  title: string;
  page: string;
  detail: string;
};

export type LcAoGap = {
  requirement_id: string;
  severity: string;
  message: string;
  evidence: string;
};

export type LcAoRecommendation = {
  priority: string;
  title: string;
  action: string;
  rationale: string;
};

export type LcDocumentAnalysis = {
  id: number;
  document_id: number;
  summary: string;
  requirements: LcAoRequirement[];
  gaps: LcAoGap[];
  recommendations: LcAoRecommendation[];
  analyzed_at?: string | null;
};

export type LcChatCitation = {
  document_name: string;
  page: string;
  excerpt: string;
  score?: number | null;
};

export type LcChatMessage = {
  id: number;
  project_id: number;
  role: "user" | "assistant" | string;
  content: string;
  citations: LcChatCitation[];
  created_at?: string | null;
};

export type LcChatAskResponse = {
  answer: LcChatMessage;
  citations: LcChatCitation[];
};
