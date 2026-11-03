import assert from "node:assert/strict";
import test from "node:test";
import { publicObjectUrl } from "./storage";

test("public object URLs join a CDN base and a storage key", () => {
  assert.equal(
    publicObjectUrl("https://cdn.example.com/", "2026-11-03/clip.mp4"),
    "https://cdn.example.com/2026-11-03/clip.mp4",
  );
  assert.equal(
    publicObjectUrl("https://media.example.com", "day/a file.mp4"),
    "https://media.example.com/day/a%20file.mp4",
  );
});
