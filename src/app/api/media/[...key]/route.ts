import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { jsonError } from "@/server/http";
import { resolveUploadPath } from "@/server/storage";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const full = resolveUploadPath(key.join("/"));
  if (!full) return jsonError(400, "BAD_PATH");
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) return jsonError(404, "NOT_FOUND");
  const ext = full.split(".").pop()?.toLowerCase() ?? "";
  const stream = createReadStream(full);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "content-type": TYPES[ext] ?? "application/octet-stream",
      "content-length": String(info.size),
      "cache-control": "public, max-age=3600",
    },
  });
}
