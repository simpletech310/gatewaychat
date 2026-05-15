"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  createdAt: string;
};

export default function LeadsTab({ botId }: { botId: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/bots/${botId}/leads`)
      .then((r) => r.json())
      .then((d) => {
        setLeads(d);
        setLoading(false);
      });
  }, [botId]);

  function exportCsv() {
    const header = "name,email,phone,message,source,created_at\n";
    const rows = leads
      .map((l) =>
        [l.name, l.email, l.phone, l.message, l.source, l.createdAt]
          .map((v) => (v == null ? "" : `"${String(v).replace(/"/g, '""')}"`))
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${botId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Leads ({leads.length})</h2>
        <button
          onClick={exportCsv}
          disabled={leads.length === 0}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-slate-500 border border-dashed border-slate-300 rounded-md p-6 text-center">
          No leads captured yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Phone</th>
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3">{l.name ?? "-"}</td>
                  <td className="py-2 pr-3">{l.email ?? "-"}</td>
                  <td className="py-2 pr-3">{l.phone ?? "-"}</td>
                  <td className="py-2 pr-3 max-w-xs">{l.message ?? "-"}</td>
                  <td className="py-2 pr-3">
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{l.source}</span>
                  </td>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
