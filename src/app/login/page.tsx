"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type MissingVar = { name: string; description: string; example?: string };
type SetupState =
  | { kind: "ok" }
  | { kind: "missing"; missing: MissingVar[] }
  | { kind: "db"; message: string }
  | { kind: "other"; message: string };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupState | null>(null);

  useEffect(() => {
    // Proactively probe setup state on load so users see a useful panel
    // before they even try to log in.
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.missing && d.missing.length > 0) {
          setSetup({ kind: "missing", missing: d.missing });
        } else if (d.database && !d.database.reachable) {
          setSetup({
            kind: "db",
            message: d.database.error || "Database is configured but unreachable.",
          });
        } else {
          setSetup({ kind: "ok" });
        }
      })
      .catch(() => {
        // Non-fatal — user can still try to log in.
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(next);
        router.refresh();
        return;
      }
      if (res.status === 503 && data.kind === "setup" && Array.isArray(data.missing)) {
        setSetup({ kind: "missing", missing: data.missing });
      } else if (data.kind === "bootstrap") {
        setSetup({ kind: "db", message: data.error });
      } else {
        setErr(data?.error || "Login failed");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">
        {setup && setup.kind === "missing" && <MissingVarsPanel missing={setup.missing} />}
        {setup && setup.kind === "db" && <DbErrorPanel message={setup.message} />}

        <form
          onSubmit={onSubmit}
          className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 w-full space-y-5"
        >
          <div>
            <h1 className="text-2xl font-semibold">GatewayChat</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage your chatbots.</p>
          </div>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-md"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function MissingVarsPanel({ missing }: { missing: MissingVar[] }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-700 text-lg leading-none">⚠</span>
        <div className="flex-1">
          <h2 className="font-semibold text-amber-900">Server is not fully configured</h2>
          <p className="text-sm text-amber-800 mt-1">
            Add the following environment variables in <strong>Vercel → Project Settings →
            Environment Variables</strong>, then <strong>redeploy</strong> (env-var changes are not
            applied to existing deployments).
          </p>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {missing.map((v) => (
          <li key={v.name} className="bg-white border border-amber-200 rounded-md p-3">
            <code className="font-mono text-amber-900 font-semibold">{v.name}</code>
            <div className="text-slate-600 text-xs mt-1">{v.description}</div>
            {v.example && (
              <div className="text-slate-500 text-xs mt-1 font-mono break-all">
                Example: {v.example}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-amber-800">
        After redeploying, refresh this page — the warning will disappear once everything is set.
      </p>
    </div>
  );
}

function DbErrorPanel({ message }: { message: string }) {
  const isAuth = /password|authentication|auth/i.test(message);
  const isHost = /ENOTFOUND|getaddrinfo|EAI_AGAIN|connection refused|ECONNREFUSED|timeout/i.test(
    message,
  );

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start gap-2">
        <span className="text-red-700 text-lg leading-none">✕</span>
        <div className="flex-1">
          <h2 className="font-semibold text-red-900">Database is unreachable</h2>
          <p className="text-sm text-red-800 mt-1">{message}</p>
        </div>
      </div>
      <div className="text-sm text-red-900 space-y-1 bg-white border border-red-200 rounded-md p-3">
        <p className="font-medium">Common fixes:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
          {isHost && (
            <li>
              Hostname is wrong. On Supabase, use the <strong>Transaction Pooler</strong> URL
              (port 6543) — copy it from <em>Project Settings → Database → Connection string →
              Transaction</em>.
            </li>
          )}
          {isAuth && (
            <li>
              Password mismatch. Reset it in Supabase → Project Settings → Database, then update{" "}
              <code>DATABASE_URL</code> in Vercel and redeploy. URL-encode special characters
              (<code>@ : / ? # &amp;</code>).
            </li>
          )}
          <li>
            Did you redeploy after adding env vars? Vercel doesn't apply them to existing
            deployments — Deployments tab → ⋯ → Redeploy.
          </li>
        </ul>
      </div>
    </div>
  );
}
