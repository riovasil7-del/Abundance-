import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/** Fractions of the picture, from the top left. */
export type CoverRegion = { x: number; y: number; w: number; h: number };

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1280;
const MASK = [36, 25, 16, 255] as const;

export function sniffMedia(data: Buffer): "jpeg" | "png" | "video" | "unknown" {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return "png";
  if (data.length >= 12 && data.subarray(4, 8).toString("ascii") === "ftyp") return "video";
  if (data.length >= 4 && data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) return "video";
  return "unknown";
}

export function parseRegions(value: unknown, required: boolean): CoverRegion[] {
  if (!Array.isArray(value)) {
    if (required) throw new Error("REGIONS_REQUIRED");
    return [];
  }
  if (value.length > 12) throw new Error("REGIONS_REQUIRED");
  const regions = value.map((region) => {
    if (!region || typeof region !== "object") throw new Error("REGIONS_REQUIRED");
    const box = region as Record<string, unknown>;
    const x = Number(box.x);
    const y = Number(box.y);
    const w = Number(box.w);
    const h = Number(box.h);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) throw new Error("REGIONS_REQUIRED");
    if (w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > 1.001 || y + h > 1.001) throw new Error("REGIONS_REQUIRED");
    return { x, y, w, h };
  });
  if (required && regions.length === 0) throw new Error("REGIONS_REQUIRED");
  return regions;
}

/**
 * Paint opaque boxes into a new PNG. Camera data is dropped because the PNG
 * is built from pixels only. This does not find faces.
 */
export function redactImage(data: Buffer, regions: readonly CoverRegion[]): Buffer {
  if (data.length === 0 || data.length > PHOTO_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const kind = sniffMedia(data);
  if (kind === "video") throw new Error("VIDEO_REDACTION_UNSUPPORTED");
  if (kind !== "jpeg" && kind !== "png") throw new Error("UNSAFE_MEDIA");

  let width = 0;
  let height = 0;
  let pixels: Buffer;
  try {
    if (kind === "jpeg") {
      const decoded = jpeg.decode(data, { useTArray: true, formatAsRGBA: true });
      width = decoded.width;
      height = decoded.height;
      pixels = Buffer.from(decoded.data);
    } else {
      const decoded = PNG.sync.read(data);
      width = decoded.width;
      height = decoded.height;
      pixels = Buffer.from(decoded.data);
    }
  } catch {
    throw new Error("UNSAFE_MEDIA");
  }
  if (width < 2 || height < 2 || width * height > 24_000_000) throw new Error("FILE_TOO_LARGE");

  const factor = Math.max(1, Math.ceil(width / PHOTO_MAX_EDGE), Math.ceil(height / PHOTO_MAX_EDGE));
  const outW = Math.floor(width / factor);
  const outH = Math.floor(height / factor);
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const src = (y * factor * width + x * factor) * 4;
      const dst = (y * outW + x) * 4;
      out[dst] = pixels[src] ?? 0;
      out[dst + 1] = pixels[src + 1] ?? 0;
      out[dst + 2] = pixels[src + 2] ?? 0;
      out[dst + 3] = 255;
    }
  }
  for (const region of regions) {
    const x0 = clamp(Math.floor(region.x * outW), 0, outW);
    const y0 = clamp(Math.floor(region.y * outH), 0, outH);
    const x1 = clamp(Math.ceil((region.x + region.w) * outW), 0, outW);
    const y1 = clamp(Math.ceil((region.y + region.h) * outH), 0, outH);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const dst = (y * outW + x) * 4;
        out[dst] = MASK[0];
        out[dst + 1] = MASK[1];
        out[dst + 2] = MASK[2];
        out[dst + 3] = MASK[3];
      }
    }
  }
  const png = new PNG({ width: outW, height: outH });
  png.data = out;
  return PNG.sync.write(png);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const MASK_RGB = { r: MASK[0], g: MASK[1], b: MASK[2] };
