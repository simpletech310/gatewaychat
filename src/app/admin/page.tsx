import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatbots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const bots = await db.select().from(chatbots).orderBy(desc(chatbots.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chatbots</h1>
        <Link
          href="/admin/bots/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          + New chatbot
        </Link>
      </div>

      {bots.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-500">
          No chatbots yet. Create your first one to get started.
        </div>
      ) : (
        <div className="grid gap-3">
          {bots.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bots/${b.id}`}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ background: b.primaryColor }}
                  >
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-slate-500">{b.title}</div>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                {b.enableEmailHandoff && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">Email</span>
                )}
                {b.enableLeadForm && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">Leads</span>
                )}
                {b.enableBooking && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded">Booking</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
