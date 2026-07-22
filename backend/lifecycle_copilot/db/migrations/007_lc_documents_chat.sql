-- Lifecycle Copilot — documents, RAG chunks, chat (PR9-PR12)

CREATE TABLE IF NOT EXISTS lc_documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    doc_type VARCHAR(64) NOT NULL DEFAULT 'appel_offre',
    storage_key VARCHAR(512),
    raw_file BYTEA,
    page_count INTEGER NOT NULL DEFAULT 0,
    char_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ready',
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_documents_project
ON lc_documents (project_id, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS lc_document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES lc_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    page_start INTEGER NOT NULL DEFAULT 1,
    page_end INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lc_document_analyses (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES lc_documents(id) ON DELETE CASCADE,
    summary TEXT,
    requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
    gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lc_chat_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES lc_projects(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    citations JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lc_chat_messages_project
ON lc_chat_messages (project_id, created_at ASC);
