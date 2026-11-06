import assert from "node:assert/strict";
import test from "node:test";
import { sessionSecretProblem } from "./session-secret";

test("registration refuses to start when the session secret is missing or short", () => {
  assert.equal(sessionSecretProblem(undefined), "MISSING");
  assert.equal(sessionSecretProblem(""), "MISSING");
  assert.equal(sessionSecretProblem("short"), "MISSING");
  assert.equal(sessionSecretProblem("   too short"), "MISSING");
  assert.equal(sessionSecretProblem("abcdefghijklmnop"), null);
});
