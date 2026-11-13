import assert from "node:assert/strict";
import test from "node:test";
import { visibleLiveSessions } from "./live-list";

const john = { id: "john", status: "LIVE", contentCategory: null as string | null };
const dance = { id: "dance", status: "LIVE", contentCategory: "dance" };
const ended = { id: "old", status: "ENDED", contentCategory: null as string | null };

test("an active live with no category stays on the list for every chip", () => {
  assert.deepEqual(
    visibleLiveSessions([ended, john, dance], null).map((session) => session.id),
    ["john", "dance"],
  );
  assert.deepEqual(
    visibleLiveSessions([john, dance, ended], "everyday").map((session) => session.id),
    ["john"],
  );
  assert.deepEqual(
    visibleLiveSessions([john, dance], "dance").map((session) => session.id),
    ["john", "dance"],
  );
});

test("the live list has no viewer, locale, or follow argument", () => {
  assert.equal(visibleLiveSessions.length, 2);
  assert.deepEqual(visibleLiveSessions([], "family"), []);
});
