// Simple, fast text chunker. ~CHUNK_TOKENS tokens per chunk (≈4 chars/token heuristic).
// Splits on paragraph boundaries first, then sentences, then characters as a last resort.

const CHUNK_CHARS = 1800; // ~450 tokens
const OVERLAP_CHARS = 200;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_CHARS) return [clean];

  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length <= CHUNK_CHARS) {
      current = current ? current + "\n\n" + p : p;
      continue;
    }
    push();
    if (p.length <= CHUNK_CHARS) {
      current = p;
      continue;
    }
    // Paragraph too big — split on sentences / hard char boundary.
    const sentences = p.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      if ((current + " " + s).length <= CHUNK_CHARS) {
        current = current ? current + " " + s : s;
      } else {
        push();
        if (s.length <= CHUNK_CHARS) {
          current = s;
        } else {
          for (let i = 0; i < s.length; i += CHUNK_CHARS) {
            chunks.push(s.slice(i, i + CHUNK_CHARS));
          }
        }
      }
    }
  }
  push();

  // Add overlap between adjacent chunks for better recall.
  if (OVERLAP_CHARS > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const tail = chunks[i - 1].slice(-OVERLAP_CHARS);
      chunks[i] = tail + "\n" + chunks[i];
    }
  }

  return chunks;
}
