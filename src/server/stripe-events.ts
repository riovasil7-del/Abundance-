import { Prisma } from "@prisma/client";
import { lightPack } from "../config/app";
import { creditPackOn } from "./credits";
import { db } from "./db";
import { planRefund } from "./money";

export class StripeFactError extends Error {
  constructor(public code: "AMOUNT_MISMATCH" | "FEE_MISMATCH") {
    super(code);
  }
}

export type StripeFact =
  | {
      eventId: string;
      type: "checkout.session.completed";
      sessionId: string;
      paymentIntentId?: string | null;
      userId: string;
      packSlug: string;
      amountTotal: number | null;
      paymentStatus: string;
    }
  | {
      eventId: string;
      type: "charge.refunded";
      sessionId?: string | null;
      paymentIntentId?: string | null;
      amountCents?: number | null;
    }
  | {
      eventId: string;
      type: "charge.dispute.created";
      sessionId?: string | null;
      paymentIntentId?: string | null;
    }
  | {
      eventId: string;
      type: "payment_intent.succeeded";
      paymentIntentId: string;
      amountCents: number;
      feeCents?: string | null;
    };

async function lockKey(tx: Prisma.TransactionClient, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key})::bigint)`;
}

async function rememberNotice(tx: Prisma.TransactionClient, key: string, kind: string): Promise<void> {
  await tx.paymentMarker.upsert({
    where: { key },
    update: {},
    create: { key, kind },
  });
}

export async function applyStripeFact(fact: StripeFact): Promise<{ outcome: string; replayed: boolean }> {
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.webhookDelivery.findUnique({ where: { id: fact.eventId } });
      if (existing) return { outcome: existing.outcome, replayed: true };
      const outcome = await applyFresh(tx, fact);
      await tx.webhookDelivery.create({
        data: { id: fact.eventId, eventType: fact.type, outcome },
      });
      return { outcome, replayed: false };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.webhookDelivery.findUnique({ where: { id: fact.eventId } });
      if (existing) return { outcome: existing.outcome, replayed: true };
    }
    throw error;
  }
}

async function applyFresh(tx: Prisma.TransactionClient, fact: StripeFact): Promise<string> {
  if (fact.type === "checkout.session.completed") return applyCheckout(tx, fact);
  if (fact.type === "charge.refunded") return applyClawback(tx, fact, "REFUND", "REFUND_FIRST");
  if (fact.type === "charge.dispute.created") return applyClawback(tx, fact, "DISPUTE", "DISPUTE");
  return applySettlement(tx, fact);
}

async function applyCheckout(
  tx: Prisma.TransactionClient,
  fact: Extract<StripeFact, { type: "checkout.session.completed" }>,
): Promise<string> {
  if (fact.paymentStatus !== "paid") return "ignored";
  const pack = lightPack(fact.packSlug);
  if (!pack) return "rejected";
  if (fact.amountTotal == null || fact.amountTotal !== pack.priceCents) {
    throw new StripeFactError("AMOUNT_MISMATCH");
  }
  await lockKey(tx, `cs:${fact.sessionId}`);
  if (fact.paymentIntentId) await lockKey(tx, `pi:${fact.paymentIntentId}`);
  const credited = await creditPackOn(tx, {
    userId: fact.userId,
    pack,
    key: `stripe:${fact.sessionId}`,
    stripeCheckoutSessionId: fact.sessionId,
    stripePaymentIntentId: fact.paymentIntentId,
  });
  if (credited.suppressed) return "suppressed";
  if (credited.replayed) return "already-credited";
  return "credited";
}

async function applyClawback(
  tx: Prisma.TransactionClient,
  fact: Extract<StripeFact, { type: "charge.refunded" | "charge.dispute.created" }>,
  reviewKind: "REFUND" | "DISPUTE",
  markerKind: "REFUND_FIRST" | "DISPUTE",
): Promise<string> {
  const keys = [
    fact.sessionId ? `cs:${fact.sessionId}` : null,
    fact.paymentIntentId ? `pi:${fact.paymentIntentId}` : null,
  ].filter((key): key is string => Boolean(key));
  for (const key of keys) await lockKey(tx, key);
  const or: Prisma.CreditEntryWhereInput[] = [];
  if (fact.sessionId) or.push({ stripeCheckoutSessionId: fact.sessionId });
  if (fact.paymentIntentId) or.push({ stripePaymentIntentId: fact.paymentIntentId });
  const entry = or.length
    ? await tx.creditEntry.findFirst({ where: { kind: "PACK", OR: or } })
    : null;
  if (!entry) {
    for (const key of keys) await rememberNotice(tx, key, markerKind);
    if (keys.length === 0) return "unmatched";
    return "deferred";
  }
  await tx.$executeRaw`SELECT "id" FROM "User" WHERE "id" = ${entry.userId} FOR UPDATE`;
  const already = await tx.creditEntry.findUnique({ where: { idempotencyKey: `reversal:${fact.eventId}` } });
  if (already) return "already-reversed";
  const sum = await tx.creditEntry.aggregate({ where: { userId: entry.userId }, _sum: { amount: true } });
  const spendable = sum._sum.amount ?? 0;
  const claimed =
    fact.type === "charge.refunded" && fact.amountCents != null
      ? Math.min(entry.amount, Math.max(fact.amountCents, 0))
      : entry.amount;
  const pending = await tx.ledgerTransaction.findMany({
    where: { donorId: entry.userId, status: "HELD", holdUntil: { gt: new Date() } },
    orderBy: { createdAt: "asc" },
    select: { id: true, netCents: true },
  });
  const plan = planRefund({
    packLights: claimed,
    spendable,
    pendingNetsOldestFirst: pending.map((row) => row.netCents),
  });
  if (plan.reverseLights > 0) {
    await tx.creditEntry.create({
      data: {
        userId: entry.userId,
        amount: -plan.reverseLights,
        kind: reviewKind === "DISPUTE" ? "DISPUTE_HOLD" : "REVERSAL",
        packSlug: entry.packSlug,
        idempotencyKey: `reversal:${fact.eventId}`,
      },
    });
  }
  const frozenIds = plan.freezeIndexes.map((index) => pending[index]!.id);
  if (frozenIds.length > 0) {
    await tx.ledgerTransaction.updateMany({
      where: { id: { in: frozenIds }, status: "HELD" },
      data: { status: "FROZEN" },
    });
    for (const index of plan.freezeIndexes) {
      const row = pending[index]!;
      await tx.moneyEvent.create({
        data: {
          transactionId: row.id,
          kind: reviewKind === "DISPUTE" ? "DISPUTE_FROZEN" : "REFUND_FROZEN",
          grossCents: row.netCents,
          feeCents: 0,
          netCents: row.netCents,
          note: fact.eventId,
        },
      });
    }
  }
  if (plan.spentLights > 0 || plan.reviewCents > 0 || frozenIds.length > 0) {
    await tx.accountReview.create({
      data: {
        userId: entry.userId,
        kind: reviewKind,
        reversedCents: plan.reverseLights,
        frozenCents: plan.freezeIndexes.reduce((sum, index) => sum + pending[index]!.netCents, 0),
        reviewCents: plan.reviewCents,
        stripeEventId: fact.eventId,
      },
    });
  }
  return plan.spentLights > 0 ? "reversed-with-review" : "reversed";
}

export function factFromStripeEvent(event: {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
}): StripeFact | null {
  if (!event.id || !event.type || !event.data?.object) return null;
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    const metadata = object.metadata as Record<string, string> | null | undefined;
    if (metadata?.purpose !== "LIGHT_PACK" || !metadata.userId || !metadata.packSlug || !object.id) return null;
    return {
      eventId: event.id,
      type: "checkout.session.completed",
      sessionId: String(object.id),
      paymentIntentId: typeof object.payment_intent === "string" ? object.payment_intent : null,
      userId: metadata.userId,
      packSlug: metadata.packSlug,
      amountTotal: typeof object.amount_total === "number" ? object.amount_total : null,
      paymentStatus: typeof object.payment_status === "string" ? object.payment_status : "",
    };
  }
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    return {
      eventId: event.id,
      type: event.type,
      sessionId: typeof object.metadata === "object" && object.metadata && "sessionId" in object.metadata
        ? String((object.metadata as { sessionId?: string }).sessionId ?? "") || null
        : null,
      paymentIntentId: typeof object.payment_intent === "string" ? object.payment_intent : null,
      ...(event.type === "charge.refunded"
        ? { amountCents: typeof object.amount_refunded === "number" ? object.amount_refunded : null }
        : {}),
    } as StripeFact;
  }
  if (event.type === "payment_intent.succeeded") {
    if (!object.id || typeof object.amount !== "number") return null;
    const metadata = object.metadata as Record<string, string> | null | undefined;
    return {
      eventId: event.id,
      type: "payment_intent.succeeded",
      paymentIntentId: String(object.id),
      amountCents: object.amount,
      feeCents: metadata?.feeCents ?? null,
    };
  }
  return null;
}

async function applySettlement(
  tx: Prisma.TransactionClient,
  fact: Extract<StripeFact, { type: "payment_intent.succeeded" }>,
): Promise<string> {
  await lockKey(tx, `settle:${fact.paymentIntentId}`);
  const transaction = await tx.ledgerTransaction.findUnique({
    where: { stripePaymentIntentId: fact.paymentIntentId },
  });
  if (!transaction) {
    await rememberNotice(tx, `settle:${fact.paymentIntentId}`, "DEFERRED_SETTLE");
    return "deferred";
  }
  if (fact.amountCents !== transaction.grossCents) throw new StripeFactError("AMOUNT_MISMATCH");
  if (fact.feeCents && fact.feeCents !== String(transaction.feeCents)) throw new StripeFactError("FEE_MISMATCH");
  if (transaction.status !== "PENDING") return "already-settled";
  await tx.ledgerTransaction.update({ where: { id: transaction.id }, data: { status: "HELD" } });
  await tx.moneyEvent.create({
    data: {
      transactionId: transaction.id,
      kind: "SETTLED",
      grossCents: transaction.grossCents,
      feeCents: transaction.feeCents,
      netCents: transaction.netCents,
      stripeEventId: fact.eventId,
    },
  });
  return "settled";
}
