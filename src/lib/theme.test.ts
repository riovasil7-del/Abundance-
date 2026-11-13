import assert from "node:assert/strict";
import test from "node:test";
import { parseTheme, themeBootScript } from "./theme";

test("theme choice is only pearl or diamond", () => {
  assert.equal(parseTheme("pearl"), "pearl");
  assert.equal(parseTheme("diamond"), "diamond");
  assert.equal(parseTheme("dark"), null);
  assert.equal(parseTheme(""), null);
  assert.equal(parseTheme(undefined), null);
});

test("theme boot script does not flash over a server choice", () => {
  assert.match(themeBootScript, /dataset\.theme==="pearl"/);
  assert.match(themeBootScript, /prefers-color-scheme: dark/);
  assert.match(themeBootScript, /hojnost-theme/);
});
