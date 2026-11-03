import assert from "node:assert/strict";
import test from "node:test";
import { reviewComment } from "./moderation";

test("kind words stay visible", () => {
  assert.equal(reviewComment("Ďakujem za tento skutok. Teší ma to.").status, "VISIBLE");
  assert.equal(reviewComment("This brought me joy.").status, "VISIBLE");
});

test("humiliation and pressure are held for a moderator", () => {
  assert.equal(reviewComment("you are worthless").status, "FLAGGED");
  assert.equal(reviewComment("Pošli peniaze hneď").status, "FLAGGED");
  assert.equal(reviewComment("   ").status, "FLAGGED");
});
