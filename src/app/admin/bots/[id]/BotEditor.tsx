"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Chatbot } from "@/lib/db/schema";
import SettingsTab from "./tabs/SettingsTab";
import KnowledgeTab from "./tabs/KnowledgeTab";
import ConversationsTab from "./tabs/ConversationsTab";
import LeadsTab from "./tabs/LeadsTab";
import EmbedTab from "./tabs/EmbedTab";

type Tab = "settings" | "knowledge" | "conversations" | "leads" | "embed";

export default function BotEditor({ bot, appUrl }: { bot: Chatbot; appUrl: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("settings");
  const [current, setCurrent] = useState(bot);

  async function deleteBot() {
    if (!confirm(`Delete "${current.name}"? All conversations and knowledge will be removed.`)) {
      return;
    }
    const res = await fetch(`/api/admin/bots/${current.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{current.name}</h1>
          <p className="text-sm text-slate-500">{current.title}</p>
        </div>
        <button
          onClick={deleteBot}
          className="text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-md px-3 py-1.5"
        >
          Delete
        </button>
      </div>

      <div className="border-b border-slate-200 flex gap-1">
        {(
          [
            ["settings", "Settings"],
            ["knowledge", "Knowledge"],
            ["conversations", "Conversations"],
            ["leads", "Leads"],
            ["embed", "Embed code"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px " +
              (tab === key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "settings" && <SettingsTab bot={current} onChange={setCurrent} />}
        {tab === "knowledge" && <KnowledgeTab botId={current.id} />}
        {tab === "conversations" && <ConversationsTab botId={current.id} />}
        {tab === "leads" && <LeadsTab botId={current.id} />}
        {tab === "embed" && <EmbedTab bot={current} appUrl={appUrl} />}
      </div>
    </div>
  );
}
