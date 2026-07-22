from typing import Any

from lifecycle_copilot.ai.client import chat_completion, get_openai_client
from lifecycle_copilot.context.builder import project_context_text
from lifecycle_copilot.modules.chat import repository
from lifecycle_copilot.modules.documents import service as documents_service
from lifecycle_copilot.modules.projects.repository import require_project


def _format_citations(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    for chunk in chunks:
        page_label = (
            f"p.{chunk['page_start']}"
            if chunk["page_start"] == chunk["page_end"]
            else f"p.{chunk['page_start']}-{chunk['page_end']}"
        )
        citations.append(
            {
                "document_name": chunk.get("document_name") or chunk.get("file_name") or "Document",
                "page": page_label,
                "excerpt": (chunk.get("content") or "")[:320],
                "score": chunk.get("score"),
            }
        )
    return citations


def _fallback_answer(question: str, chunks: list[dict[str, Any]], context_text: str) -> str:
    lines = [
        "Réponse générée sans OpenAI (mode règles).",
        "",
        f"**Question :** {question}",
        "",
        "**Contexte audit disponible :**",
        context_text[:1200],
        "",
    ]
    if chunks:
        lines.append("**Passages documentaires pertinents :**")
        for chunk in chunks[:3]:
            page = chunk.get("page_start")
            lines.append(f"- p.{page} : {(chunk.get('content') or '')[:220]}")
    else:
        lines.append("Aucun extrait documentaire trouvé. Importez un PDF et posez une question plus ciblée.")
    return "\n".join(lines)


def ask_question(project_id: int, question: str) -> dict[str, Any]:
    require_project(project_id)
    question = (question or "").strip()
    if not question:
        raise ValueError("empty_question")

    repository.add_message(project_id, "user", question)

    chunks = documents_service.retrieve_relevant_chunks(project_id, question, limit=6)
    citations = _format_citations(chunks)
    context_text = project_context_text(project_id)
    chunk_text = "\n\n".join(
        f"[{citation['document_name']} {citation['page']}] {citation['excerpt']}"
        for citation in citations
    )

    if get_openai_client():
        prompt = f"""
Tu es l'assistant consultant Lifecycle Copilot. Réponds en français, de façon actionnable.

Règles :
- Base-toi sur le contexte audit ET les extraits documentaires.
- Cite les pages quand tu t'appuies sur l'AO (ex: "p.12").
- Si l'information manque, dis-le clairement.

Contexte audit :
{context_text}

Extraits documentaires :
{chunk_text or "Aucun document PDF indexé."}

Question :
{question}
"""
        try:
            answer = chat_completion(prompt)
        except Exception:
            answer = _fallback_answer(question, chunks, context_text)
    else:
        answer = _fallback_answer(question, chunks, context_text)

    assistant = repository.add_message(project_id, "assistant", answer, citations)
    return {
        "answer": assistant,
        "citations": citations,
    }


def list_messages(project_id: int):
    return repository.list_messages(project_id)


def clear_messages(project_id: int):
    repository.clear_messages(project_id)
