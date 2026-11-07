import { audit } from "./audit";
import { db } from "./db";
import { restorePack } from "./holds";
import { reviewResolveDecision } from "./money";

export async function resolveAccountReview(input: {
  actor: { id: string; role: string } | null;
  reviewId: string;
  action: "restore" | "release" | "retain";
}): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const review = await db.accountReview.findUnique({ where: { id: input.reviewId } });
  if (!review) return { ok: false, error: "NOT_FOUND" };
  const paymentCase = review.packEntryId
    ? await db.paymentCase.findFirst({ where: { packEntryId: review.packEntryId } })
    : null;
  const decision = reviewResolveDecision(input.actor, review.userId, input.action, {
    refunded: paymentCase?.refunded ?? false,
    dispute: paymentCase?.dispute ?? null,
  });
  if (decision !== "OK") return { ok: false, error: decision };
  if (review.status !== "OPEN") return { ok: true, status: review.status };

  await db.$transaction(async (tx) => {
    if (input.action === "restore" && review.packEntryId && paymentCase) {
      await restorePack(tx, review.packEntryId, paymentCase.generation);
      await tx.paymentCase.update({
        where: { id: paymentCase.id },
        data: { held: false, restored: true },
      });
      await tx.accountReview.update({ where: { id: review.id }, data: { status: "RESTORED" } });
    } else if (input.action === "release" && review.packEntryId) {
      await tx.payoutReservation.updateMany({
        where: { packEntryId: review.packEntryId, status: "ACTIVE" },
        data: { status: "RELEASED" },
      });
      await tx.accountReview.update({ where: { id: review.id }, data: { status: "RELEASED" } });
    } else {
      await tx.accountReview.update({ where: { id: review.id }, data: { status: "RETAINED" } });
    }
  });
  await audit({
    actorId: input.actor?.id,
    action: `REVIEW_${input.action.toUpperCase()}`,
    entityType: "AccountReview",
    entityId: review.id,
    metadata: { packEntryId: review.packEntryId, kind: review.kind },
  });
  return { ok: true, status: input.action };
}
