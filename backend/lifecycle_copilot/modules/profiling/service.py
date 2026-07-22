from typing import Any

from lifecycle_copilot.modules.datasets import repository as datasets_repository
from lifecycle_copilot.modules.profiling import repository
from lifecycle_copilot.parsers.tabular import parse_tabular_upload


def compute_profiles(project_id: int, dataset_id: int) -> list[dict[str, Any]]:
    datasets_repository.get_dataset(project_id, dataset_id)
    columns = datasets_repository.get_dataset_columns(dataset_id)
    raw, filename = datasets_repository.get_dataset_file_bytes(project_id, dataset_id)
    headers, rows = parse_tabular_upload(filename, raw)

    header_index = {header.strip(): index for index, header in enumerate(headers)}
    profiles: list[dict[str, Any]] = []

    for column in columns:
        index = header_index.get(column["name"])
        if index is None:
            continue

        values = [
            row[index].strip() if index < len(row) and row[index] is not None else ""
            for row in rows
        ]
        non_empty = [value for value in values if value]
        distinct = sorted(set(non_empty))
        samples = distinct[:5]

        comparable = sorted(non_empty) if non_empty else []
        profiles.append(
            {
                "dataset_column_id": column["id"],
                "total_rows": len(values),
                "null_count": len(values) - len(non_empty),
                "distinct_count": len(distinct),
                "sample_values": samples,
                "min_value": comparable[0] if comparable else None,
                "max_value": comparable[-1] if comparable else None,
            }
        )

    return repository.upsert_profiles(dataset_id, profiles)


def list_profiles(project_id: int, dataset_id: int) -> list[dict[str, Any]]:
    datasets_repository.get_dataset(project_id, dataset_id)
    return repository.list_profiles(dataset_id)
