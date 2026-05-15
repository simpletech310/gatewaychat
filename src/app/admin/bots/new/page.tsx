"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PROMPT = `You are a helpful customer support assistant for {COMPANY NAME}.
Your job is to answer visitor questions using the knowledge base provided, help them book appointments, and capture their contact info when they want to talk to a human.

Tone: friendly, concise, professional.
Never invent facts about the business — if you don't know, offer to connect them with a person.`;

export default function NewBotPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    title: "Chat with us",
    systemPrompt: DEFAULT_PROMPT,
    welcomeMessage: "Hi! How can I help you today?",
    logoUrl: "",
    primaryColor: "#2563eb",
    enableEmailHandoff: true,
    enableLeadForm: true,
    enableBooking: false,
    handoffEmail: "",
    bookingLink: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const payload: Record<string, unknown> = { ...form };
    if (!payload.logoUrl) delete payload.logoUrl;
    if (!payload.handoffEmail) delete payload.handoffEmail;
    if (!payload.bookingLink) delete payload.bookingLink;

    const res = await fetch("/api/admin/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const bot = await res.json();
      router.push(`/admin/bots/${bot.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(typeof data.error === "string" ? data.error : "Failed to create chatbot");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New chatbot</h1>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <Field label="Name" required>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Acme Co. Support Bot"
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

        <Field label="System prompt" required>
          <textarea
            className="input min-h-[140px]"
            required
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
          />
          <p className="text-xs text-slate-500 mt-1">
            Tell the bot who it is, what business it represents, and how to behave.
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Logo URL">
            <input
              className="input"
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Primary color">
            <input
              className="input"
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
            label="Email a human when the visitor wants to speak with someone"
          />
          {form.enableEmailHandoff && (
            <Field label="Notification email">
              <input
                className="input"
                type="email"
                value={form.handoffEmail}
                onChange={(e) => setForm({ ...form, handoffEmail: e.target.value })}
                placeholder="team@yourcompany.com"
              />
            </Field>
          )}

          <Toggle
            checked={form.enableLeadForm}
            onChange={(v) => setForm({ ...form, enableLeadForm: v })}
            label="Capture leads (name, email, message)"
          />

          <Toggle
            checked={form.enableBooking}
            onChange={(v) => setForm({ ...form, enableBooking: v })}
            label="Share a booking link"
          />
          {form.enableBooking && (
            <Field label="Booking link">
              <input
                className="input"
                type="url"
                value={form.bookingLink}
                onChange={(e) => setForm({ ...form, bookingLink: e.target.value })}
                placeholder="https://cal.com/yourname"
              />
            </Field>
          )}
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md font-medium"
          >
            {saving ? "Creating…" : "Create chatbot"}
          </button>
        </div>
      </form>

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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
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
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
