"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { lcFetch } from "@/lib/lifecycle-copilot/api";
import type { LcChatMessage } from "@/lib/lifecycle-copilot/types/documents";

type ChatPanelProps = {
  projectId: number;
};

export default function ChatPanel({ projectId }: ChatPanelProps) {
  const [messages, setMessages] = useState<LcChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/chat`);
      setMessages(await response.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setAsking(true);
    setQuestion("");
    try {
      const response = await lcFetch(`/v1/projects/${projectId}/chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          project_id: projectId,
          role: "user",
          content: trimmed,
          citations: [],
        },
        data.answer,
      ]);
    } finally {
      setAsking(false);
    }
  }

  async function clearChat() {
    await lcFetch(`/v1/projects/${projectId}/chat`, { method: "DELETE" });
    setMessages([]);
  }

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">Chargement assistant…</div>;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col h-[720px]">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Assistant consultant</h3>
          <p className="text-sm text-slate-500">Réponses basées sur vos analyses + PDF indexés (RAG)</p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Effacer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Exemples : « Quels gaps entre notre CRM et l&apos;AO ? », « Quelles exigences data sont à risque ? »
          </p>
        ) : null}
        {messages.map((message) => (
          <div
            key={`${message.id}-${message.created_at}`}
            className={`max-w-3xl rounded-2xl px-4 py-3 ${
              message.role === "user"
                ? "ml-auto bg-slate-900 text-white"
                : "bg-slate-50 text-slate-900 border border-slate-100"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap leading-6">{message.content}</p>
            {message.citations?.length ? (
              <div className="mt-3 space-y-2">
                {message.citations.map((citation, index) => (
                  <div
                    key={`${citation.page}-${index}`}
                    className="rounded-xl bg-white/80 border border-slate-200 px-3 py-2 text-xs text-slate-600"
                  >
                    <p className="font-semibold text-teal-800">
                      {citation.document_name} · {citation.page}
                    </p>
                    <p className="mt-1">{citation.excerpt}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-100 p-4 flex gap-3">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Posez votre question…"
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={asking}
          className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {asking ? "…" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
