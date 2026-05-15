// Voyage AI embeddings — voyage-3-lite (512 dim, cheap).
// Docs: https://docs.voyageai.com/reference/embeddings-api

const MODEL = "voyage-3-lite";
const ENDPOINT = "https://api.voyageai.com/v1/embeddings";

export type EmbedInputType = "document" | "query";

export async function embed(texts: string[], inputType: EmbedInputType): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      input: texts,
      model: MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embed failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
