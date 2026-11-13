/**
 * How a live picture is captured and which layer a viewer receives.
 *
 * The phone publishes a portrait 720p picture. Two smaller simulcast layers
 * ride along. The viewer asks for the layer that covers the screen's real pixels.
 * VP8 is the codec phones can encode. H264 is only the backup for a browser
 * that cannot decode VP8. VP9 and AV1 stay off because many phones cannot encode them.
 */

export const LIVE_CAPTURE = { width: 720, height: 1280, frameRate: 30 } as const;

export const LIVE_SIMULCAST = [
  { width: 180, height: 320, maxBitrate: 160_000, maxFramerate: 15 },
  { width: 360, height: 640, maxBitrate: 450_000, maxFramerate: 20 },
] as const;

export const LIVE_HIGH_ENCODING = { maxBitrate: 1_700_000, maxFramerate: 30 } as const;

export const LIVE_CODEC = "vp8" as const;
export const LIVE_BACKUP_CODEC = "h264" as const;

export type ViewerQuality = "auto" | "high" | "low";
export type ViewerQualityPlan = "adaptive" | "high" | "low";

export function networkSavesData(input: { saveData?: boolean; effectiveType?: string }): boolean {
  if (input.saveData) return true;
  const kind = input.effectiveType?.toLowerCase();
  return kind === "2g" || kind === "slow-2g";
}

/** Low data is a choice, or a network that asked to save data. It is not the default. */
export function lowDataActive(input: { userEnabled: boolean; saveData?: boolean; effectiveType?: string }): boolean {
  return input.userEnabled || networkSavesData(input);
}

/**
 * Auto follows the screen, and drops to the small layer only in low data.
 * High and Low are the viewer's own choice and stay put.
 */
export function viewerQualityPlan(preference: ViewerQuality, lowData: boolean): ViewerQualityPlan {
  if (preference === "high") return "high";
  if (preference === "low") return "low";
  return lowData ? "low" : "adaptive";
}
