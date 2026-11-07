export type GiftChoice = {
  slug: string;
  name: string;
  symbol: string;
  /** Catalog price loaded on the server. The charge route looks it up again. */
  priceCents: number;
  feeCents: number;
  netCents: number;
};

export type FeedGift = {
  id: string;
  label: string;
  anonymous: boolean;
  donorName: string | null;
};

export type FeedVideo = {
  id: string;
  title: string;
  caption: string;
  playbackUrl: string | null;
  posterUrl: string | null;
  deedLabel: string;
  blessingCount: number;
  blessedByMe: boolean;
  commentCount: number;
  chainCount: number;
  reasons: string[];
  creator: {
    id: string;
    slug: string;
    displayName: string;
    place: string;
    avatarUrl: string;
    verification: string;
  };
  recentGifts: FeedGift[];
};

export type Receipt = {
  transactionId: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  currency: string;
  paymentMode: "DEMO" | "STRIPE" | "CREDITS" | "demo" | "stripe" | "credits";
  status: string;
  shares: { name: string; netCents: number }[];
};

export type PublicAccount = {
  name: string;
  role: string;
  creatorSlug: string | null;
};
