import assert from "node:assert/strict";
import test from "node:test";
import { matchLanguageList, negotiateAcceptLanguage } from "./negotiate";

test("Accept-Language picks the first supported language, including regional tags", () => {
  assert.equal(negotiateAcceptLanguage("sk-SK,sk;q=0.9,en;q=0.8"), "sk");
  assert.equal(negotiateAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8"), "pt");
  assert.equal(negotiateAcceptLanguage("sw-KE,en;q=0.5"), "sw");
  assert.equal(negotiateAcceptLanguage("fr-FR,fr;q=0.9"), "fr");
  assert.equal(negotiateAcceptLanguage("ar-EG,ar;q=0.8,en;q=0.5"), "ar");
});

test("a higher q wins, and unsupported languages fall back to English", () => {
  assert.equal(negotiateAcceptLanguage("zh-CN;q=0.9,de;q=0.4"), "de");
  assert.equal(negotiateAcceptLanguage("xx-YY,zz;q=0.5"), "en");
  assert.equal(negotiateAcceptLanguage(null), "en");
  assert.equal(negotiateAcceptLanguage(""), "en");
});

test("navigator.languages uses the same map", () => {
  assert.equal(matchLanguageList(["yo-NG", "en-GB"]), "yo");
  assert.equal(matchLanguageList(["am", "en"]), "am");
  assert.equal(matchLanguageList(["zh-Hans", "en-US"]), "en");
  assert.equal(matchLanguageList([]), "en");
});
