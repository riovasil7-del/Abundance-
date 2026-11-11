import assert from "node:assert/strict";
import test from "node:test";
import { GIFT_CONFIRM_CENTS } from "../config/app";
import { capTail, needsGiftConfirm, rememberGiftToken, videoPreload } from "./gift-guard";

test("gifts at the documented threshold ask twice, smaller ones do not", () => {
  assert.equal(GIFT_CONFIRM_CENTS, 500);
  assert.equal(needsGiftConfirm(100), false);
  assert.equal(needsGiftConfirm(300), false);
  assert.equal(needsGiftConfirm(500), true);
  assert.equal(needsGiftConfirm(2500), true);
  assert.equal(needsGiftConfirm(499), false);
});

test("a retried gift keeps one token until it is cleared", () => {
  let minted = 0;
  const mint = () => {
    minted += 1;
    return `tok-${minted}`;
  };
  const first = rememberGiftToken(null, mint);
  const retry = rememberGiftToken(first, mint);
  assert.equal(first, "tok-1");
  assert.equal(retry, "tok-1");
  assert.equal(minted, 1);
  assert.equal(rememberGiftToken(null, mint), "tok-2");
});

test("comment memory keeps the newest lines and distant videos do not preload", () => {
  assert.deepEqual(capTail([1, 2, 3, 4], 2), [3, 4]);
  assert.deepEqual(capTail(["a"], 40), ["a"]);
  assert.equal(videoPreload(2, 2), "metadata");
  assert.equal(videoPreload(3, 2), "metadata");
  assert.equal(videoPreload(0, 2), "none");
});
