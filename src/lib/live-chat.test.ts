import assert from "node:assert/strict";
import test from "node:test";
import { memoryRateLimiter } from "../server/ratelimit";
import { reviewComment } from "../server/moderation";
import { DICTIONARIES } from "../i18n";
import { LOCALES } from "../config/app";
import { sk } from "../i18n/sk";
import {
  CHAT_RATE_LIMIT,
  CHAT_RATE_WINDOW_MS,
  CHAT_REPORT_LIMIT,
  CHAT_REPORT_WINDOW_MS,
  canModerateChat,
  chatReportRecord,
  deliverRoomLines,
  linesForViewer,
  translateConfigured,
  type RoomLine,
} from "./live-chat";

function line(id: string, authorId: string): RoomLine {
  return { id, kind: "chat", author: authorId, authorId, body: `hello ${id}`, createdAt: "2026-01-01T00:00:00.000Z" };
}

test("a chat line is delivered to the host and to viewers, and a block hides it", () => {
  const lines = [line("1", "ada"), line("2", "ben")];
  const host = deliverRoomLines({ lines });
  const viewer = deliverRoomLines({ lines });
  assert.deepEqual(host.map((item) => item.id), ["1", "2"]);
  assert.deepEqual(viewer.map((item) => item.id), host.map((item) => item.id));
  const blocked = deliverRoomLines({ lines, blockedAuthorIds: ["ben"], incoming: line("3", "ada") });
  assert.deepEqual(blocked.map((item) => item.id), ["1", "3"]);
  const paused = deliverRoomLines({ lines, paused: true, incoming: line("3", "ada") });
  assert.deepEqual(paused.map((item) => item.id), ["1", "2"]);
});

test("only six chat lines stay on screen", () => {
  const lines = Array.from({ length: 9 }, (_, index) => line(String(index), "ada"));
  const shown = deliverRoomLines({ lines });
  assert.equal(shown.length, 6);
  assert.equal(shown[0]?.id, "3");
  assert.equal(shown[5]?.id, "8");
});

test("the host, a co-host, and a moderator can remove someone for everyone; a viewer cannot", () => {
  assert.equal(canModerateChat({ isHost: true, role: "CREATOR" }), true);
  assert.equal(canModerateChat({ isHost: false, isCohost: true, role: "CREATOR" }), true);
  assert.equal(canModerateChat({ isHost: false, role: "MODERATOR" }), true);
  assert.equal(canModerateChat({ isHost: false, role: "ADMIN" }), true);
  assert.equal(canModerateChat({ isHost: false, role: "SUPPORTER" }), false);
  assert.equal(canModerateChat({ isHost: false, isCohost: false, role: "CREATOR" }), false);
});

test("a personal block hides lines only for that viewer, and a room mute hides them for everyone", () => {
  const lines = [line("1", "ada"), line("2", "ben")];
  const viewerA = linesForViewer(lines, { personalBlockedIds: ["ben"] });
  const viewerB = linesForViewer(lines, { personalBlockedIds: [] });
  assert.deepEqual(viewerA.map((item) => item.id), ["1"]);
  assert.deepEqual(viewerB.map((item) => item.id), ["1", "2"]);
  const afterMute = linesForViewer(lines, { roomMutedIds: ["ben"] });
  const otherViewer = linesForViewer(lines, { roomMutedIds: ["ben"], personalBlockedIds: [] });
  assert.deepEqual(afterMute.map((item) => item.id), ["1"]);
  assert.deepEqual(otherViewer.map((item) => item.id), ["1"]);
});

test("a chat report keeps the message and a report burst is rate limited", () => {
  const record = chatReportRecord({
    messageId: "msg-1",
    messageBody: "stop following me",
    reason: "harassment",
    note: "they repeated it",
  });
  assert.equal(record.targetType, "LIVE_CHAT");
  assert.equal(record.targetId, "msg-1");
  assert.match(record.details, /stop following me/);
  assert.match(record.details, /they repeated it/);
  const key = `chat-report-${Date.now()}`;
  for (let i = 0; i < CHAT_REPORT_LIMIT; i += 1) {
    assert.equal(memoryRateLimiter.consume(key, CHAT_REPORT_LIMIT, CHAT_REPORT_WINDOW_MS).ok, true);
  }
  assert.equal(memoryRateLimiter.consume(key, CHAT_REPORT_LIMIT, CHAT_REPORT_WINDOW_MS).ok, false);
});

test("abuse is held and the chat rate limit stops the ninth line", () => {
  assert.equal(reviewComment("you are worthless").status, "FLAGGED");
  assert.equal(reviewComment("thank you for the water").status, "VISIBLE");
  const key = `live-chat-test-${Date.now()}`;
  for (let i = 0; i < CHAT_RATE_LIMIT; i += 1) {
    assert.equal(memoryRateLimiter.consume(key, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS).ok, true);
  }
  assert.equal(memoryRateLimiter.consume(key, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW_MS).ok, false);
});

test("translate stays hidden unless both a key and a URL are configured", () => {
  assert.equal(translateConfigured({}), false);
  assert.equal(translateConfigured({ key: "secret" }), false);
  assert.equal(translateConfigured({ url: "https://example.test" }), false);
  assert.equal(translateConfigured({ key: "secret", url: "https://example.test" }), true);
});

function walk(value: unknown, path: string, out: string[]) {
  if (typeof value === "string") {
    out.push(path);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key, out);
  }
}

const ENGLISH_LEFTOVERS = [
  "Search ideas",
  "I agree to the terms",
  "Little heart",
  "Ideas to approve",
  "A gift blesses the person",
  "Agree to the terms first",
  "A small light",
  "No category",
  "Record a video",
];

test("every locale has every message, Idea is the label, and new copy is not left in English", () => {
  const expected: string[] = [];
  walk(sk, "", expected);
  for (const code of LOCALES) {
    const found: string[] = [];
    walk(DICTIONARIES[code], "", found);
    assert.deepEqual(found.slice().sort(), expected.slice().sort(), code);
    assert.equal(DICTIONARIES[code].nav.ideas, "Idea");
    assert.equal(DICTIONARIES[code].ideas.title, "Idea");
    for (const path of expected) {
      const value = path.split(".").reduce<unknown>((current, key) => (current as Record<string, unknown>)[key], DICTIONARIES[code]);
      assert.equal(typeof value, "string");
      assert.ok((value as string).trim().length > 0, `${code} ${path}`);
    }
    if (code === "en") continue;
    const blob = JSON.stringify(DICTIONARIES[code]);
    for (const phrase of ENGLISH_LEFTOVERS) {
      assert.equal(blob.includes(phrase), false, `${code} still has ${phrase}`);
    }
  }
});
