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
    const ext = assertMedia(input);
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

export function publicObjectUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function assertMedia(input: { data: Buffer; contentType: string; filename: string }): string {
  const ext = extensionFor(input.contentType, input.filename);
  if (!ext) throw new Error("UNSUPPORTED_MEDIA");
  if (input.data.length > 32 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
  return ext;
}

/** Vercel Blob. Needs BLOB_READ_WRITE_TOKEN. A missing token is a clear error, not a crash at import. */
export class VercelBlobStorage implements VideoStorage {
  readonly driver = "vercel-blob";

  async save(input: { data: Buffer; contentType: string; filename: string }): Promise<StoredVideo> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("STORAGE_NOT_CONFIGURED");
    const ext = assertMedia(input);
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { put } = await import("@vercel/blob");
    const blob = await put(key, input.data, {
      access: "public",
      token,
      contentType: input.contentType || "application/octet-stream",
    });
    return { key, playbackUrl: blob.url };
  }
}

/**
 * S3-compatible storage. Works for AWS S3 and Cloudflare R2.
 * Playback uses S3_PUBLIC_URL so the bucket can stay private to uploads
 * and public on a CDN or r2.dev domain.
 */
export class S3VideoStorage implements VideoStorage {
  readonly driver = "s3";

  async save(input: { data: Buffer; contentType: string; filename: string }): Promise<StoredVideo> {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const publicBase = process.env.S3_PUBLIC_URL;
    if (!bucket || !accessKeyId || !secretAccessKey || !publicBase) {
      throw new Error("STORAGE_NOT_CONFIGURED");
    }
    const ext = assertMedia(input);
    const key = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const endpoint = process.env.S3_ENDPOINT;
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: endpoint || undefined,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "false" ? false : Boolean(endpoint),
    });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.data,
        ContentType: input.contentType || "application/octet-stream",
      }),
    );
    return { key, playbackUrl: publicObjectUrl(publicBase, key) };
  }
}

export function getVideoStorage(): VideoStorage {
  const driver = process.env.VIDEO_STORAGE ?? "local";
  if (driver === "local") return new LocalVideoStorage();
  if (driver === "vercel-blob") return new VercelBlobStorage();
  if (driver === "s3" || driver === "r2") return new S3VideoStorage();
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
