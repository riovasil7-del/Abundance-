import { NextResponse } from "next/server";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return jsonError(501, "STRIPE_NOT_CONFIGURED");

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "MISSING_SIGNATURE");
  const raw = await request.text();

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(secret);
  let event: { type: string; data: { object: { id?: string; amount?: number; metadata?: Record<string, string> } } };
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret) as typeof event;
  } catch {
    return jsonError(400, "BAD_SIGNATURE");
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    if (!intent.id || typeof intent.amount !== "number") return jsonError(400, "BAD_EVENT");
    const transaction = await db.ledgerTransaction.findUnique({ where: { stripePaymentIntentId: intent.id } });
    if (!transaction) return jsonError(404, "UNKNOWN_TRANSACTION");
    if (intent.amount !== transaction.grossCents) return jsonError(400, "AMOUNT_MISMATCH");
    if (intent.metadata?.feeCents && intent.metadata.feeCents !== String(transaction.feeCents)) {
      return jsonError(400, "FEE_MISMATCH");
    }
    if (transaction.status === "PENDING") {
      await db.ledgerTransaction.update({ where: { id: transaction.id }, data: { status: "HELD" } });
      await audit({
        actorId: transaction.donorId,
        action: "STRIPE_SETTLED",
        entityType: "LedgerTransaction",
        entityId: transaction.id,
        metadata: { grossCents: transaction.grossCents, feeCents: transaction.feeCents, netCents: transaction.netCents },
      });
    }
  }

  return NextResponse.json({ received: true });
}
