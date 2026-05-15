"use client";

import { useEffect, useState } from "react";

type Conversation = {
  id: string;
  visitorId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  startedAt: string;
  lastMessageAt: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  toolInput: unknown;
  createdAt: string;
};

export default function ConversationsTab({ botId }: { botId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetch(`/api/admin/bots/${botId}/conversations`)
      .then((r) => r.json())
      .then(setConversations);
  }, [botId]);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/admin/bots/${botId}/conversations?conversationId=${active.id}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []));
  }, [active, botId]);

  return (
    <div className="grid grid-cols-3 gap-4 bg-white border border-slate-200 rounded-xl p-4 min-h-[500px]">
      <div className="col-span-1 border-r border-slate-100 pr-3 overflow-y-auto max-h-[600px]">
        <h3 className="text-sm font-medium mb-2 px-1">
          Conversations ({conversations.length})
        </h3>
        {conversations.length === 0 ? (
          <p className="text-sm text-slate-500 px-1">No conversations yet.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className={
                "w-full text-left p-2 rounded-md mb-1 hover:bg-slate-50 " +
                (active?.id === c.id ? "bg-blue-50" : "")
              }
            >
              <div className="text-sm font-medium truncate">
                {c.visitorName || c.visitorEmail || c.visitorId.slice(0, 12)}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(c.lastMessageAt).toLocaleString()}
              </div>
            </button>
          ))
        )}
      </div>

      <div className="col-span-2">
        {!active ? (
          <div className="text-sm text-slate-500 p-4">Select a conversation to view it.</div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-2">
            <div className="text-xs text-slate-500 border-b pb-2 mb-2">
              {active.visitorName ?? "Anonymous"} ·{" "}
              {active.visitorEmail ?? "no email"}
              {active.pageUrl && (
                <>
                  {" · "}
                  <a href={active.pageUrl} target="_blank" className="underline">
                    {active.pageUrl}
                  </a>
                </>
              )}
            </div>
            {messages.map((m) => (
              <div key={m.id}>
                {m.role === "tool" ? (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2 my-1">
                    <div className="font-semibold text-amber-700">
                      🔧 Tool: {m.toolName}
                    </div>
                    <pre className="whitespace-pre-wrap text-amber-900 mt-1">
                      {JSON.stringify(m.toolInput, null, 2)}
                    </pre>
                    <div className="mt-1 text-amber-700">→ {m.content}</div>
                  </div>
                ) : (
                  <div
                    className={
                      "p-2.5 rounded-lg max-w-[85%] text-sm whitespace-pre-wrap " +
                      (m.role === "user"
                        ? "bg-blue-600 text-white ml-auto"
                        : "bg-slate-100 text-slate-900 mr-auto")
                    }
                  >
                    {m.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
