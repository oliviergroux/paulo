from typing import Optional

from pydantic import BaseModel


class ColumnMappingMatch(BaseModel):
    dataset_id: int
    dataset_column_id: int
    dataset_column_name: str
    dictionary_entry_id: Optional[int] = None
    dictionary_table_name: Optional[str] = None
    dictionary_column_name: Optional[str] = None
    confidence: Optional[float] = None
    method: Optional[str] = None


class MappingGapItem(BaseModel):
    dataset_id: Optional[int] = None
    column_name: Optional[str] = None
    table_name: Optional[str] = None


class MappingGaps(BaseModel):
    undocumented_columns: list[MappingGapItem] = []
    missing_in_exports: list[MappingGapItem] = []


class MappingSummary(BaseModel):
    total_columns: int
    mapped_columns: int
    unmapped_columns: int
    coverage_percent: float
    missing_dictionary_columns: int
    matches: list[ColumnMappingMatch] = []
    gaps: MappingGaps


class MappingRunResult(BaseModel):
    mapped_columns: int
    unmapped_columns: int
    total_columns: int
    datasets_processed: int
    matches: list[ColumnMappingMatch] = []
