import assert from "node:assert/strict";
import test from "node:test";
import { allocationBucket } from "./ledger";

test("payout hold keeps net pending until the date passes", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);
  assert.equal(allocationBucket("HELD", future), "pending");
  assert.equal(allocationBucket("HELD", past), "available");
  assert.equal(allocationBucket("AVAILABLE", future), "pending");
  assert.equal(allocationBucket("PENDING", past), null);
  assert.equal(allocationBucket("PAID_OUT", past), null);
  assert.equal(allocationBucket("FAILED", past), null);
});
