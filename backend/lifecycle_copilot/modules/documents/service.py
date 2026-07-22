import json
import re
from typing import Any, Optional

from lifecycle_copilot.ai.client import chat_completion, embed_texts, get_openai_client
from lifecycle_copilot.context.builder import build_project_context, project_context_text
from lifecycle_copilot.modules.documents import repository
from lifecycle_copilot.modules.documents.pdf import build_chunks_from_pdf
from lifecycle_copilot.rag.search import search_chunks
from lifecycle_copilot.storage.client import build_storage_key, upload_bytes


def _parse_json_response(raw: str) -> dict[str, Any]:
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


def import_pdf_document(
    project_id: int,
    name: str,
    filename: str,
    doc_type: str,
    raw: bytes,
) -> dict[str, Any]:
    if not filename.lower().endswith(".pdf"):
        raise ValueError("unsupported_format")

    pages, chunks = build_chunks_from_pdf(raw)
    char_count = sum(len(text) for _, text in pages)

    storage_key = None
    try:
        key = build_storage_key(project_id, "documents", filename)
        upload_bytes(key, raw, content_type="application/pdf")
        storage_key = key
    except RuntimeError:
        storage_key = None

    document = repository.create_document(
        project_id=project_id,
        name=name.strip() or filename,
        file_name=filename,
        doc_type=doc_type or "appel_offre",
        raw=raw,
        storage_key=storage_key,
        page_count=len(pages),
        char_count=char_count,
    )

    chunk_payloads = [
        {
            "chunk_index": chunk.chunk_index,
            "page_start": chunk.page_start,
            "page_end": chunk.page_end,
            "content": chunk.content,
            "embedding": [],
        }
        for chunk in chunks
    ]

    if get_openai_client() and chunk_payloads:
        try:
            embeddings = embed_texts([item["content"] for item in chunk_payloads])
            for index, embedding in enumerate(embeddings):
                chunk_payloads[index]["embedding"] = embedding
        except Exception:
            pass

    repository.replace_chunks(document["id"], chunk_payloads)
    document["chunk_count"] = len(chunk_payloads)

    try:
        analyze_document(project_id, document["id"])
    except Exception:
        pass

    return document


def analyze_document(project_id: int, document_id: int) -> dict[str, Any]:
    document = repository.get_document(project_id, document_id)
    chunks = repository.list_chunks_for_document(document_id)
    excerpt = "\n\n".join(
        f"[p.{chunk['page_start']}-{chunk['page_end']}] {chunk['content']}"
        for chunk in chunks[:20]
    )
    context = project_context_text(project_id)

    if get_openai_client():
        prompt = f"""
Tu es consultant CRM. Analyse cet appel d'offre PDF et croise-le avec l'audit Lifecycle Copilot.

Contexte audit :
{context}

Extrait AO :
{excerpt}

Retourne UNIQUEMENT du JSON valide :
{{
  "summary": "string",
  "requirements": [{{"id": "R1", "title": "...", "page": "p.3", "detail": "..."}}],
  "gaps": [{{"requirement_id": "R1", "severity": "high|medium|low", "message": "...", "evidence": "..."}}],
  "recommendations": [{{"priority": "high|medium|low", "title": "...", "action": "...", "rationale": "..."}}]
}}
"""
        try:
            raw = chat_completion(prompt)
            parsed = _parse_json_response(raw)
            analysis = {
                "summary": parsed.get("summary") or "",
                "requirements": parsed.get("requirements") or [],
                "gaps": parsed.get("gaps") or [],
                "recommendations": parsed.get("recommendations") or [],
            }
            return repository.save_analysis(document_id, analysis)
        except Exception:
            pass

    analysis = _fallback_analysis(project_id, document, excerpt)
    return repository.save_analysis(document_id, analysis)


def _fallback_analysis(
    project_id: int,
    document: dict[str, Any],
    excerpt: str,
) -> dict[str, Any]:
    context = build_project_context(project_id)
    quality_score = (context.get("quality") or {}).get("overall_score")
    coverage = (context.get("mapping") or {}).get("coverage_percent")
    return {
        "summary": (
            f"Analyse heuristique de {document['name']} ({document['page_count']} pages). "
            f"Score qualité projet {quality_score}/100, couverture mapping {coverage}%."
        ),
        "requirements": [
            {
                "id": "R1",
                "title": "Exigences data CRM",
                "page": "p.1+",
                "detail": "Extrait disponible pour revue manuelle.",
            }
        ],
        "gaps": [
            {
                "requirement_id": "R1",
                "severity": "medium",
                "message": "Écart potentiel entre exigences AO et qualité des exports analysés.",
                "evidence": (context.get("quality") or {}).get("summary") or "",
            }
        ],
        "recommendations": [
            {
                "priority": "high",
                "title": "Aligner gouvernance data sur l'AO",
                "action": "Mapper les exigences AO aux colonnes documentées et aux datasets importés.",
                "rationale": excerpt[:280] or "Document importé sans OpenAI.",
            }
        ],
    }


def list_documents(project_id: int):
    return repository.list_documents(project_id)


def get_document_analysis(project_id: int, document_id: int):
    repository.get_document(project_id, document_id)
    analysis = repository.get_latest_analysis(document_id)
    if not analysis:
        return analyze_document(project_id, document_id)
    return analysis


def delete_document(project_id: int, document_id: int):
    repository.delete_document(project_id, document_id)


def retrieve_relevant_chunks(project_id: int, question: str, limit: int = 6) -> list[dict[str, Any]]:
    chunks = repository.list_chunks_for_project(project_id)
    if not chunks:
        return []

    embedded_chunks = [chunk for chunk in chunks if chunk.get("embedding")]
    if get_openai_client() and embedded_chunks:
        try:
            query_embedding = embed_texts([question])[0]
            return search_chunks(query_embedding, embedded_chunks, limit=limit)
        except Exception:
            pass

    lowered = question.lower()
    tokens = [token for token in lowered.split() if len(token) > 3]
    scored = []
    for chunk in chunks:
        content = (chunk.get("content") or "").lower()
        score = sum(content.count(token) for token in tokens)
        if score:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [dict(item[1]) for item in scored[:limit]]
