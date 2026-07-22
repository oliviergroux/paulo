from typing import Any, Optional

from pydantic import BaseModel, Field


class DatasetColumn(BaseModel):
    id: int
    dataset_id: int
    name: str
    position: int
    inferred_type: Optional[str] = None
    dictionary_entry_id: Optional[int] = None


class DatasetSummary(BaseModel):
    id: int
    project_id: int
    name: str
    file_name: str
    file_format: str
    storage_key: Optional[str] = None
    row_count: int
    column_count: int
    file_size_bytes: int
    status: str
    imported_at: Optional[str] = None
    has_local_copy: bool = False


class DatasetDetail(DatasetSummary):
    columns: list[DatasetColumn] = Field(default_factory=list)


class DatasetImportResult(DatasetDetail):
    pass
