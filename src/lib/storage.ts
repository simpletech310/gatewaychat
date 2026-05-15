import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const LOGOS_BUCKET = "chatbot-logos";

let _admin: SupabaseClient | null = null;

// Service-role client. Server-only. Never expose this to the browser.
export function supabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function ensureBucket(name: string, isPublic: boolean) {
  const supa = supabaseAdmin();
  const { data: existing } = await supa.storage.getBucket(name);
  if (existing) return;
  await supa.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"],
  });
}

export async function uploadLogo(file: {
  buffer: Buffer;
  contentType: string;
  filename: string;
}): Promise<string> {
  const supa = supabaseAdmin();
  await ensureBucket(LOGOS_BUCKET, true);

  const ext = file.filename.split(".").pop()?.toLowerCase() || "png";
  const key = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supa.storage.from(LOGOS_BUCKET).upload(key, file.buffer, {
    contentType: file.contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Logo upload failed: ${error.message}`);

  const { data } = supa.storage.from(LOGOS_BUCKET).getPublicUrl(key);
  return data.publicUrl;
}
