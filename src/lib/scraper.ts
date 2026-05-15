// Lightweight HTML → text scraper. No external deps.
// Handles single-page and same-origin crawl (1 level deep).

const UA =
  "Mozilla/5.0 (compatible; GatewayChatBot/1.0; +https://gatewaychat.app)";

export type ScrapedPage = { url: string; title: string; text: string };

export async function scrapeUrl(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  return parseHtml(url, html);
}

export async function scrapeSite(
  startUrl: string,
  maxPages = 12,
): Promise<ScrapedPage[]> {
  const start = new URL(startUrl);
  const visited = new Set<string>();
  const queue: string[] = [normalize(start.href)];
  const results: ScrapedPage[] = [];

  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html")) continue;
      const html = await res.text();
      const page = parseHtml(url, html);
      if (page.text.trim().length > 100) results.push(page);

      // Find same-origin links, normalize, enqueue.
      for (const link of extractLinks(html, url)) {
        const u = safeUrl(link);
        if (!u) continue;
        if (u.host !== start.host) continue;
        const norm = normalize(u.href);
        if (!visited.has(norm) && !queue.includes(norm)) queue.push(norm);
      }
    } catch {
      // Skip pages that fail — best effort.
    }
  }

  return results;
}

function parseHtml(url: string, html: string): ScrapedPage {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1].trim()) : url;

  // Strip script/style/noscript/svg blocks entirely.
  let s = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ");
  // Drop HTML comments.
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  // Convert block-level tags to newlines.
  s = s.replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/section|\/article|\/header|\/footer)[^>]*>/gi, "\n");
  // Strip remaining tags.
  s = s.replace(/<[^>]+>/g, " ");
  // Decode entities + collapse whitespace.
  s = decode(s);
  s = s.replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return { url, title, text: s };
}

function extractLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(new URL(m[1], base).href);
    } catch {
      // ignore bad URLs
    }
  }
  return out;
}

function safeUrl(s: string): URL | null {
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u;
  } catch {
    return null;
  }
}

function normalize(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    // Drop trailing slash for consistency, except for root.
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return href;
  }
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&ldquo;": '"',
  "&rdquo;": '"',
};

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e);
}
