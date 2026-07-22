from typing import Optional

from pydantic import BaseModel


class DictionaryEntry(BaseModel):
    id: int
    project_id: int
    table_name: str
    column_name: str
    data_type: Optional[str] = None
    description: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False
    foreign_table: Optional[str] = None
    foreign_column: Optional[str] = None
    source_file_name: Optional[str] = None
    source_row_number: Optional[int] = None


class DictionaryTableSummary(BaseModel):
    table_name: str
    column_count: int


class DictionaryImportResult(BaseModel):
    imported_rows: int
    table_count: int
    column_count: int
    source_file_name: str


class McdColumn(BaseModel):
    name: str
    data_type: Optional[str] = None
    description: Optional[str] = None


class McdForeignKey(McdColumn):
    references_table: Optional[str] = None
    references_column: Optional[str] = None


class McdTable(BaseModel):
    name: str
    column_count: int
    primary_keys: list[McdColumn] = []
    foreign_keys: list[McdForeignKey] = []
    highlight_columns: list[McdColumn] = []
    other_columns: list[McdColumn] = []


class McdRelationship(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: Optional[str] = None


class McdGraph(BaseModel):
    table_count: int
    relationship_count: int
    tables: list[McdTable]
    relationships: list[McdRelationship]
