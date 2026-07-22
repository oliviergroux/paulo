from typing import Any, Optional

from pydantic import BaseModel


class ColumnProfile(BaseModel):
    id: int
    dataset_column_id: int
    column_name: Optional[str] = None
    total_rows: int
    null_count: int
    distinct_count: int
    sample_values: list[Any] = []
    min_value: Optional[str] = None
    max_value: Optional[str] = None
    computed_at: Optional[str] = None
