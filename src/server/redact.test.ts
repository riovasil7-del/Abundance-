import assert from "node:assert/strict";
import test from "node:test";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { MASK_RGB, parseRegions, redactImage, sniffMedia } from "./redact";

function jpegWithSecret(): Buffer {
  const raw = Buffer.alloc(32 * 32 * 4);
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = 220;
    raw[i + 1] = 30;
    raw[i + 2] = 40;
    raw[i + 3] = 255;
  }
  const encoded = jpeg.encode({ data: raw, width: 32, height: 32 }, 90);
  const comment = Buffer.from("GPSLATSECRET-12.3456", "ascii");
  const segment = Buffer.alloc(4 + comment.length);
  segment[0] = 0xff;
  segment[1] = 0xfe;
  segment.writeUInt16BE(comment.length + 2, 2);
  comment.copy(segment, 4);
  return Buffer.concat([encoded.data.subarray(0, 2), segment, encoded.data.subarray(2)]);
}

test("a covered photo is a new PNG, the box is painted, and the camera note is gone", () => {
  const original = jpegWithSecret();
  assert.equal(sniffMedia(original), "jpeg");
  assert.ok(original.includes(Buffer.from("GPSLATSECRET")));
  const png = redactImage(original, [{ x: 0, y: 0, w: 0.5, h: 0.5 }]);
  assert.equal(png[0], 0x89);
  assert.equal(png.includes(Buffer.from("GPSLATSECRET")), false);
  assert.equal(png.includes(original), false);
  const decoded = PNG.sync.read(png);
  assert.equal(decoded.data[0], MASK_RGB.r);
  assert.equal(decoded.data[1], MASK_RGB.g);
  assert.equal(decoded.data[2], MASK_RGB.b);
  const far = (decoded.height - 1) * decoded.width * 4 + (decoded.width - 1) * 4;
  assert.notEqual(decoded.data[far], MASK_RGB.r);
});

test("video bytes and unknown bytes are refused before any picture is made", () => {
  const video = Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom")]);
  assert.throws(() => redactImage(video, []), /VIDEO_REDACTION_UNSUPPORTED/);
  assert.throws(() => redactImage(Buffer.from("not a picture"), []), /UNSAFE_MEDIA/);
  assert.throws(() => parseRegions([], true), /REGIONS_REQUIRED/);
  assert.equal(parseRegions([], false).length, 0);
});
