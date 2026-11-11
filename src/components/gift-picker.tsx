"use client";

import { giftTier } from "@/lib/gift-tier";
import { formatMoney } from "@/lib/format";
import type { GiftChoice } from "@/lib/types";
import { useI18n } from "./providers";

const TIERS = ["community", "small", "kind", "bright", "great"] as const;

export function GiftPicker({
  gifts,
  selected,
  onSelect,
}: {
  gifts: GiftChoice[];
  selected: string;
  onSelect: (slug: string) => void;
}) {
  const { locale, messages: m } = useI18n();
  const labels = {
    community: m.gifts.tierCommunity,
    small: m.gifts.tierSmall,
    kind: m.gifts.tierKind,
    bright: m.gifts.tierBright,
    great: m.gifts.tierGreat,
  };
  return (
    <div className="gift-sheet" data-screen="gift-sheet">
      {TIERS.map((tier) => {
        const group = gifts.filter((gift) => giftTier(gift.priceCents, gift.destination ?? "creator") === tier);
        if (group.length === 0) return null;
        return (
          <section key={tier} className="gift-tier">
            <h3>{labels[tier]}</h3>
            {tier === "community" ? <p className="muted">{m.gifts.communityNote}</p> : null}
            <div className="gift-grid">
              {group.map((gift) => (
                <button
                  type="button"
                  key={gift.slug}
                  className={gift.slug === selected ? "gift-option on" : "gift-option"}
                  onClick={() => onSelect(gift.slug)}
                >
                  <span aria-hidden="true">{gift.symbol}</span>
                  <small>{gift.name}</small>
                  <small>{formatMoney(gift.priceCents, locale)}</small>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function GiftFundNote({ gift }: { gift: GiftChoice | undefined }) {
  const { messages: m } = useI18n();
  if (!gift || gift.destination === "creator" || !gift.destination) return null;
  return <p className="notice">{gift.destination === "water" ? m.gifts.communityWater : m.gifts.communityFood}</p>;
}
