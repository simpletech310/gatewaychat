"use client";

import { useState } from "react";
import type { Chatbot } from "@/lib/db/schema";

export default function EmbedTab({ bot, appUrl }: { bot: Chatbot; appUrl: string }) {
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const snippet = `<script\n  async\n  src="${base}/widget.js"\n  data-bot-id="${bot.id}"\n  data-api-base="${base}"\n></script>`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-3xl">
      <div>
        <h2 className="font-medium">Embed on a website</h2>
        <p className="text-sm text-slate-500 mt-1">
          Paste this snippet just before the closing <code>&lt;/body&gt;</code> tag on your
          client's site. The widget will load asynchronously and appear as a chat bubble.
        </p>
      </div>

      <div className="relative">
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto">
          <code>{snippet}</code>
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Test it</h3>
        <p className="text-sm text-slate-500">
          Open{" "}
          <a
            href={`/preview/${bot.id}`}
            target="_blank"
            className="text-blue-600 underline"
            rel="noreferrer"
          >
            the preview page
          </a>{" "}
          to chat with this bot using the same widget you'd embed on a client's site.
        </p>
      </div>
    </div>
  );
}
