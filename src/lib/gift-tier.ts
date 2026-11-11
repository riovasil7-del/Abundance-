export type FundCode = "water" | "food";

export function fundOf(destination: string | undefined | null): FundCode | null {
  if (destination === "water" || destination === "food") return destination;
  return null;
}

export function giftTier(priceCents: number, destination: string | undefined | null): "community" | "small" | "kind" | "bright" | "great" {
  if (fundOf(destination)) return "community";
  if (priceCents < 100) return "small";
  if (priceCents < 1000) return "kind";
  if (priceCents < 10000) return "bright";
  return "great";
}
