"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import McdTableNode from "@/components/lifecycle-copilot/mcd/TableNode";
import { lcFetch } from "@/lib/lifecycle-copilot/api";
import { buildMcdFlowGraph } from "@/lib/lifecycle-copilot/mcd/buildGraph";
import type { LcMcdGraph } from "@/lib/lifecycle-copilot/types/mcd";

const nodeTypes = {
  mcdTable: McdTableNode,
};

type McdViewerProps = {
  projectId: number;
  refreshKey?: number;
};

export default function McdViewer({ projectId, refreshKey = 0 }: McdViewerProps) {
  const [graph, setGraph] = useState<LcMcdGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    lcFetch(`/v1/projects/${projectId}/dictionary/mcd`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Impossible de charger le MCD");
        }
        return response.json() as Promise<LcMcdGraph>;
      })
      .then(setGraph)
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : "Erreur inconnue");
        setGraph(null);
      })
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  const flowGraph = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return buildMcdFlowGraph(graph, { showAllColumns, selectedTable });
  }, [graph, showAllColumns, selectedTable]);

  useEffect(() => {
    setNodes(flowGraph.nodes);
    setEdges(flowGraph.edges);
  }, [flowGraph, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedTable((current) => (current === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
        Génération du MCD…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
        {error}
      </div>
    );
  }

  if (!graph || graph.table_count === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center">
        <p className="text-lg font-semibold text-slate-900">MCD vide</p>
        <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-6">
          Importez d&apos;abord un dictionnaire avec les colonnes{" "}
          <code className="text-teal-700">table_name</code>,{" "}
          <code className="text-teal-700">column_name</code> et idéalement les clés PK/FK
          (<code className="text-teal-700">foreign_table</code>,{" "}
          <code className="text-teal-700">foreign_column</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="font-semibold text-slate-900">Modèle conceptuel de données</p>
          <p className="text-sm text-slate-500 mt-1">
            {graph.table_count} tables · {graph.relationship_count} relations · cliquez une table
            pour surligner ses liens
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showAllColumns}
            onChange={(event) => setShowAllColumns(event.target.checked)}
            className="rounded border-slate-300"
          />
          Afficher plus de colonnes
        </label>
      </div>

      <div className="h-[620px] rounded-3xl border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesDraggable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={() => "#0f766e"}
            maskColor="rgba(15, 23, 42, 0.08)"
            className="!bg-white/90 !border !border-slate-200 !rounded-xl"
          />
        </ReactFlow>
      </div>

      {selectedTable ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Table sélectionnée : <strong>{selectedTable}</strong> — relations surlignées en vert.
        </div>
      ) : null}
    </div>
  );
}
