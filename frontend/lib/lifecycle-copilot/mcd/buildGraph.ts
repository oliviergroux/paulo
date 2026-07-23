import type { Edge, Node } from "@xyflow/react";

import type { LcMcdGraph } from "@/lib/lifecycle-copilot/types/mcd";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 200;
const GAP_X = 100;
const GAP_Y = 80;

export function buildMcdFlowGraph(
  graph: LcMcdGraph,
  options: { showAllColumns: boolean; selectedTable: string | null }
): { nodes: Node[]; edges: Edge[] } {
  const tableNames = graph.tables.map((table) => table.name);
  const levels = computeLevels(graph, tableNames);
  const byLevel = groupByLevel(tableNames, levels);
  const positions = computePositions(byLevel);

  const nodes: Node[] = graph.tables.map((table) => ({
    id: table.name,
    type: "mcdTable",
    position: positions.get(table.name) || { x: 0, y: 0 },
    data: {
      table,
      showAllColumns: options.showAllColumns,
      selected: options.selectedTable === table.name,
    },
  }));

  const edges: Edge[] = graph.relationships.map((relationship, index) => {
    const highlighted =
      options.selectedTable === relationship.from_table ||
      options.selectedTable === relationship.to_table;
    const isManual = relationship.source === "manual";

    const fromCol = relationship.from_column?.trim();
    const toCol = relationship.to_column?.trim();
    let label = "relation";
    if (fromCol && toCol) label = `${fromCol} → ${toCol}`;
    else if (fromCol) label = fromCol;
    else if (toCol) label = `→ ${toCol}`;

    return {
      id:
        relationship.id != null
          ? `manual-${relationship.id}`
          : `edge-${index}-${relationship.from_table}-${relationship.to_table}`,
      source: relationship.from_table,
      target: relationship.to_table,
      label,
      type: "smoothstep",
      animated: highlighted,
      style: {
        stroke: highlighted ? "#0d9488" : isManual ? "#0f766e" : "#64748b",
        strokeWidth: highlighted ? 2.5 : isManual ? 2 : 1.5,
        strokeDasharray: isManual ? "6 4" : undefined,
      },
      labelStyle: {
        fill: highlighted ? "#0f766e" : "#475569",
        fontSize: 11,
        fontWeight: highlighted ? 600 : 500,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.92,
      },
      data: { relationship },
    };
  });

  return { nodes, edges };
}

function computeLevels(graph: LcMcdGraph, tableNames: string[]): Map<string, number> {
  const incoming = new Map<string, number>();
  tableNames.forEach((name) => incoming.set(name, 0));

  graph.relationships.forEach((relationship) => {
    if (incoming.has(relationship.to_table)) {
      incoming.set(relationship.to_table, (incoming.get(relationship.to_table) || 0) + 1);
    }
  });

  const levels = new Map<string, number>();
  const queue = tableNames.filter((name) => (incoming.get(name) || 0) === 0);
  if (queue.length === 0) {
    tableNames.forEach((name, index) => levels.set(name, index % 3));
    return levels;
  }

  queue.forEach((name) => levels.set(name, 0));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const level = levels.get(current) || 0;
    graph.relationships
      .filter((relationship) => relationship.from_table === current)
      .forEach((relationship) => {
        const nextLevel = level + 1;
        const existing = levels.get(relationship.to_table);
        if (existing === undefined || existing < nextLevel) {
          levels.set(relationship.to_table, nextLevel);
        }
        if (!visited.has(relationship.to_table)) {
          queue.push(relationship.to_table);
        }
      });
  }

  tableNames.forEach((name) => {
    if (!levels.has(name)) levels.set(name, 0);
  });

  return levels;
}

function groupByLevel(tableNames: string[], levels: Map<string, number>) {
  const byLevel = new Map<number, string[]>();
  tableNames.forEach((name) => {
    const level = levels.get(name) || 0;
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(name);
  });
  byLevel.forEach((names) => names.sort((a, b) => a.localeCompare(b)));
  return byLevel;
}

function computePositions(byLevel: Map<number, string[]>) {
  const positions = new Map<string, { x: number; y: number }>();
  byLevel.forEach((names, level) => {
    const rowWidth = names.length * NODE_WIDTH + Math.max(0, names.length - 1) * GAP_X;
    names.forEach((name, index) => {
      positions.set(name, {
        x: index * (NODE_WIDTH + GAP_X) - rowWidth / 2 + NODE_WIDTH / 2,
        y: level * (NODE_HEIGHT + GAP_Y),
      });
    });
  });
  return positions;
}
