import { Prisma } from "@prisma/client";
import { lightPack } from "../config/app";
import { creditPackOn } from "./credits";
import { db } from "./db";
import { clawbackPack, restorePack } from "./holds";
import { reducePaymentCase, type PaymentSnapshot } from "./money";

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
      type: "charge.dispute.closed";
      sessionId?: string | null;
      paymentIntentId?: string | null;
      status: string;
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
  if (fact.type === "charge.refunded") return applyProviderEvent(tx, fact, "refund");
  if (fact.type === "charge.dispute.created") return applyProviderEvent(tx, fact, "dispute_open");
  if (fact.type === "charge.dispute.closed") {
    return applyProviderEvent(tx, fact, fact.status === "won" ? "dispute_won" : "dispute_lost");
  }
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
  if (credited.entryId) {
    const paymentCase = await ensurePaymentCase(tx, fact.sessionId, fact.paymentIntentId);
    await tx.paymentCase.update({
      where: { id: paymentCase.id },
      data: { userId: fact.userId, packEntryId: credited.entryId, sessionId: fact.sessionId, paymentIntentId: fact.paymentIntentId },
    });
  }
  if (credited.suppressed) return "suppressed";
  if (credited.replayed) return "already-credited";
  return "credited";
}

async function applyProviderEvent(
  tx: Prisma.TransactionClient,
  fact: Extract<StripeFact, { type: "charge.refunded" | "charge.dispute.created" | "charge.dispute.closed" }>,
  event: "refund" | "dispute_open" | "dispute_won" | "dispute_lost",
): Promise<string> {
  const keys = [
    fact.sessionId ? `cs:${fact.sessionId}` : null,
    fact.paymentIntentId ? `pi:${fact.paymentIntentId}` : null,
  ].filter((key): key is string => Boolean(key));
  for (const key of keys) await lockKey(tx, key);
  let paymentCase = await ensurePaymentCase(tx, fact.sessionId, fact.paymentIntentId);
  if (!paymentCase.packEntryId && (fact.sessionId || fact.paymentIntentId)) {
    const entry = await tx.creditEntry.findFirst({
      where: {
        kind: "PACK",
        OR: [
          fact.sessionId ? { stripeCheckoutSessionId: fact.sessionId } : undefined,
          fact.paymentIntentId ? { stripePaymentIntentId: fact.paymentIntentId } : undefined,
        ].filter((item): item is { stripeCheckoutSessionId: string } | { stripePaymentIntentId: string } => Boolean(item)),
      },
    });
    if (entry) {
      paymentCase = await tx.paymentCase.update({
        where: { id: paymentCase.id },
        data: { packEntryId: entry.id, userId: entry.userId },
      });
    }
  }
  const snapshot: PaymentSnapshot = {
    refunded: paymentCase.refunded,
    held: paymentCase.held,
    restored: paymentCase.restored,
    dispute: paymentCase.dispute === "open" || paymentCase.dispute === "won" || paymentCase.dispute === "lost" ? paymentCase.dispute : null,
  };
  const next = reducePaymentCase(snapshot, event);
  const generation = next.effect === "clawback" ? paymentCase.generation + 1 : paymentCase.generation;
  let reverseLights = 0;
  let reservedCents = 0;
  if (next.effect === "clawback" && paymentCase.packEntryId) {
    const moved = await clawbackPack(tx, paymentCase.packEntryId, generation);
    reverseLights = moved.reverseLights;
    reservedCents = moved.reservedCents;
    await tx.accountReview.create({
      data: {
        userId: paymentCase.userId ?? (await tx.creditEntry.findUniqueOrThrow({ where: { id: paymentCase.packEntryId } })).userId,
        packEntryId: paymentCase.packEntryId,
        kind: event === "refund" ? "REFUND" : "DISPUTE",
        reversedCents: reverseLights,
        frozenCents: reservedCents,
        reviewCents: 0,
        stripeEventId: fact.eventId,
        status: "OPEN",
      },
    });
  }
  if (next.effect === "restore" && paymentCase.packEntryId) {
    await restorePack(tx, paymentCase.packEntryId, paymentCase.generation);
    await tx.accountReview.updateMany({
      where: { packEntryId: paymentCase.packEntryId, status: "OPEN" },
      data: { status: "RESTORED" },
    });
  }
  if (!paymentCase.packEntryId && (event === "refund" || event === "dispute_open" || event === "dispute_lost")) {
    for (const key of keys) await rememberNotice(tx, key, event === "refund" ? "REFUND_FIRST" : event === "dispute_lost" ? "DISPUTE" : "DISPUTE");
  }
  if (event === "dispute_won") {
    for (const key of keys) await rememberNotice(tx, key, "WON");
  }
  await tx.paymentCase.update({
    where: { id: paymentCase.id },
    data: {
      refunded: next.state.refunded,
      held: next.state.held,
      restored: next.state.restored,
      dispute: next.state.dispute,
      generation,
      sessionId: fact.sessionId ?? paymentCase.sessionId,
      paymentIntentId: fact.paymentIntentId ?? paymentCase.paymentIntentId,
    },
  });
  if (next.effect === "none") return "already-applied";
  if (!paymentCase.packEntryId) return "deferred";
  return next.effect === "restore" ? "restored" : reservedCents > 0 ? "reversed-with-hold" : "reversed";
}

async function ensurePaymentCase(tx: Prisma.TransactionClient, sessionId?: string | null, paymentIntentId?: string | null) {
  const existing = await tx.paymentCase.findFirst({
    where: {
      OR: [
        sessionId ? { sessionId } : undefined,
        paymentIntentId ? { paymentIntentId } : undefined,
      ].filter((item): item is { sessionId: string } | { paymentIntentId: string } => Boolean(item)),
    },
  });
  if (existing) return existing;
  return tx.paymentCase.create({
    data: {
      sessionId: sessionId ?? null,
      paymentIntentId: paymentIntentId ?? null,
    },
  });
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
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const sessionId = typeof object.metadata === "object" && object.metadata && "sessionId" in object.metadata
      ? String((object.metadata as { sessionId?: string }).sessionId ?? "") || null
      : null;
    const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : null;
    if (event.type === "charge.dispute.closed") {
      return {
        eventId: event.id,
        type: "charge.dispute.closed",
        sessionId,
        paymentIntentId,
        status: typeof object.status === "string" ? object.status : "lost",
      };
    }
    if (event.type === "charge.refunded") {
      return {
        eventId: event.id,
        type: "charge.refunded",
        sessionId,
        paymentIntentId,
        amountCents: typeof object.amount_refunded === "number" ? object.amount_refunded : null,
      };
    }
    return { eventId: event.id, type: "charge.dispute.created", sessionId, paymentIntentId };
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
