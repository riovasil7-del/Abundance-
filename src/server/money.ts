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
