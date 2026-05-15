"use client";

import { useEffect, useRef, useState } from "react";

type Doc = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  chunkCount: number;
  createdAt: string;
};

export default function KnowledgeTab({ botId }: { botId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/bots/${botId}/knowledge`);
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [botId]);

  async function upload(file: File) {
    setErr(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/bots/${botId}/knowledge`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (res.ok) {
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(typeof data.error === "string" ? data.error : "Upload failed");
    }
  }

  async function remove(docId: string) {
    if (!confirm("Delete this document and all of its chunks?")) return;
    const res = await fetch(`/api/admin/bots/${botId}/knowledge?docId=${docId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl">
      <div>
        <h2 className="font-medium">Knowledge base</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload .pdf, .docx, .txt, or .md files. Each file is chunked and embedded so the bot can
          retrieve only the relevant pieces at chat time.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          {uploading ? "Uploading…" : "+ Upload file"}
        </button>
        <span className="text-xs text-slate-500">Max 8MB per file</span>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md p-6 text-center">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {docs.map((d) => (
            <div key={d.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{d.filename}</div>
                <div className="text-xs text-slate-500">
                  {d.chunkCount} chunks · {(d.sizeBytes / 1024).toFixed(1)} KB ·{" "}
                  {new Date(d.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => remove(d.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
