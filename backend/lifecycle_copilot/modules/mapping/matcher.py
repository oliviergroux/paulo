import os
import re
from typing import Any, Optional

from lifecycle_copilot.parsers.tabular import normalize_header


def normalize_name(value: str) -> str:
    return normalize_header(value or "")


def infer_table_candidates(dataset_name: str, file_name: str) -> list[str]:
    candidates: list[str] = []
    for source in (dataset_name or "", file_name or ""):
        base = re.sub(r"\.(csv|xlsx)$", "", source, flags=re.IGNORECASE).strip()
        base = re.sub(r"^(export|extract|data|dump)[_\s-]+", "", base, flags=re.IGNORECASE)
        for token in re.split(r"[\s_\-/]+", base):
            cleaned = token.strip()
            if len(cleaned) <= 2:
                continue
            candidates.append(cleaned)
            if cleaned.lower().endswith("s") and len(cleaned) > 3:
                candidates.append(cleaned[:-1])
    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = candidate.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(candidate)
    return deduped


def table_name_matches(candidate: str, table_name: str) -> bool:
    left = normalize_name(candidate)
    right = normalize_name(table_name)
    if not left or not right:
        return False
    return left == right or left in right or right in left


def score_column_match(
    column_name: str,
    entry: dict[str, Any],
    table_candidates: list[str],
) -> tuple[float, str] | None:
    entry_column = entry["column_name"]
    entry_table = entry["table_name"]
    normalized_column = normalize_name(column_name)
    normalized_entry_column = normalize_name(entry_column)
    table_match = any(table_name_matches(candidate, entry_table) for candidate in table_candidates)

    if normalized_column == normalized_entry_column and table_match:
        return 1.0, "exact_table_column"
    if normalized_column == normalized_entry_column:
        return 0.92, "exact_column"
    if table_match and normalized_entry_column in normalized_column:
        return 0.84, "contains_column"
    if normalized_column.endswith(f"_{normalized_entry_column}") and table_match:
        return 0.8, "suffix_column"
    if normalized_column.endswith("_id") and table_match:
        singular = normalize_name(entry_table.rstrip("s"))
        if singular and normalized_column == f"{singular}_id":
            return 0.78, "inferred_fk"
    return None


def pick_best_matches(
    columns: list[dict[str, Any]],
    dictionary_entries: list[dict[str, Any]],
    dataset_name: str,
    file_name: str,
) -> list[dict[str, Any]]:
    table_candidates = infer_table_candidates(dataset_name, file_name)
    used_entries: set[int] = set()
    results: list[dict[str, Any]] = []

    for column in columns:
        best: tuple[float, str, dict[str, Any]] | None = None
        for entry in dictionary_entries:
            if entry["id"] in used_entries:
                continue
            scored = score_column_match(column["name"], entry, table_candidates)
            if not scored:
                continue
            confidence, method = scored
            if best is None or confidence > best[0]:
                best = (confidence, method, entry)
        if best and best[0] >= 0.75:
            confidence, method, entry = best
            used_entries.add(entry["id"])
            results.append(
                {
                    "dataset_column_id": column["id"],
                    "dataset_column_name": column["name"],
                    "dictionary_entry_id": entry["id"],
                    "dictionary_table_name": entry["table_name"],
                    "dictionary_column_name": entry["column_name"],
                    "confidence": round(confidence, 2),
                    "method": method,
                }
            )
        else:
            results.append(
                {
                    "dataset_column_id": column["id"],
                    "dataset_column_name": column["name"],
                    "dictionary_entry_id": None,
                    "dictionary_table_name": None,
                    "dictionary_column_name": None,
                    "confidence": None,
                    "method": None,
                }
            )

    return results
