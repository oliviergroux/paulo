import re
from datetime import datetime
from typing import Any

from lifecycle_copilot.modules.datasets import repository
from lifecycle_copilot.parsers.tabular import detect_tabular_format, parse_tabular_upload
from lifecycle_copilot.storage.client import build_storage_key, upload_bytes


def _infer_type(values: list[str]) -> str:
    non_empty = [value.strip() for value in values if value and value.strip()]
    if not non_empty:
        return "empty"

    lowered = {value.lower() for value in non_empty}
    if lowered <= {"true", "false", "0", "1", "oui", "non", "yes", "no"}:
        return "boolean"

    if all(re.fullmatch(r"-?\d+", value) for value in non_empty):
        return "integer"

    if all(re.fullmatch(r"-?\d+(?:[.,]\d+)?", value.replace(",", ".")) for value in non_empty):
        return "float"

    date_patterns = (
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
    )
    parsed = 0
    for value in non_empty[:20]:
        for pattern in date_patterns:
            try:
                datetime.strptime(value, pattern)
                parsed += 1
                break
            except ValueError:
                continue
    if parsed >= max(1, len(non_empty[:20]) // 2):
        return "date"

    return "string"


def _column_values(rows: list[list[str]], index: int) -> list[str]:
    return [row[index] if index < len(row) else "" for row in rows]


def import_dataset_file(
    project_id: int,
    name: str,
    filename: str,
    raw: bytes,
) -> dict[str, Any]:
    file_format = detect_tabular_format(filename)
    if not file_format:
        raise ValueError("unsupported_format")

    headers, rows = parse_tabular_upload(filename, raw)
    headers = [header.strip() for header in headers if header.strip()]
    if not headers:
        raise ValueError("missing_headers")

    inferred_types = [
        _infer_type(_column_values(rows, index))
        for index in range(len(headers))
    ]

    storage_key = None
    try:
        key = build_storage_key(project_id, "datasets", filename)
        upload_bytes(key, raw, content_type=_content_type(file_format))
        storage_key = key
    except RuntimeError:
        storage_key = None

    dataset = repository.create_dataset(
        project_id=project_id,
        name=name.strip() or filename,
        filename=filename,
        file_format=file_format,
        raw=raw,
        storage_key=storage_key,
        headers=headers,
        inferred_types=inferred_types,
        row_count=len(rows),
    )
    dataset["columns"] = repository.get_dataset_columns(dataset["id"])

    from lifecycle_copilot.modules.profiling import service as profiling_service

    try:
        dataset["profiles"] = profiling_service.compute_profiles(project_id, dataset["id"])
    except Exception:
        dataset["profiles"] = []

    from lifecycle_copilot.modules.mapping import service as mapping_service
    from lifecycle_copilot.modules.quality import service as quality_service

    try:
        mapping_service.run_mapping(project_id, dataset["id"])
    except Exception:
        pass
    try:
        quality_service.compute_quality(project_id)
    except Exception:
        pass

    return dataset


def _content_type(file_format: str) -> str:
    if file_format == "xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return "text/csv"


def list_datasets(project_id: int):
    return repository.list_datasets(project_id)


def get_dataset(project_id: int, dataset_id: int):
    dataset = repository.get_dataset(project_id, dataset_id)
    dataset["columns"] = repository.get_dataset_columns(dataset_id)
    return dataset


def delete_dataset(project_id: int, dataset_id: int):
    repository.delete_dataset(project_id, dataset_id)
