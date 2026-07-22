from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class TextChunk:
    content: str
    page_start: int
    page_end: int
    chunk_index: int


def chunk_pages(pages: list[tuple[int, str]], max_chars: int = 1200) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    buffer = ""
    page_start = 1
    page_end = 1
    chunk_index = 0

    def flush() -> None:
        nonlocal buffer, page_start, page_end, chunk_index
        cleaned = re.sub(r"\s+", " ", buffer).strip()
        if cleaned:
            chunks.append(
                TextChunk(
                    content=cleaned,
                    page_start=page_start,
                    page_end=page_end,
                    chunk_index=chunk_index,
                )
            )
            chunk_index += 1
        buffer = ""

    for page_number, text in pages:
        paragraphs = [part.strip() for part in re.split(r"\n{2,}", text) if part.strip()]
        if not paragraphs:
            continue
        for paragraph in paragraphs:
            if not buffer:
                page_start = page_number
            page_end = page_number
            candidate = f"{buffer} {paragraph}".strip() if buffer else paragraph
            if len(candidate) <= max_chars:
                buffer = candidate
                continue
            if buffer:
                flush()
            if len(paragraph) <= max_chars:
                buffer = paragraph
                page_start = page_number
                page_end = page_number
                continue
            for index in range(0, len(paragraph), max_chars):
                part = paragraph[index : index + max_chars]
                chunks.append(
                    TextChunk(
                        content=part,
                        page_start=page_number,
                        page_end=page_number,
                        chunk_index=chunk_index,
                    )
                )
                chunk_index += 1
            buffer = ""
    flush()
    return chunks
