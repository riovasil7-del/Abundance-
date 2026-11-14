import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GUEST_LIVE_TOKEN_LIMIT, GUEST_LIVE_TOKEN_WINDOW_MS, isGuestIdentity } from "./guest-view";
import { toggleLocalHeart } from "./local-hearts";
import { memoryRateLimiter } from "../server/ratelimit";

test("a guest identity cannot be treated as a signed-in publisher", () => {
  assert.equal(isGuestIdentity(null), true);
  assert.equal(isGuestIdentity("guest_abc"), true);
  assert.equal(isGuestIdentity("user_1"), false);
  assert.ok(GUEST_LIVE_TOKEN_LIMIT > 0);
  assert.ok(GUEST_LIVE_TOKEN_LIMIT < 60);
});

test("guest live tokens are rate limited per address", () => {
  const key = `guest-live:test-${Date.now()}`;
  for (let i = 0; i < GUEST_LIVE_TOKEN_LIMIT; i += 1) {
    assert.equal(memoryRateLimiter.consume(key, GUEST_LIVE_TOKEN_LIMIT, GUEST_LIVE_TOKEN_WINDOW_MS).ok, true);
  }
  assert.equal(memoryRateLimiter.consume(key, GUEST_LIVE_TOKEN_LIMIT, GUEST_LIVE_TOKEN_WINDOW_MS).ok, false);
});

test("a guest heart stays on this device and does not need an account", () => {
  const bag = new Map<string, string>();
  const store = {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => {
      bag.set(key, value);
    },
  };
  assert.equal(toggleLocalHeart("video-1", store), true);
  assert.equal(toggleLocalHeart("video-1", store), false);
  assert.equal(toggleLocalHeart("video-2", store), true);
});

test("chat and decoration do not cover taps, in every theme", () => {
  const css = readFileSync(path.join("src", "app", "globals.css"), "utf8");
  const stream = css.lastIndexOf(".live-chat-stream {");
  const streamRule = css.slice(stream, css.indexOf("}", stream));
  assert.match(streamRule, /pointer-events:\s*none/);
  assert.match(streamRule, /max-width:\s*65%/);
  assert.match(css, /\.live-chat-line,\s*\.chat-pause\s*\{[^}]*pointer-events:\s*auto/);
  assert.match(css, /\.live-join,\s*\.live-thanks,\s*\.live-note\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.garden-sky\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.heart-float\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.gift-burst\s*\{[^}]*pointer-events:\s*none/);
  assert.doesNotMatch(readFileSync(path.join("src", "components", "feed-experience.tsx"), "utf8"), /location\.href = "\/login"/);
  assert.doesNotMatch(readFileSync(path.join("src", "app", "live", "page.tsx"), "utf8"), /href="\/login"/);
  assert.doesNotMatch(readFileSync(path.join("src", "app", "creator", "[slug]", "page.tsx"), "utf8"), /href="\/login"/);
});
