import assert from "node:assert/strict";
import test from "node:test";
import { cycleFocusIndex } from "./focus-trap";

test("tab wraps inside a dialog and shift-tab wraps backward", () => {
  assert.equal(cycleFocusIndex(0, 3, false), 1);
  assert.equal(cycleFocusIndex(2, 3, false), 0);
  assert.equal(cycleFocusIndex(0, 3, true), 2);
  assert.equal(cycleFocusIndex(-1, 3, false), 0);
  assert.equal(cycleFocusIndex(-1, 3, true), 2);
  assert.equal(cycleFocusIndex(0, 0, false), 0);
});
