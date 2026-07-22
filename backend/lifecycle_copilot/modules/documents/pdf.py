import io
from typing import Optional

from lifecycle_copilot.rag.chunker import chunk_pages


def extract_pdf_pages(raw: bytes) -> list[tuple[int, str]]:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ValueError("pdf_support_unavailable") from exc

    reader = PdfReader(io.BytesIO(raw))
    pages: list[tuple[int, str]] = []
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        pages.append((index, text))
    return pages


def build_chunks_from_pdf(raw: bytes) -> tuple[list[tuple[int, str]], list]:
    pages = extract_pdf_pages(raw)
    if not any(text for _, text in pages):
        raise ValueError("pdf_text_empty")
    chunks = chunk_pages(pages)
    return pages, chunks
