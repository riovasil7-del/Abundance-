import assert from "node:assert/strict";
import test from "node:test";
import { adultFromBirthDate, ageAnswer, broadcastDecision, consentActive, giftReceiveDecision, publishDecision } from "./age-gate";

const adult = { adultAttestedAt: new Date("2020-01-01"), minorDeclaredAt: null, creatorProfile: { id: "c" } };
const minor = { adultAttestedAt: null, minorDeclaredAt: new Date("2024-01-01"), creatorProfile: { id: "c" } };
const unanswered = { adultAttestedAt: null, minorDeclaredAt: null, creatorProfile: { id: "c" } };
const approved = { approvedAt: new Date("2024-02-01"), revokedAt: null };
const revoked = { approvedAt: new Date("2024-02-01"), revokedAt: new Date("2024-03-01") };

test("a minor without consent cannot upload, and a minor with consent can", () => {
  assert.equal(publishDecision(null), "UNAUTHENTICATED");
  assert.equal(publishDecision({ ...adult, creatorProfile: null }), "CREATOR_ONLY");
  assert.equal(publishDecision(unanswered), "AGE_REQUIRED");
  assert.equal(publishDecision({ ...minor, consent: null }), "PARENT_REQUIRED");
  assert.equal(publishDecision({ ...minor, consent: revoked }), "PARENT_REQUIRED");
  assert.equal(publishDecision({ ...minor, consent: approved }), "OK");
  assert.equal(publishDecision(adult), "OK");
});

test("a minor with consent can upload but cannot go live or receive gifts", () => {
  const allowed = { ...minor, consent: approved };
  assert.equal(publishDecision(allowed), "OK");
  assert.equal(broadcastDecision(allowed), "MINOR_NO_LIVE");
  assert.equal(broadcastDecision({ ...minor, consent: null }), "PARENT_REQUIRED");
  assert.equal(broadcastDecision(unanswered), "AGE_REQUIRED");
  assert.equal(broadcastDecision(adult), "OK");
  assert.equal(giftReceiveDecision(minor), "MINOR_NO_GIFTS");
  assert.equal(giftReceiveDecision(allowed), "MINOR_NO_GIFTS");
  assert.equal(giftReceiveDecision(unanswered), "AGE_REQUIRED");
  assert.equal(giftReceiveDecision(adult), "OK");
});

test("18+ is unaffected, and a birth date only chooses the self-declaration", () => {
  assert.equal(ageAnswer(adult), "adult");
  assert.equal(ageAnswer(minor), "minor");
  assert.equal(ageAnswer(unanswered), "unanswered");
  assert.equal(adultFromBirthDate("2000-01-01", new Date("2026-11-13T00:00:00Z")), true);
  assert.equal(adultFromBirthDate("2008-11-14", new Date("2026-11-13T00:00:00Z")), false);
  assert.equal(adultFromBirthDate("2008-11-13", new Date("2026-11-13T00:00:00Z")), true);
  assert.equal(adultFromBirthDate("2027-01-01", new Date("2026-11-13T00:00:00Z")), null);
  assert.equal(adultFromBirthDate("nope"), null);
  assert.equal(consentActive(approved), true);
  assert.equal(consentActive(revoked), false);
  assert.equal(consentActive(null), false);
});
