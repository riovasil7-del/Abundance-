import { Prisma } from "@prisma/client";
import { LEDGER_CURRENCY, lightPack, type LightPackSlug } from "../config/app";
import type { ChargeDraft } from "./payments";
import { splitDonation } from "./fees";
import { db } from "./db";
import { recordDonation } from "./ledger";
import { creditBlockedByEarlierNotice } from "./money";

export class CreditError extends Error {
  constructor(public code: "INSUFFICIENT_LIGHTS" | "UNKNOWN_PACK" | "AMOUNT_MISMATCH" | "BAD_TOKEN" | "UNKNOWN_USER") {
    super(code);
  }
}

const TOKEN = /^[A-Za-z0-9_.:-]{8,80}$/;

export function assertToken(token: string | undefined | null): string {
  const value = token?.trim() ?? "";
  if (!TOKEN.test(value)) throw new CreditError("BAD_TOKEN");
  return value;
}

/** Catalog cents only. Anything the browser sent about the price is ignored. */
export function catalogPriceCents(priceCents: number, _untrusted?: unknown): number {
  if (!Number.isInteger(priceCents) || priceCents <= 0) throw new Error("BAD_PRICE");
  return priceCents;
}

export function lightsCharge(priceCents: number): ChargeDraft {
  return {
    split: splitDonation(catalogPriceCents(priceCents)),
    currency: LEDGER_CURRENCY,
    mode: "credits",
    stripePaymentIntentId: null,
    clientSecret: null,
  };
}

async function balanceOf(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const sum = await tx.creditEntry.aggregate({ where: { userId }, _sum: { amount: true } });
  return sum._sum.amount ?? 0;
}

async function lockUser(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  if (rows.length === 0) throw new CreditError("UNKNOWN_USER");
}

export async function lightBalance(userId: string): Promise<number> {
  const sum = await db.creditEntry.aggregate({ where: { userId }, _sum: { amount: true } });
  return sum._sum.amount ?? 0;
}

export async function creditPack(input: {
  userId: string;
  packSlug: string;
  token: string;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  /** When Stripe tells us what was paid, it must match the pack. Demo omits this. */
  paidCents?: number | null;
}): Promise<{ balance: number; lights: number; replayed: boolean; suppressed: boolean }> {
  const pack = lightPack(input.packSlug);
  if (!pack) throw new CreditError("UNKNOWN_PACK");
  if (input.paidCents != null && input.paidCents !== pack.priceCents) throw new CreditError("AMOUNT_MISMATCH");
  const token = assertToken(input.token);
  const key = input.stripeCheckoutSessionId ? `stripe:${input.stripeCheckoutSessionId}` : `pack:${input.userId}:${token}`;

  return db.$transaction((tx) => creditPackOn(tx, { ...input, pack, key }));
}

export async function creditPackOn(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    pack: { slug: string; lights: number };
    key: string;
    stripeCheckoutSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  },
): Promise<{ balance: number; lights: number; replayed: boolean; suppressed: boolean }> {
  await lockUser(tx, input.userId);
  const noticeKeys = [
    input.stripeCheckoutSessionId ? `cs:${input.stripeCheckoutSessionId}` : null,
    input.stripePaymentIntentId ? `pi:${input.stripePaymentIntentId}` : null,
  ].filter((key): key is string => Boolean(key));
  if (noticeKeys.length > 0) {
    const notices = await tx.paymentMarker.findMany({ where: { key: { in: noticeKeys } } });
    if (creditBlockedByEarlierNotice(notices.map((notice) => notice.kind))) {
      return { balance: await balanceOf(tx, input.userId), lights: 0, replayed: false, suppressed: true };
    }
  }
  const existing = await tx.creditEntry.findUnique({ where: { idempotencyKey: input.key } });
  if (existing) {
    return { balance: await balanceOf(tx, input.userId), lights: input.pack.lights, replayed: true, suppressed: false };
  }
  await tx.creditEntry.create({
    data: {
      userId: input.userId,
      amount: input.pack.lights,
      kind: "PACK",
      packSlug: input.pack.slug,
      idempotencyKey: input.key,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
    },
  });
  return { balance: await balanceOf(tx, input.userId), lights: input.pack.lights, replayed: false, suppressed: false };
}

type DonationWrite = Parameters<typeof recordDonation>[0];

export async function spendLights(
  input: Omit<DonationWrite, "charge"> & { token: string },
): Promise<{
  transaction: Awaited<ReturnType<typeof recordDonation>>;
  balance: number;
  replayed: boolean;
}> {
  const priceCents = catalogPriceCents(input.priceCents);
  const token = assertToken(input.token);
  const key = `spend:${input.donorId}:${token}`;

  return db.$transaction(async (tx) => {
    await lockUser(tx, input.donorId);
    const existing = await tx.creditEntry.findUnique({ where: { idempotencyKey: key } });
    if (existing?.ledgerTransactionId) {
      const transaction = await tx.ledgerTransaction.findUnique({
        where: { id: existing.ledgerTransactionId },
        include: { allocations: true },
      });
      if (!transaction) throw new CreditError("BAD_TOKEN");
      return { transaction, balance: await balanceOf(tx, input.donorId), replayed: true };
    }
    const balance = await balanceOf(tx, input.donorId);
    if (balance < priceCents) throw new CreditError("INSUFFICIENT_LIGHTS");
    const transaction = await recordDonation({ ...input, priceCents, charge: lightsCharge(priceCents) }, tx);
    await tx.creditEntry.create({
      data: {
        userId: input.donorId,
        amount: -priceCents,
        kind: "SPEND",
        idempotencyKey: key,
        ledgerTransactionId: transaction.id,
      },
    });
    return { transaction, balance: balance - priceCents, replayed: false };
  });
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function beginPackPurchase(input: {
  userId: string;
  packSlug: LightPackSlug | string;
  token: string;
  origin: string;
}): Promise<{ mode: "demo"; balance: number; lights: number; replayed: boolean } | { mode: "stripe"; url: string }> {
  const pack = lightPack(input.packSlug);
  if (!pack) throw new CreditError("UNKNOWN_PACK");
  const token = assertToken(input.token);
  if (!stripeConfigured()) {
    const credited = await creditPack({ userId: input.userId, packSlug: pack.slug, token });
    return { mode: "demo", balance: credited.balance, lights: credited.lights, replayed: credited.replayed };
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const origin = input.origin.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: input.userId,
      success_url: `${origin}/wallet?lights=pending`,
      cancel_url: `${origin}/wallet`,
      metadata: {
        purpose: "LIGHT_PACK",
        userId: input.userId,
        packSlug: pack.slug,
        lights: String(pack.lights),
        priceCents: String(pack.priceCents),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: LEDGER_CURRENCY,
            unit_amount: pack.priceCents,
            product_data: { name: `Hojnosť · ${pack.lights}` },
          },
        },
      ],
    },
    { idempotencyKey: `pack-${input.userId}-${token}`.slice(0, 255) },
  );
  if (!session.url) throw new Error("STRIPE_NO_URL");
  return { mode: "stripe", url: session.url };
}

export async function creditPackFromCheckout(session: {
  id?: string;
  payment_status?: string;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
}): Promise<{ ok: true; replayed: boolean } | { ok: false; status: number; error: string }> {
  if (session.metadata?.purpose !== "LIGHT_PACK") return { ok: true, replayed: true };
  if (!session.id || !session.metadata.userId || !session.metadata.packSlug) {
    return { ok: false, status: 400, error: "BAD_EVENT" };
  }
  if (session.payment_status !== "paid") return { ok: true, replayed: true };
  try {
    const credited = await creditPack({
      userId: session.metadata.userId,
      packSlug: session.metadata.packSlug,
      token: session.id,
      stripeCheckoutSessionId: session.id,
      paidCents: session.amount_total ?? null,
    });
    return { ok: true, replayed: credited.replayed || credited.suppressed };
  } catch (error) {
    if (error instanceof CreditError && error.code === "AMOUNT_MISMATCH") {
      return { ok: false, status: 400, error: "AMOUNT_MISMATCH" };
    }
    if (error instanceof CreditError && error.code === "UNKNOWN_PACK") {
      return { ok: false, status: 400, error: "UNKNOWN_PACK" };
    }
    throw error;
  }
}
