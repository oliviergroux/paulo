from typing import Any

from lifecycle_copilot.modules.dictionary import repository


def _normalize_table_name(value: str) -> str:
    return (value or "").strip()


def build_mcd(project_id: int) -> dict[str, Any]:
    entries = repository.list_entries(project_id)
    tables: dict[str, dict[str, Any]] = {}
    relationships: list[dict[str, Any]] = []
    seen_edges: set[tuple[str, str, str, str]] = set()

    for entry in entries:
        table_name = _normalize_table_name(entry["table_name"])
        if not table_name:
            continue

        if table_name not in tables:
            tables[table_name] = {
                "name": table_name,
                "column_count": 0,
                "primary_keys": [],
                "foreign_keys": [],
                "highlight_columns": [],
                "other_columns": [],
            }

        table = tables[table_name]
        table["column_count"] += 1

        column = {
            "name": entry["column_name"],
            "data_type": entry.get("data_type"),
            "description": entry.get("description"),
        }

        if entry.get("is_primary_key"):
            table["primary_keys"].append(column)
        elif entry.get("is_foreign_key") or entry.get("foreign_table"):
            foreign_table = _normalize_table_name(entry.get("foreign_table") or "")
            foreign_column = (entry.get("foreign_column") or "").strip() or None
            table["foreign_keys"].append(
                {
                    **column,
                    "references_table": foreign_table or None,
                    "references_column": foreign_column,
                }
            )
            if foreign_table:
                edge_key = (
                    table_name,
                    entry["column_name"],
                    foreign_table,
                    foreign_column or "",
                )
                if edge_key not in seen_edges:
                    seen_edges.add(edge_key)
                    relationships.append(
                        {
                            "from_table": table_name,
                            "from_column": entry["column_name"],
                            "to_table": foreign_table,
                            "to_column": foreign_column,
                        }
                    )
                if foreign_table not in tables:
                    tables[foreign_table] = {
                        "name": foreign_table,
                        "column_count": 0,
                        "primary_keys": [],
                        "foreign_keys": [],
                        "highlight_columns": [],
                        "other_columns": [],
                        "inferred": True,
                    }
        else:
            table["other_columns"].append(column)
            if len(table["highlight_columns"]) < 3:
                table["highlight_columns"].append(column)

    table_list = sorted(tables.values(), key=lambda item: item["name"].lower())
    for table in table_list:
        table.pop("inferred", None)

    return {
        "table_count": len(table_list),
        "relationship_count": len(relationships),
        "tables": table_list,
        "relationships": relationships,
    }
