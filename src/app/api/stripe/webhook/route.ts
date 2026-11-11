import { NextResponse } from "next/server";
import { jsonError } from "@/server/http";
import { applyStripeFact, factFromStripeEvent, StripeFactError } from "@/server/stripe-events";

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
  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret) as unknown as typeof event;
  } catch {
    return jsonError(400, "BAD_SIGNATURE");
  }

  const fact = factFromStripeEvent(event);
  if (!fact) return NextResponse.json({ received: true, ignored: true });
  try {
    const result = await applyStripeFact(fact);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof StripeFactError) return jsonError(400, error.code);
    throw error;
  }
}
