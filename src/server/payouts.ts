/**
 * Payout seam. M-Pesa, Flutterwave, Paystack, or a Stripe Connect payout
 * can implement this without changing the wallet screen.
 * The stub records the request and does not move money.
 */

export type PayoutProviderId = "mpesa" | "flutterwave" | "paystack" | "stripe_connect" | "stub";

export type PayoutRequestInput = {
  creatorId: string;
  amountCents: number;
  currency: string;
  provider: PayoutProviderId;
  destinationRef?: string | null;
};

export type PayoutResult = {
  status: "stubbed";
  provider: PayoutProviderId;
  reference: string;
};

export interface PayoutProvider {
  readonly id: PayoutProviderId;
  requestPayout(input: PayoutRequestInput): Promise<PayoutResult>;
}

export class StubPayoutProvider implements PayoutProvider {
  readonly id = "stub" as const;

  async requestPayout(input: PayoutRequestInput): Promise<PayoutResult> {
    const provider = input.provider === "stub" ? "stub" : input.provider;
    return {
      status: "stubbed",
      provider,
      reference: `stub_${provider}_${input.creatorId.slice(0, 6)}_${Date.now()}`,
    };
  }
}

export function getPayoutProvider(): PayoutProvider {
  return new StubPayoutProvider();
}
