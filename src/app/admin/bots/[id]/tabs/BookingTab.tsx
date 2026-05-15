"use client";

import { useEffect, useState } from "react";

type Slot = {
  id: string;
  startAt: string;
  durationMinutes: number;
  isBooked: boolean;
};

type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  conversationId: string | null;
  startAt: string;
  durationMinutes: number;
  createdAt: string;
};

export default function BookingTab({ botId }: { botId: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Bulk add form state.
  const today = new Date();
  today.setMinutes(0, 0, 0);
  today.setHours(today.getHours() + 1);
  const defaultStart = toLocalInputValue(today);
  const [date, setDate] = useState(defaultStart.slice(0, 10));
  const [times, setTimes] = useState("09:00, 10:00, 11:00, 14:00, 15:00");
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [s, b] = await Promise.all([
      fetch(`/api/admin/bots/${botId}/slots`).then((r) => r.json()),
      fetch(`/api/admin/bots/${botId}/bookings`).then((r) => r.json()),
    ]);
    setSlots(s);
    setBookings(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [botId]);

  async function addSlots() {
    setErr(null);
    const parsedTimes = times
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsedTimes.length === 0) {
      setErr("Enter at least one time (e.g. 09:00).");
      return;
    }
    const slotPayload = parsedTimes.map((t) => {
      const startAt = new Date(`${date}T${t.length === 5 ? t + ":00" : t}`);
      return { startAt: startAt.toISOString(), durationMinutes: duration };
    });
    setCreating(true);
    const res = await fetch(`/api/admin/bots/${botId}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots: slotPayload }),
    });
    setCreating(false);
    if (res.ok) {
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setErr(typeof data.error === "string" ? data.error : "Failed to add slots");
    }
  }

  async function removeSlot(slotId: string) {
    if (!confirm("Delete this slot? If it's already booked, the booking will be deleted too.")) return;
    const res = await fetch(`/api/admin/bots/${botId}/slots?slotId=${slotId}`, {
      method: "DELETE",
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="font-medium">Add appointment slots</h2>
          <p className="text-sm text-slate-500 mt-1">
            Enable booking in the Settings tab, then publish time slots here. The bot will offer
            these to visitors who want to schedule a call. Each slot is single-use — once booked,
            it disappears.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-medium text-slate-600">Times (comma-separated, 24h)</span>
            <input
              type="text"
              value={times}
              onChange={(e) => setTimes(e.target.value)}
              placeholder="09:00, 10:00, 14:30"
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Duration (min)</span>
            <input
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end">
          <button
            onClick={addSlots}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {creating ? "Adding…" : "Add slots"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-medium mb-3">Upcoming slots ({slots.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming slots.</p>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
            {slots.map((s) => (
              <div key={s.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">
                    {new Date(s.startAt).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-xs text-slate-500">{s.durationMinutes} min</div>
                </div>
                <div className="flex items-center gap-3">
                  {s.isBooked ? (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                      Booked
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Open
                    </span>
                  )}
                  <button
                    onClick={() => removeSlot(s.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-medium mb-3">Bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2 pr-3">Booked at</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(b.startAt).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      <div className="text-xs text-slate-500">{b.durationMinutes} min</div>
                    </td>
                    <td className="py-2 pr-3">{b.name}</td>
                    <td className="py-2 pr-3">{b.email}</td>
                    <td className="py-2 pr-3">{b.phone ?? "-"}</td>
                    <td className="py-2 pr-3 max-w-xs">{b.notes ?? "-"}</td>
                    <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
