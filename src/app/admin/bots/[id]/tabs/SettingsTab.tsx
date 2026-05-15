"use client";

import { useState } from "react";
import type { Chatbot } from "@/lib/db/schema";

export default function SettingsTab({
  bot,
  onChange,
}: {
  bot: Chatbot;
  onChange: (b: Chatbot) => void;
}) {
  const [form, setForm] = useState({
    name: bot.name,
    title: bot.title,
    welcomeMessage: bot.welcomeMessage,
    systemPrompt: bot.systemPrompt,
    logoUrl: bot.logoUrl ?? "",
    primaryColor: bot.primaryColor,
    enableEmailHandoff: bot.enableEmailHandoff,
    enableLeadForm: bot.enableLeadForm,
    enableBooking: bot.enableBooking,
    handoffEmail: bot.handoffEmail ?? "",
    bookingLink: bot.bookingLink ?? "",
    retrievalTopK: bot.retrievalTopK,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const payload: Record<string, unknown> = { ...form };
    payload.logoUrl = form.logoUrl || null;
    payload.handoffEmail = form.handoffEmail || null;
    payload.bookingLink = form.bookingLink || null;

    const res = await fetch(`/api/admin/bots/${bot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onChange(updated);
      setSavedAt(new Date().toLocaleTimeString());
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(typeof data.error === "string" ? data.error : "Save failed");
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl">
      <Field label="Name">
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <Field label="Widget title">
        <input
          className="input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>
      <Field label="Welcome message">
        <input
          className="input"
          value={form.welcomeMessage}
          onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
        />
      </Field>
      <Field label="System prompt">
        <textarea
          className="input min-h-[160px]"
          value={form.systemPrompt}
          onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Logo URL">
          <input
            className="input"
            type="url"
            value={form.logoUrl}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
          />
        </Field>
        <Field label="Primary color">
          <input
            className="input h-10"
            type="color"
            value={form.primaryColor}
            onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
          />
        </Field>
      </div>

      <div className="border-t pt-5 space-y-4">
        <h2 className="font-medium">Actions</h2>
        <Toggle
          checked={form.enableEmailHandoff}
          onChange={(v) => setForm({ ...form, enableEmailHandoff: v })}
          label="Email a human on handoff"
        />
        {form.enableEmailHandoff && (
          <Field label="Notification email">
            <input
              className="input"
              type="email"
              value={form.handoffEmail}
              onChange={(e) => setForm({ ...form, handoffEmail: e.target.value })}
            />
          </Field>
        )}
        <Toggle
          checked={form.enableLeadForm}
          onChange={(v) => setForm({ ...form, enableLeadForm: v })}
          label="Capture leads"
        />
        <Toggle
          checked={form.enableBooking}
          onChange={(v) => setForm({ ...form, enableBooking: v })}
          label="Share booking link"
        />
        {form.enableBooking && (
          <Field label="Booking link">
            <input
              className="input"
              type="url"
              value={form.bookingLink}
              onChange={(e) => setForm({ ...form, bookingLink: e.target.value })}
            />
          </Field>
        )}
      </div>

      <div className="border-t pt-5">
        <Field label={`Retrieval top-K (currently ${form.retrievalTopK})`}>
          <input
            type="range"
            min={1}
            max={15}
            value={form.retrievalTopK}
            onChange={(e) => setForm({ ...form, retrievalTopK: Number(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            How many knowledge chunks to retrieve per message. Higher = more context, more cost.
          </p>
        </Field>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="flex items-center justify-end gap-3">
        {savedAt && <span className="text-xs text-slate-500">Saved at {savedAt}</span>}
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <style jsx>{`
        .input {
          display: block;
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 6px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus {
          outline: 2px solid rgb(59 130 246);
          outline-offset: -1px;
          border-color: rgb(59 130 246);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
