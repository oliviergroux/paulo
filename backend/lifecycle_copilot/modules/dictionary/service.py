from typing import Any, Optional

from lifecycle_copilot.modules.dictionary import repository
from lifecycle_copilot.parsers.tabular import normalize_header, parse_tabular_upload

HEADER_ALIASES: dict[str, list[str]] = {
    "table_name": ["table_name", "table", "nom_table", "objet", "entite"],
    "column_name": ["column_name", "column", "champ", "field", "nom_champ"],
    "data_type": ["data_type", "type", "datatype", "type_donnee"],
    "description": ["description", "desc", "libelle", "label"],
    "is_primary_key": ["is_primary_key", "primary_key", "pk", "cle_primaire"],
    "is_foreign_key": ["is_foreign_key", "foreign_key", "fk", "cle_etrangere"],
    "foreign_table": ["foreign_table", "ref_table", "table_reference"],
    "foreign_column": ["foreign_column", "ref_column", "colonne_reference"],
}


def _parse_bool(value: str) -> bool:
    normalized = (value or "").strip().lower()
    return normalized in {"1", "true", "yes", "oui", "y", "x", "pk", "fk"}


def _resolve_header_map(headers: list[str]) -> dict[str, int]:
    normalized_headers = {normalize_header(header): index for index, header in enumerate(headers)}
    mapping: dict[str, int] = {}

    for field, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            if alias in normalized_headers:
                mapping[field] = normalized_headers[alias]
                break

    if "table_name" not in mapping or "column_name" not in mapping:
        raise ValueError("missing_required_columns")

    return mapping


def _cell(row: list[str], index: Optional[int]) -> str:
    if index is None or index >= len(row):
        return ""
    return (row[index] or "").strip()


def import_dictionary_file(
    project_id: int,
    filename: str,
    raw: bytes,
) -> dict[str, Any]:
    headers, rows = parse_tabular_upload(filename, raw)
    header_map = _resolve_header_map(headers)

    entries: list[dict[str, Any]] = []
    for row in rows:
        table_name = _cell(row, header_map.get("table_name"))
        column_name = _cell(row, header_map.get("column_name"))

        if not table_name or not column_name:
            continue

        entries.append(
            {
                "table_name": table_name,
                "column_name": column_name,
                "data_type": _cell(row, header_map.get("data_type")) or None,
                "description": _cell(row, header_map.get("description")) or None,
                "is_primary_key": _parse_bool(_cell(row, header_map.get("is_primary_key"))),
                "is_foreign_key": _parse_bool(_cell(row, header_map.get("is_foreign_key"))),
                "foreign_table": _cell(row, header_map.get("foreign_table")) or None,
                "foreign_column": _cell(row, header_map.get("foreign_column")) or None,
            }
        )

    if not entries:
        raise ValueError("no_valid_rows")

    return repository.replace_entries(project_id, entries, filename)


def list_entries(project_id: int, table_name: Optional[str] = None):
    return repository.list_entries(project_id, table_name)


def list_tables(project_id: int):
    return repository.list_tables(project_id)
