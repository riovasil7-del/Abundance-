import assert from "node:assert/strict";
import test from "node:test";
import { parseTheme, themeBootScript } from "./theme";

test("theme choice is pearl, diamond, or garden", () => {
  assert.equal(parseTheme("pearl"), "pearl");
  assert.equal(parseTheme("diamond"), "diamond");
  assert.equal(parseTheme("garden"), "garden");
  assert.equal(parseTheme("dark"), null);
  assert.equal(parseTheme(""), null);
  assert.equal(parseTheme(undefined), null);
});

test("theme boot keeps a saved garden and still defaults to pearl or diamond", () => {
  assert.match(themeBootScript, /v==="garden"/);
  assert.match(themeBootScript, /prefers-color-scheme: dark/);
  assert.match(themeBootScript, /matches\?"diamond":"pearl"/);
  assert.match(themeBootScript, /hojnost-theme/);
  assert.doesNotMatch(themeBootScript, /matches\?"garden"/);
});
