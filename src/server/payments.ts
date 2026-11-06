import { LEDGER_CURRENCY, PLATFORM_FEE } from "../config/app";
import { splitDonation, type MoneySplit } from "./fees";

export type ChargeDraft = {
  split: MoneySplit;
  currency: string;
  mode: "demo" | "stripe" | "credits";
  stripePaymentIntentId: string | null;
  clientSecret: string | null;
};

type StripeLike = {
  paymentIntents: {
    create(params: Record<string, unknown>): Promise<{ id: string; client_secret: string | null }>;
  };
};

/**
 * Stripe Connect-ready charge.
 * Amounts always come from splitDonation, never from the browser.
 * When the creator has a Connect account, the platform fee is application_fee_amount
 * and the rest is destined for that account. Otherwise the platform holds the charge
 * and the ledger still records the creator's 85% for a later payout.
 */
export async function createCharge(input: {
  priceCents: number;
  creatorStripeAccountId?: string | null;
  metadata: Record<string, string>;
  stripeClient?: StripeLike | null;
}): Promise<ChargeDraft> {
  const split = splitDonation(input.priceCents);
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return {
      split,
      currency: LEDGER_CURRENCY,
      mode: "demo",
      stripePaymentIntentId: null,
      clientSecret: null,
    };
  }

  const stripe = input.stripeClient ?? (await buildStripe(secret));
  const params: Record<string, unknown> = {
    amount: split.grossCents,
    currency: LEDGER_CURRENCY,
    automatic_payment_methods: { enabled: true },
    metadata: {
      ...input.metadata,
      grossCents: String(split.grossCents),
      feeCents: String(split.feeCents),
      netCents: String(split.netCents),
      platformFee: String(PLATFORM_FEE),
    },
  };
  if (input.creatorStripeAccountId) {
    params.application_fee_amount = split.feeCents;
    params.transfer_data = { destination: input.creatorStripeAccountId };
  }
  const intent = await stripe.paymentIntents.create(params);
  return {
    split,
    currency: LEDGER_CURRENCY,
    mode: "stripe",
    stripePaymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  };
}

async function buildStripe(secret: string): Promise<StripeLike> {
  const { default: Stripe } = await import("stripe");
  return new Stripe(secret) as unknown as StripeLike;
}
