import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES } from "../config/app";
import { DICTIONARIES } from "./index";
import { LANGUAGE_META } from "./meta";

test("every locale has a dictionary, a native name, and a direction", () => {
  assert.deepEqual(Object.keys(DICTIONARIES).sort(), [...LOCALES].sort());
  const names = LOCALES.map((code) => LANGUAGE_META[code].nativeName);
  assert.equal(new Set(names).size, names.length);
  for (const code of LOCALES) {
    assert.ok(DICTIONARIES[code].tour.welcomeTitle.length > 3);
    assert.ok(DICTIONARIES[code].tour.giftsBody.length > 40);
    assert.ok(DICTIONARIES[code].language.choose.length > 1);
    assert.equal(LANGUAGE_META[code].dir, code === "ar" ? "rtl" : "ltr");
  }
});
