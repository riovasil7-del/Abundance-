/** Feed and live loading choices. Gift spend is not involved. */

export function videoPreload(index: number, active: number, lowData = false): "metadata" | "none" {
  if (lowData) return index === active ? "metadata" : "none";
  return Math.abs(index - active) <= 1 ? "metadata" : "none";
}

/** Low data fetches only the open video. Ordinary mode may fetch one neighbor. */
export function feedSourceAllowed(index: number, active: number, lowData: boolean): boolean {
  if (lowData) return index === active;
  return Math.abs(index - active) <= 1;
}

/**
 * A quality list is shown only when more than one real file or simulcast layer exists.
 * A single file stays a single file.
 */
export function qualityOptions(variants: readonly string[]): { selectable: boolean; options: string[] } {
  const options = [...new Set(variants.map((item) => item.trim()).filter(Boolean))];
  return { selectable: options.length > 1, options };
}

/** Audio-only means remote video is unsubscribed, not merely hidden. */
export function remoteVideoSubscribed(audioOnly: boolean): boolean {
  return !audioOnly;
}

export function releaseTracks(tracks: readonly { stop: () => void }[]): void {
  for (const track of tracks) track.stop();
}

export type LocalDraft = {
  id: string;
  ownerId: string;
  title: string;
  caption: string;
  deedKind: string;
  updatedAt: number;
};

export function draftsFor(rows: readonly LocalDraft[], ownerId: string): LocalDraft[] {
  return rows.filter((row) => row.ownerId === ownerId).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function dropDraft(rows: readonly LocalDraft[], ownerId: string, id: string): LocalDraft[] {
  return rows.filter((row) => !(row.ownerId === ownerId && row.id === id));
}

export type MediaPublish = "local-test" | "durable" | "blocked";

/**
 * Vercel's disk is not durable. A missing Blob or S3 configuration blocks pictures.
 * Words do not use this gate. Local disk is allowed only off Vercel, and must be labelled.
 */
export function mediaPublishDecision(env: Record<string, string | undefined> = process.env): MediaPublish {
  const driver = (env.VIDEO_STORAGE ?? "local").trim();
  const onVercel = env.VERCEL === "1";
  if (driver === "local") return onVercel ? "blocked" : "local-test";
  if (driver === "vercel-blob") return env.BLOB_READ_WRITE_TOKEN?.trim() ? "durable" : "blocked";
  if (driver === "s3" || driver === "r2") {
    const ready = env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_PUBLIC_URL;
    return ready ? "durable" : "blocked";
  }
  return "blocked";
}
