import assert from "node:assert/strict";
import test from "node:test";
import {
  LIVE_BACKUP_CODEC,
  LIVE_CAPTURE,
  LIVE_CODEC,
  LIVE_HIGH_ENCODING,
  LIVE_SIMULCAST,
  lowDataActive,
  networkSavesData,
  viewerQualityPlan,
} from "./live-video";

test("a live picture is captured at portrait 720p and 30fps, with 180 and 360 layers", () => {
  assert.equal(LIVE_CAPTURE.width, 720);
  assert.equal(LIVE_CAPTURE.height, 1280);
  assert.equal(LIVE_CAPTURE.frameRate, 30);
  assert.deepEqual(
    LIVE_SIMULCAST.map((layer) => layer.width),
    [180, 360],
  );
  assert.ok(LIVE_SIMULCAST.every((layer) => layer.height > layer.width));
  assert.ok(LIVE_SIMULCAST.every((layer) => layer.maxBitrate < LIVE_HIGH_ENCODING.maxBitrate));
  assert.equal(LIVE_HIGH_ENCODING.maxFramerate, 30);
  assert.equal(LIVE_CODEC, "vp8");
  assert.equal(LIVE_BACKUP_CODEC, "h264");
  assert.equal(["vp9", "av1"].includes(LIVE_CODEC), false);
});

test("low data is off until the person asks, or the network is save-data or 2g", () => {
  assert.equal(lowDataActive({ userEnabled: false }), false);
  assert.equal(lowDataActive({ userEnabled: false, effectiveType: "4g" }), false);
  assert.equal(lowDataActive({ userEnabled: false, effectiveType: "3g" }), false);
  assert.equal(lowDataActive({ userEnabled: true, effectiveType: "4g" }), true);
  assert.equal(networkSavesData({ saveData: true, effectiveType: "4g" }), true);
  assert.equal(lowDataActive({ userEnabled: false, effectiveType: "2g" }), true);
  assert.equal(lowDataActive({ userEnabled: false, effectiveType: "slow-2g" }), true);
});

test("auto follows the screen, and high or low stay where the viewer put them", () => {
  assert.equal(viewerQualityPlan("auto", false), "adaptive");
  assert.equal(viewerQualityPlan("auto", true), "low");
  assert.equal(viewerQualityPlan("high", true), "high");
  assert.equal(viewerQualityPlan("low", false), "low");
});
