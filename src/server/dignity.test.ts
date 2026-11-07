import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { payoutDecision } from "./money";

const PATHS = [
  "src/server/money.ts",
  "src/server/wallet.ts",
  "src/app/api/payouts/route.ts",
  "src/app/api/donations/route.ts",
  "src/app/api/family/route.ts",
  "src/app/api/credits/route.ts",
];

test("gifts, earnings, and payouts do not require a public deed or a video", () => {
  const decision = payoutDecision({ staffVerified: true, realAvailable: 850, sandboxAvailable: 0, reserved: 0 });
  assert.equal(decision.reason, "OK");
  assert.equal(decision.payable, 850);
  for (const path of PATHS) {
    const source = readFileSync(path, "utf8");
    assert.equal(/consentConfirmed|playbackUrl|deedKind|visibility/.test(source), false, path);
  }
});
