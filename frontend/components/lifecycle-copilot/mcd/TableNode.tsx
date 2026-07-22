"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";

import type { LcMcdTable } from "@/lib/lifecycle-copilot/types/mcd";

export type McdTableNodeData = {
  table: LcMcdTable;
  showAllColumns: boolean;
  selected: boolean;
};

function ColumnLine({
  prefix,
  name,
  dataType,
  suffix,
}: {
  prefix: string;
  name: string;
  dataType?: string | null;
  suffix?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs leading-5">
      <span className="w-4 shrink-0 text-slate-400">{prefix}</span>
      <div className="min-w-0">
        <span className="font-medium text-slate-800">{name}</span>
        {dataType ? <span className="text-slate-400"> · {dataType}</span> : null}
        {suffix ? <span className="block text-[11px] text-teal-700">{suffix}</span> : null}
      </div>
    </div>
  );
}

function McdTableNodeComponent({ data }: NodeProps) {
  const nodeData = data as McdTableNodeData;
  const { table, showAllColumns, selected } = nodeData;

  return (
    <div
      className={`w-[280px] rounded-2xl border bg-white shadow-md transition ${
        selected ? "border-teal-500 ring-2 ring-teal-200" : "border-slate-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-2 !h-2" />

      <div className="rounded-t-2xl bg-slate-900 px-4 py-3 text-white">
        <p className="font-semibold text-sm truncate">{table.name}</p>
        <p className="text-[11px] text-slate-300 mt-0.5">
          {table.column_count} colonne{table.column_count > 1 ? "s" : ""}
        </p>
      </div>

      <div className="px-4 py-3 space-y-2 max-h-52 overflow-y-auto">
        {table.primary_keys.map((column) => (
          <ColumnLine
            key={`pk-${column.name}`}
            prefix="PK"
            name={column.name}
            dataType={column.data_type}
          />
        ))}

        {table.foreign_keys.map((column) => (
          <ColumnLine
            key={`fk-${column.name}`}
            prefix="FK"
            name={column.name}
            dataType={column.data_type}
            suffix={
              column.references_table
                ? `→ ${column.references_table}${
                    column.references_column ? `.${column.references_column}` : ""
                  }`
                : undefined
            }
          />
        ))}

        {!showAllColumns && table.highlight_columns.length > 0 ? (
          <>
            {table.highlight_columns.map((column) => (
              <ColumnLine
                key={`hl-${column.name}`}
                prefix="·"
                name={column.name}
                dataType={column.data_type}
              />
            ))}
            {table.other_columns.length > table.highlight_columns.length ? (
              <p className="text-[11px] text-slate-400 pt-1">+ autres colonnes masquées</p>
            ) : null}
          </>
        ) : null}

        {showAllColumns
          ? table.other_columns.map((column) => (
              <ColumnLine
                key={`other-${column.name}`}
                prefix="·"
                name={column.name}
                dataType={column.data_type}
              />
            ))
          : null}

        {table.primary_keys.length === 0 && table.foreign_keys.length === 0 ? (
          <p className="text-xs text-slate-400">Aucune clé PK/FK renseignée</p>
        ) : null}
      </div>
    </div>
  );
}

export default memo(McdTableNodeComponent);
