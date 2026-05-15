import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export async function extractText(
  filename: string,
  contentType: string,
  buffer: Buffer,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf") || contentType === "application/pdf") {
    const out = await pdfParse(buffer);
    return out.text;
  }
  if (
    lower.endsWith(".docx") ||
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const out = await mammoth.extractRawText({ buffer });
    return out.value;
  }
  // .txt, .md, .csv, .json, anything else — treat as utf-8 text.
  return buffer.toString("utf-8");
}
