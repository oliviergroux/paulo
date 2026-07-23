"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import McdTableNode from "@/components/lifecycle-copilot/mcd/TableNode";
import { lcFetch, readLcError } from "@/lib/lifecycle-copilot/api";
import { buildMcdFlowGraph } from "@/lib/lifecycle-copilot/mcd/buildGraph";
import type { LcMcdGraph, LcMcdRelationship } from "@/lib/lifecycle-copilot/types/mcd";

const nodeTypes = {
  mcdTable: McdTableNode,
};

type McdViewerProps = {
  projectId: number;
  refreshKey?: number;
};

type PendingConnection = {
  from_table: string;
  to_table: string;
};

export default function McdViewer({ projectId, refreshKey = 0 }: McdViewerProps) {
  const [graph, setGraph] = useState<LcMcdGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [fromColumn, setFromColumn] = useState("");
  const [toColumn, setToColumn] = useState("");
  const [formFrom, setFormFrom] = useState("");
  const [formTo, setFormTo] = useState("");
  const [formFromCol, setFormFromCol] = useState("");
  const [formToCol, setFormToCol] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/dictionary/mcd`);
      if (!response.ok) throw new Error("Impossible de charger le MCD");
      const data = (await response.json()) as LcMcdGraph;
      setGraph(data);
      setFormFrom((current) => current || data.tables[0]?.name || "");
      setFormTo((current) => current || data.tables[1]?.name || data.tables[0]?.name || "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Erreur inconnue");
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph, refreshKey]);

  const flowGraph = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return buildMcdFlowGraph(graph, { showAllColumns, selectedTable });
  }, [graph, showAllColumns, selectedTable]);

  useEffect(() => {
    setNodes(flowGraph.nodes);
    setEdges(flowGraph.edges);
  }, [flowGraph, setNodes, setEdges]);

  const manualRelationships = useMemo(
    () => (graph?.relationships || []).filter((rel) => rel.source === "manual"),
    [graph]
  );

  const tableNames = useMemo(() => (graph?.tables || []).map((table) => table.name), [graph]);

  async function createRelationship(payload: {
    from_table: string;
    to_table: string;
    from_column?: string;
    to_column?: string;
  }) {
    setSaving(true);
    setActionError(null);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/dictionary/mcd/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_table: payload.from_table,
          to_table: payload.to_table,
          from_column: payload.from_column || null,
          to_column: payload.to_column || null,
        }),
      });
      if (!response.ok) {
        const message = await readLcError(response);
        if (response.status === 401) {
          throw new Error("Session expirée ou accès admin requis. Reconnectez-vous sur /login.");
        }
        throw new Error(message);
      }
      setPending(null);
      setFromColumn("");
      setToColumn("");
      await loadGraph();
    } catch (createError) {
      setActionError(
        createError instanceof Error ? createError.message : "Impossible de créer la relation"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRelationship(id: number) {
    await lcFetch(`/v1/projects/${projectId}/dictionary/mcd/relationships/${id}`, {
      method: "DELETE",
    });
    await loadGraph();
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!editMode || !connection.source || !connection.target) return;
      if (connection.source === connection.target) return;
      setPending({ from_table: connection.source, to_table: connection.target });
    },
    [editMode]
  );

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
          <code className="text-teal-700">table_name</code> et{" "}
          <code className="text-teal-700">column_name</code>.
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
            {graph.table_count} tables · {graph.relationship_count} relations (
            {graph.dictionary_relationship_count ?? 0} auto · {graph.manual_relationship_count ?? 0}{" "}
            manuelles)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editMode}
              onChange={(event) => setEditMode(event.target.checked)}
              className="rounded border-slate-300"
            />
            Mode édition relations
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showAllColumns}
              onChange={(event) => setShowAllColumns(event.target.checked)}
              className="rounded border-slate-300"
            />
            Plus de colonnes
          </label>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {editMode ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Glissez d&apos;une table à une autre (poignée bas → poignée haut) pour créer un lien
          manuel. Les liens manuels sont en pointillés verts.
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
        <div className="h-[620px] rounded-3xl border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-sm">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onConnect={onConnect}
            nodesConnectable={editMode}
            connectOnClick={false}
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

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900">Ajouter une relation</h3>
            <p className="text-xs text-slate-500 mt-1">Colonnes optionnelles</p>
            <div className="mt-3 space-y-2">
              <select
                value={formFrom}
                onChange={(event) => setFormFrom(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {tableNames.map((name) => (
                  <option key={`from-${name}`} value={name}>
                    De : {name}
                  </option>
                ))}
              </select>
              <input
                value={formFromCol}
                onChange={(event) => setFormFromCol(event.target.value)}
                placeholder="Colonne source (optionnel)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={formTo}
                onChange={(event) => setFormTo(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {tableNames.map((name) => (
                  <option key={`to-${name}`} value={name}>
                    Vers : {name}
                  </option>
                ))}
              </select>
              <input
                value={formToCol}
                onChange={(event) => setFormToCol(event.target.value)}
                placeholder="Colonne cible (optionnel)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={saving || !formFrom || !formTo || formFrom === formTo}
                onClick={() =>
                  createRelationship({
                    from_table: formFrom,
                    to_table: formTo,
                    from_column: formFromCol,
                    to_column: formToCol,
                  })
                }
                className="w-full rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Créer la relation"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              Relations manuelles ({manualRelationships.length})
            </h3>
            {manualRelationships.length === 0 ? (
              <p className="text-xs text-slate-500 mt-2">Aucune relation manuelle.</p>
            ) : (
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                {manualRelationships.map((rel) => (
                  <ManualRelationItem
                    key={rel.id}
                    relationship={rel}
                    onDelete={() => rel.id && deleteRelationship(rel.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Nouvelle relation</h3>
            <p className="text-sm text-slate-600">
              {pending.from_table} → {pending.to_table}
            </p>
            <input
              value={fromColumn}
              onChange={(event) => setFromColumn(event.target.value)}
              placeholder="Colonne source (optionnel)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={toColumn}
              onChange={(event) => setToColumn(event.target.value)}
              placeholder="Colonne cible (optionnel)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  createRelationship({
                    from_table: pending.from_table,
                    to_table: pending.to_table,
                    from_column: fromColumn,
                    to_column: toColumn,
                  })
                }
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTable ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          Table sélectionnée : <strong>{selectedTable}</strong>
        </div>
      ) : null}
    </div>
  );
}

function ManualRelationItem({
  relationship,
  onDelete,
}: {
  relationship: LcMcdRelationship;
  onDelete: () => void;
}) {
  const label = [relationship.from_column, relationship.to_column].filter(Boolean).join(" → ");
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-2 text-xs">
      <p className="font-medium text-slate-800">
        {relationship.from_table} → {relationship.to_table}
      </p>
      {label ? <p className="text-slate-500 mt-0.5">{label}</p> : null}
      <button
        type="button"
        onClick={onDelete}
        className="mt-2 text-red-600 hover:underline"
      >
        Supprimer
      </button>
    </div>
  );
}
