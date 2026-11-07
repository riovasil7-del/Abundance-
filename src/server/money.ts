import { splitDonation } from "./fees";

/**
 * A refund or dispute of a light pack.
 * Unused lights are reversed. Lights already given are not pulled out of the
 * creator's available or paid balance. Pending gifts can be frozen whole,
 * oldest first, and only when the whole gift fits inside the original 85%.
 * Anything left is an explicit review balance, never a negative wallet.
 */
export function planRefund(input: {
  packLights: number;
  spendable: number;
  pendingNetsOldestFirst: number[];
}): {
  reverseLights: number;
  spentLights: number;
  exposureCents: number;
  freezeIndexes: number[];
  reviewCents: number;
} {
  if (!Number.isSafeInteger(input.packLights) || input.packLights < 0) {
    throw new Error("BAD_PACK");
  }
  if (!Number.isSafeInteger(input.spendable) || input.spendable < 0) {
    throw new Error("BAD_BALANCE");
  }
  const reverseLights = Math.min(input.spendable, input.packLights);
  const spentLights = input.packLights - reverseLights;
  const exposureCents = splitDonation(spentLights).netCents;
  const freezeIndexes: number[] = [];
  let frozen = 0;
  input.pendingNetsOldestFirst.forEach((net, index) => {
    if (!Number.isSafeInteger(net) || net < 0) throw new Error("BAD_NET");
    if (frozen + net <= exposureCents) {
      freezeIndexes.push(index);
      frozen += net;
    }
  });
  return {
    reverseLights,
    spentLights,
    exposureCents,
    freezeIndexes,
    reviewCents: exposureCents - frozen,
  };
}

/** Card fees stay inside the platform 15%. They never shrink the creator's 85%. */
export function platformBearsProcessing(grossCents: number, processorCents: number) {
  if (!Number.isSafeInteger(processorCents) || processorCents < 0) {
    throw new Error("BAD_PROCESSOR_FEE");
  }
  const split = splitDonation(grossCents);
  return {
    creatorNetCents: split.netCents,
    platformFeeCents: split.feeCents,
    platformAfterProcessorCents: split.feeCents - processorCents,
  };
}

export type PaymentSnapshot = {
  refunded: boolean;
  held: boolean;
  restored: boolean;
  dispute: "open" | "won" | "lost" | null;
};

export type PaymentEffect = "clawback" | "restore" | "none";

/** Provider events. A won dispute never restores lights after a refund, and a second event id does not restore twice. */
export function reducePaymentCase(
  state: PaymentSnapshot,
  event: "refund" | "dispute_open" | "dispute_won" | "dispute_lost",
): { state: PaymentSnapshot; effect: PaymentEffect } {
  if (event === "refund") {
    const next = { ...state, refunded: true };
    if (!state.held || state.restored) {
      return { state: { ...next, held: true, restored: false }, effect: "clawback" };
    }
    return { state: next, effect: "none" };
  }
  if (event === "dispute_open") {
    if (state.refunded || state.dispute === "won" || state.dispute === "lost") {
      return { state, effect: "none" };
    }
    if (!state.held) return { state: { ...state, dispute: "open", held: true }, effect: "clawback" };
    return { state: { ...state, dispute: "open" }, effect: "none" };
  }
  if (event === "dispute_won") {
    const next = { ...state, dispute: "won" as const };
    if (state.refunded) return { state: next, effect: "none" };
    if (state.held && !state.restored) return { state: { ...next, held: false, restored: true }, effect: "restore" };
    return { state: next, effect: "none" };
  }
  const next = { ...state, dispute: "lost" as const };
  if (!state.held && !state.refunded) return { state: { ...next, held: true }, effect: "clawback" };
  return { state: next, effect: "none" };
}

/** Share an already-recorded creator net. Does not take another 15% fee. */
export function attributeRecordedNet(netCents: number, lights: number, grossCents: number): number {
  if (grossCents <= 0 || lights <= 0 || netCents < 0) return 0;
  if (lights >= grossCents) return netCents;
  return Math.floor((netCents * lights) / grossCents);
}

export function distributeExact(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0 || weightSum <= 0) return weights.map(() => 0);
  const amounts = weights.map((weight) => Math.floor((total * weight) / weightSum));
  let remainder = total - amounts.reduce((sum, amount) => sum + amount, 0);
  for (let index = 0; index < amounts.length && remainder > 0; index += 1) {
    amounts[index] += 1;
    remainder -= 1;
  }
  return amounts;
}

export function payableCents(input: { realAvailable: number; reserved: number }): number {
  if (input.realAvailable < 0 || input.reserved < 0) throw new Error("NEGATIVE");
  return Math.max(0, input.realAvailable - input.reserved);
}

export function payoutDecision(input: {
  staffVerified: boolean;
  realAvailable: number;
  sandboxAvailable: number;
  reserved: number;
}): { payable: number; reason: "NOT_VERIFIED" | "DEMO_ONLY" | "HELD" | "NONE" | "OK" } {
  const payable = payableCents({ realAvailable: input.realAvailable, reserved: input.reserved });
  if (!input.staffVerified) return { payable: 0, reason: "NOT_VERIFIED" };
  if (input.realAvailable === 0 && input.sandboxAvailable > 0) return { payable: 0, reason: "DEMO_ONLY" };
  if (payable === 0 && input.reserved > 0) return { payable: 0, reason: "HELD" };
  if (payable === 0) return { payable: 0, reason: "NONE" };
  return { payable, reason: "OK" };
}

export function adultDecision(
  user: { adultAttestedAt: Date | null } | null,
): "UNAUTHENTICATED" | "AGE_REQUIRED" | "OK" {
  if (!user) return "UNAUTHENTICATED";
  if (!user.adultAttestedAt) return "AGE_REQUIRED";
  return "OK";
}

export function reviewResolveDecision(
  actor: { id: string; role: string } | null,
  reviewUserId: string,
  action: "restore" | "release" | "retain",
  payment: { refunded: boolean; dispute: string | null },
): "UNAUTHENTICATED" | "FORBIDDEN" | "SELF_REVIEW" | "RESTORED_BLOCKED" | "OK" {
  if (!actor) return "UNAUTHENTICATED";
  if (actor.role !== "MODERATOR" && actor.role !== "ADMIN") return "FORBIDDEN";
  if (actor.id === reviewUserId) return "SELF_REVIEW";
  if (action === "restore" && (payment.refunded || payment.dispute === "open" || payment.dispute === "lost")) {
    return "RESTORED_BLOCKED";
  }
  return "OK";
}

export function creditBlockedByEarlierNotice(kinds: readonly string[]): boolean {
  return kinds.includes("REFUND_FIRST") || kinds.includes("DISPUTE");
}

export function financialDenial(user: { id: string } | null | undefined): "UNAUTHENTICATED" | null {
  if (!user?.id) return "UNAUTHENTICATED";
  return null;
}

export function staffVerificationDecision(
  actor: { id: string; role: string } | null,
  targetUserId: string,
): "UNAUTHENTICATED" | "FORBIDDEN" | "SELF_REVIEW" | "OK" {
  if (!actor) return "UNAUTHENTICATED";
  if (actor.role !== "MODERATOR" && actor.role !== "ADMIN") return "FORBIDDEN";
  if (actor.id === targetUserId) return "SELF_REVIEW";
  return "OK";
}

export function liveEndDecision(
  actor: { role: string; creatorId: string | null } | null,
  hostCreatorId: string,
): "UNAUTHENTICATED" | "FORBIDDEN" | "OK" {
  if (!actor) return "UNAUTHENTICATED";
  if (actor.creatorId && actor.creatorId === hostCreatorId) return "OK";
  if (actor.role === "MODERATOR" || actor.role === "ADMIN") return "OK";
  return "FORBIDDEN";
}
