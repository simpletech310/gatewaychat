// Centralized env-var requirements so the same list drives the setup check,
// the login error UI, and the health endpoint.

export type ConfigVar = {
  name: string;
  required: boolean;
  description: string;
  example?: string;
};

export const CONFIG_VARS: ConfigVar[] = [
  {
    name: "DATABASE_URL",
    required: true,
    description: "Postgres connection string with pgvector (Supabase Transaction Pooler URL on Vercel).",
    example:
      "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres",
  },
  {
    name: "ANTHROPIC_API_KEY",
    required: true,
    description: "From console.anthropic.com. Used for chat.",
  },
  {
    name: "VOYAGE_API_KEY",
    required: true,
    description: "From dash.voyageai.com. Used for knowledge embeddings.",
  },
  {
    name: "RESEND_API_KEY",
    required: true,
    description: "From resend.com/api-keys. Used for team-handoff and booking emails.",
  },
  {
    name: "RESEND_FROM_EMAIL",
    required: true,
    description: "Sending address. Must be a verified domain in Resend, or use 'onboarding@resend.dev' for testing.",
    example: "GatewayChat <onboarding@resend.dev>",
  },
  {
    name: "AUTH_SECRET",
    required: true,
    description: "32+ char random string for admin session cookies. Generate with: openssl rand -hex 32",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    required: true,
    description: "Your deployed origin. Used to build the embed snippet.",
    example: "https://your-deploy.vercel.app",
  },
  {
    name: "SUPABASE_URL",
    required: false,
    description: "Optional. Required only if you want chatbot logo uploads stored in Supabase.",
    example: "https://<project-ref>.supabase.co",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: false,
    description: "Optional. Required only if you want chatbot logo uploads stored in Supabase.",
  },
  {
    name: "ADMIN_EMAIL",
    required: false,
    description: "Defaults to wilform.thomas@gmail.com if unset.",
  },
  {
    name: "ADMIN_PASSWORD",
    required: false,
    description: "Defaults to power123 if unset.",
  },
];

export type ConfigCheck = {
  ok: boolean;
  missing: { name: string; description: string; example?: string }[];
  optionalMissing: { name: string; description: string }[];
};

export function checkConfig(): ConfigCheck {
  const missing: ConfigCheck["missing"] = [];
  const optionalMissing: ConfigCheck["optionalMissing"] = [];
  for (const v of CONFIG_VARS) {
    if (!process.env[v.name]) {
      if (v.required) {
        missing.push({ name: v.name, description: v.description, example: v.example });
      } else {
        optionalMissing.push({ name: v.name, description: v.description });
      }
    }
  }
  return { ok: missing.length === 0, missing, optionalMissing };
}
