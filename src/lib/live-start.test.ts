import assert from "node:assert/strict";
import test from "node:test";
import { LOCALES } from "../config/app";
import { DICTIONARIES } from "../i18n";
import { liveStartNotice, mediaFailureKind } from "./live-start";

test("every go-live failure has its own message, including a thrown request", () => {
  assert.equal(liveStartNotice(undefined, true), null);
  assert.equal(liveStartNotice("AGE_REQUIRED", false), "age");
  assert.equal(liveStartNotice("TERMS_REQUIRED", false), "terms");
  assert.equal(liveStartNotice("CREATOR_ONLY", false), "creator");
  assert.equal(liveStartNotice("UNAUTHENTICATED", false), "creator");
  assert.equal(liveStartNotice("LIVE_NOT_CONFIGURED", false), "config");
  assert.equal(liveStartNotice("NOT_IN_CIRCLE", false), "circle");
  assert.equal(liveStartNotice(undefined, false), "failed");
  assert.equal(liveStartNotice("SERVER", false), "failed");
});

test("a phone that blocks the camera is told to allow it", () => {
  assert.equal(mediaFailureKind("NotAllowedError"), "denied");
  assert.equal(mediaFailureKind("PermissionDeniedError"), "denied");
  assert.equal(mediaFailureKind("SecurityError"), "denied");
  assert.equal(mediaFailureKind("NotFoundError"), "missing");
  assert.equal(mediaFailureKind("NotReadableError"), "missing");
  assert.equal(mediaFailureKind("OverconstrainedError"), "missing");
  assert.equal(mediaFailureKind("AbortError"), "failed");
  assert.equal(mediaFailureKind(undefined), "failed");
});

test("every language can say why a broadcast did not start", () => {
  for (const code of LOCALES) {
    const live = DICTIONARIES[code].live;
    for (const key of ["ageFirst", "needCreator", "allowMedia", "startFailed", "enableMedia", "circleOnly"] as const) {
      assert.ok(live[key].trim().length > 8, `${code} ${key}`);
    }
  }
  assert.match(DICTIONARIES.sk.live.ageFirst, /18\+/);
  assert.match(DICTIONARIES.sk.live.allowMedia, /kameru/i);
  assert.match(DICTIONARIES.sk.live.startFailed, /skúste znova/i);
  assert.match(DICTIONARIES.en.live.allowMedia, /camera and microphone/i);
});
