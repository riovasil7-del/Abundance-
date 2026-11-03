import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredVideo = {
  key: string;
  playbackUrl: string;
  posterUrl?: string;
};

/**
 * Upload seam. Local disk is the default so the MVP runs cheaply.
 * Cloudflare Stream and Mux keep the same method and can later return a direct-upload URL.
 */
export interface VideoStorage {
  readonly driver: string;
  save(input: { data: Buffer; contentType: string; filename: string }): Promise<StoredVideo>;
}

const ALLOWED_TYPES = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

export function extensionFor(contentType: string, filename: string): string | null {
  const fromType = ALLOWED_TYPES.get(contentType);
  if (fromType) return fromType;
  const fromName = filename.split(".").pop()?.toLowerCase();
  if (fromName === "mp4" || fromName === "webm" || fromName === "mov") return fromName;
  return null;
}

export class LocalVideoStorage implements VideoStorage {
  readonly driver = "local";
  private readonly root = path.join(process.cwd(), "storage", "uploads");

  async save(input: { data: Buffer; contentType: string; filename: string }): Promise<StoredVideo> {
    const ext = extensionFor(input.contentType, input.filename);
    if (!ext) throw new Error("UNSUPPORTED_MEDIA");
    if (input.data.length > 32 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
    await mkdir(this.root, { recursive: true });
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const full = path.join(this.root, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, input.data);
    return { key, playbackUrl: `/api/media/${key}` };
  }
}

export class CloudflareStreamStorage implements VideoStorage {
  readonly driver = "cloudflare-stream";
  async save(): Promise<StoredVideo> {
    throw new Error("CLOUDFLARE_STREAM_NOT_CONFIGURED");
  }
}

export class MuxStorage implements VideoStorage {
  readonly driver = "mux";
  async save(): Promise<StoredVideo> {
    throw new Error("MUX_NOT_CONFIGURED");
  }
}

export function getVideoStorage(): VideoStorage {
  const driver = process.env.VIDEO_STORAGE ?? "local";
  if (driver === "local") return new LocalVideoStorage();
  if (driver === "cloudflare-stream") return new CloudflareStreamStorage();
  if (driver === "mux") return new MuxStorage();
  throw new Error("UNKNOWN_VIDEO_STORAGE");
}

export function resolveUploadPath(key: string): string | null {
  if (!key || key.includes("..") || path.isAbsolute(key)) return null;
  const root = path.join(process.cwd(), "storage", "uploads");
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}
