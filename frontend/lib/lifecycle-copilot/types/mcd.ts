export type LcMcdColumn = {
  name: string;
  data_type?: string | null;
  description?: string | null;
};

export type LcMcdForeignKey = LcMcdColumn & {
  references_table?: string | null;
  references_column?: string | null;
};

export type LcMcdTable = {
  name: string;
  column_count: number;
  primary_keys: LcMcdColumn[];
  foreign_keys: LcMcdForeignKey[];
  highlight_columns: LcMcdColumn[];
  other_columns: LcMcdColumn[];
};

export type LcMcdRelationship = {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column?: string | null;
};

export type LcMcdGraph = {
  table_count: number;
  relationship_count: number;
  tables: LcMcdTable[];
  relationships: LcMcdRelationship[];
};
