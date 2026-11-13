"use client";

import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useConnectionState, useParticipants, useRoomContext, useTracks } from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track, VideoPreset, VideoQuality, type RoomOptions } from "livekit-client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  LIVE_BACKUP_CODEC,
  LIVE_CAPTURE,
  LIVE_CODEC,
  LIVE_HIGH_ENCODING,
  LIVE_SIMULCAST,
  lowDataActive,
  networkSavesData,
  viewerQualityPlan,
  type ViewerQuality,
} from "@/lib/live-video";
import { remoteVideoSubscribed } from "@/lib/low-data";
import { formatMoney } from "@/lib/format";
import { capTail } from "@/lib/gift-guard";
import type { GiftChoice, Receipt } from "@/lib/types";
import { GiftConfirm, useGiftAttempt } from "./gift-confirm";
import { GiftFundNote, GiftPicker } from "./gift-picker";
import { LightsStatus, paymentNote } from "./lights";
import { useI18n } from "./providers";
import { CollabPanel } from "./collab-panel";
import { LiveChatPanel } from "./live-chat-panel";
import { Sheet } from "./sheet";

const captureResolution = {
  width: LIVE_CAPTURE.width,
  height: LIVE_CAPTURE.height,
  frameRate: LIVE_CAPTURE.frameRate,
  aspectRatio: LIVE_CAPTURE.width / LIVE_CAPTURE.height,
};

const roomOptions: RoomOptions = {
  adaptiveStream: { pixelDensity: "screen" },
  dynacast: true,
  videoCaptureDefaults: { resolution: captureResolution },
  publishDefaults: {
    simulcast: true,
    videoCodec: LIVE_CODEC,
    backupCodec: { codec: LIVE_BACKUP_CODEC },
    degradationPreference: "maintain-resolution",
    videoEncoding: { maxBitrate: LIVE_HIGH_ENCODING.maxBitrate, maxFramerate: LIVE_HIGH_ENCODING.maxFramerate },
    videoSimulcastLayers: LIVE_SIMULCAST.map(
      (layer) => new VideoPreset(layer.width, layer.height, layer.maxBitrate, layer.maxFramerate),
    ),
  },
};

type ChatLine = { id: string; author: string; authorId: string; body: string };
type GiftEvent = {
  id: string;
  symbol: string;
  name: string;
  donorName: string;
  netCents: number;
  grossCents: number;
  feeCents: number;
};
type Heart = { id: string; x: number };

export function LiveStage({
  url,
  token,
  canPublish,
  sessionId,
  hostName,
  hostAvatar,
  isHost,
  canModerate,
  translateEnabled,
  loggedIn,
  gifts,
  initialBlessingNetCents,
  initialLightBalance,
  userLowData = false,
  onEnded,
  onError,
}: {
  url: string;
  token: string;
  canPublish: boolean;
  sessionId: string;
  hostName: string;
  hostAvatar: string;
  isHost: boolean;
  canModerate: boolean;
  translateEnabled: boolean;
  loggedIn: boolean;
  gifts: GiftChoice[];
  initialBlessingNetCents: number;
  initialLightBalance: number;
  userLowData?: boolean;
  onEnded: () => void;
  onError: () => void;
}) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={canPublish}
      video={canPublish}
      options={roomOptions}
      onError={() => onError()}
    >
      <RoomAudioRenderer />
      <Broadcast
        canPublish={canPublish}
        sessionId={sessionId}
        hostName={hostName}
        hostAvatar={hostAvatar}
        isHost={isHost}
        canModerate={canModerate}
        translateEnabled={translateEnabled}
        loggedIn={loggedIn}
        gifts={gifts}
        initialBlessingNetCents={initialBlessingNetCents}
        initialLightBalance={initialLightBalance}
        userLowData={userLowData}
        onEnded={onEnded}
      />
    </LiveKitRoom>
  );
}

function Broadcast({
  canPublish,
  sessionId,
  hostName,
  hostAvatar,
  isHost,
  canModerate,
  translateEnabled,
  loggedIn,
  gifts,
  initialBlessingNetCents,
  initialLightBalance,
  userLowData,
  onEnded,
}: {
  canPublish: boolean;
  sessionId: string;
  hostName: string;
  hostAvatar: string;
  isHost: boolean;
  canModerate: boolean;
  translateEnabled: boolean;
  loggedIn: boolean;
  gifts: GiftChoice[];
  initialBlessingNetCents: number;
  initialLightBalance: number;
  userLowData: boolean;
  onEnded: () => void;
}) {
  const { locale, messages: m } = useI18n();
  const room = useRoomContext();
  const people = useParticipants();
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const [audioOnly, setAudioOnly] = useState(false);
  const [quality, setQuality] = useState<ViewerQuality>("auto");
  const [networkSaver, setNetworkSaver] = useState(false);
  const [cameraOn, setCameraOn] = useState(canPublish);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [muted, setMuted] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [bursts, setBursts] = useState<GiftEvent[]>([]);
  const [thanks, setThanks] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [chatNote, setChatNote] = useState<string | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [slug, setSlug] = useState(gifts[0]?.slug ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [blessingNet, setBlessingNet] = useState(initialBlessingNetCents);
  const [lights, setLights] = useState(initialLightBalance);
  const [recipients, setRecipients] = useState<{ creatorId: string; name: string }[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const seenGifts = useRef(new Set<string>());
  const primed = useRef(false);
  const heartStamps = useRef<number[]>([]);
  const chosen = gifts.find((gift) => gift.slug === slug) ?? gifts[0];
  useEffect(() => {
    if (!giftOpen) return;
    let cancelled = false;
    fetch(`/api/live/sessions/${sessionId}/collab`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.recipients) return;
        setRecipients(data.recipients);
        setRecipientId((current) => current || data.recipients[0]?.creatorId || "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [giftOpen, sessionId]);
  const connection = useConnectionState();
  const [chatPaused, setChatPaused] = useState(false);
  const pausedRef = useRef(false);
  const [mediaNote, setMediaNote] = useState<string | null>(null);
  const giftAttempt = useGiftAttempt(chosen?.priceCents);
  useEffect(() => {
    pausedRef.current = chatPaused;
  }, [chatPaused]);

  function showGift(event: GiftEvent) {
    if (seenGifts.current.has(event.id)) return;
    seenGifts.current.add(event.id);
    setBursts((current) => [...current.slice(-2), event]);
    window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== event.id));
    }, 2800);
    if (isHost) {
      const who = event.donorName || m.common.anonymous;
      setThanks(`${m.live.thanks} ${who}`);
      window.setTimeout(() => setThanks(null), 3200);
    }
    void fetch(`/api/live/sessions/${sessionId}/messages`)
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ blessingNetCents: number }>;
      })
      .then((data) => {
        if (data) setBlessingNet(data.blessingNetCents);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    const onData = (payload: Uint8Array) => {
      try {
        const event = JSON.parse(new TextDecoder().decode(payload)) as {
          type?: string;
          id?: string;
          author?: string;
          authorId?: string;
          body?: string;
          transactionId?: string;
          symbol?: string;
          name?: string;
          donorName?: string;
          netCents?: number;
          grossCents?: number;
          feeCents?: number;
        };
        if (event.type === "heart" && event.id) {
          setHearts((current) => [...current.slice(-12), { id: event.id!, x: 18 + Math.round(Math.random() * 36) }]);
          window.setTimeout(() => setHearts((current) => current.filter((heart) => heart.id !== event.id)), 2600);
        }
        if (event.type === "chat" && event.id && event.body && event.author && event.authorId) {
          if (pausedRef.current || blocked.includes(event.authorId)) return;
          const line = { id: event.id, author: event.author, authorId: event.authorId, body: event.body };
          setMessages((current) => (current.some((item) => item.id === line.id) ? current : capTail([...current, line])));
        }
        if (event.type === "chat-remove" && event.id) {
          setMessages((current) => current.filter((item) => item.id !== event.id));
        }
        if (event.type === "gift" && event.transactionId) {
          showGift({
            id: event.transactionId,
            symbol: event.symbol || "✦",
            name: event.name || "",
            donorName: event.donorName || "",
            netCents: event.netCents || 0,
            grossCents: event.grossCents || 0,
            feeCents: event.feeCents || 0,
          });
        }
      } catch {
        /* ignore malformed packets */
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, blocked, isHost, m.common.anonymous, m.live.thanks]);

  useEffect(() => {
    let stop = false;
    async function pull() {
      const response = await fetch(`/api/live/sessions/${sessionId}/messages`);
      if (!response.ok || stop) return;
      const data = (await response.json()) as {
        messages: ChatLine[];
        blessingNetCents: number;
        gifts: GiftEvent[];
      };
      if (!pausedRef.current) {
        setMessages(capTail(data.messages.filter((message) => !blocked.includes(message.authorId))));
      }
      setBlessingNet(data.blessingNetCents);
      if (!primed.current) {
        data.gifts.forEach((gift) => seenGifts.current.add(gift.id));
        primed.current = true;
        return;
      }
      data.gifts.forEach((gift) => showGift(gift));
    }
    void pull();
    const timer = window.setInterval(() => void pull(), 5000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [sessionId, blocked]);

  useEffect(() => {
    const subscribe = remoteVideoSubscribed(audioOnly);
    const apply = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === Track.Kind.Video) publication.setSubscribed(subscribe);
        });
      });
    };
    apply();
    const onPublished = (publication: { kind: Track.Kind; setSubscribed: (subscribed: boolean) => void }) => {
      if (publication.kind === Track.Kind.Video) publication.setSubscribed(subscribe);
    };
    room.on(RoomEvent.TrackPublished, onPublished);
    if (canPublish) {
      room.localParticipant.setCameraEnabled(cameraOn && subscribe, { facingMode: facing, resolution: captureResolution }).catch(() => setMediaNote(m.live.cameraNeed));
      room.localParticipant.setMicrophoneEnabled(!muted).catch(() => setMediaNote(m.live.cameraNeed));
    }
    return () => {
      room.off(RoomEvent.TrackPublished, onPublished);
    };
  }, [audioOnly, cameraOn, canPublish, facing, muted, room, m.live.cameraNeed]);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }).connection;
    const read = () => setNetworkSaver(networkSavesData({ saveData: connection?.saveData, effectiveType: connection?.effectiveType }));
    read();
    connection?.addEventListener?.("change", read);
    return () => connection?.removeEventListener?.("change", read);
  }, []);

  const qualityPlan = viewerQualityPlan(quality, lowDataActive({ userEnabled: userLowData, saveData: networkSaver }));
  useEffect(() => {
    room.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        if (publication.kind !== Track.Kind.Video) return;
        if (qualityPlan === "low") publication.setVideoQuality(VideoQuality.LOW);
        else if (qualityPlan === "high") publication.setVideoDimensions({ width: LIVE_CAPTURE.width, height: LIVE_CAPTURE.height });
        else publication.setVideoQuality(VideoQuality.HIGH);
      });
    });
  }, [qualityPlan, room, tracks]);

  async function sendHeart() {
    const now = Date.now();
    heartStamps.current = heartStamps.current.filter((stamp) => now - stamp < 2000);
    if (heartStamps.current.length >= 6) return;
    heartStamps.current.push(now);
    const id = `${now}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = new TextEncoder().encode(JSON.stringify({ type: "heart", id }));
    await room.localParticipant.publishData(payload, { reliable: false }).catch(() => undefined);
    setHearts((current) => [...current.slice(-12), { id, x: 18 + Math.round(Math.random() * 36) }]);
    window.setTimeout(() => setHearts((current) => current.filter((heart) => heart.id !== id)), 2600);
  }

  async function sendChat() {
    setChatNote(null);
    const response = await fetch(`/api/live/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      setChatNote(m.auth.rateLimited);
      return;
    }
    if (!response.ok) {
      setChatNote(response.status === 401 ? m.feed.login : m.common.error);
      return;
    }
    if (data.status === "FLAGGED") setChatNote(m.comments.flagged);
    else {
      setDraft("");
      if (data.id && data.body) {
        const line = { id: data.id as string, author: data.author as string, authorId: data.authorId as string, body: data.body as string };
        setMessages((current) => (current.some((item) => item.id === line.id) ? current : [...current, line]));
      }
    }
  }

  function sendGift() {
    if (!chosen) return;
    giftAttempt.armOrSend(async (token) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/live/sessions/${sessionId}/gifts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            giftSlug: chosen.slug,
            anonymous,
            token,
            ...(recipientId ? { recipientCreatorId: recipientId } : {}),
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setChatNote(response.status === 402 ? m.gifts.notEnough : m.common.error);
          return false;
        }
        if (typeof data.lightBalance === "number") setLights(data.lightBalance);
        setReceipt(data as Receipt);
        showGift({
          id: data.transactionId,
          symbol: chosen.symbol,
          name: chosen.name,
          donorName: anonymous ? "" : m.me.title,
          netCents: data.netCents,
          grossCents: data.grossCents,
          feeCents: data.feeCents,
        });
        return true;
      } finally {
        setBusy(false);
      }
    });
  }

  async function removeMessage(id: string) {
    await fetch(`/api/live/sessions/${sessionId}/messages/${id}`, { method: "POST" });
    setMessages((current) => current.filter((message) => message.id !== id));
  }

  async function blockAuthor(authorId: string) {
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: authorId }),
    });
    setBlocked((current) => [...current, authorId]);
    setMessages((current) => current.filter((message) => message.authorId !== authorId));
    setChatNote(m.live.blocked);
  }

  async function reportAuthor(message: ChatLine) {
    await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetType: "USER",
        targetId: message.authorId,
        reason: "humiliation",
        details: message.body,
      }),
    });
    setChatNote(m.report.sent);
  }

  const visibleChat = messages.filter((message) => !blocked.includes(message.authorId)).slice(-6);

  return (
    <div className="live-fill" data-screen="live-room">
      {audioOnly || tracks.length === 0 ? (
        <div className="live-audio-only">
          <span aria-hidden="true">{audioOnly ? "♪" : "…"}</span>
          <p>
            {audioOnly
              ? m.live.audioOnly
              : connection === ConnectionState.Reconnecting
                ? m.live.reconnecting
                : m.live.cameraNeed}
          </p>
        </div>
      ) : (
        <div className={tracks.length > 1 ? "live-video many" : "live-video"}>
          {tracks.map((track) => (
            <VideoTrack key={track.publication.trackSid} trackRef={track} />
          ))}
        </div>
      )}

      <div className="live-top">
        <Link className="live-back" href="/live">
          {m.common.back}
        </Link>
        <img src={hostAvatar} alt="" />
        <div>
          <strong>{hostName}</strong>
          <div>
            {people.length} {m.live.viewers}
          </div>
        </div>
        <div className="live-total">
          <span>{m.live.blessings}</span>
          <strong>{formatMoney(blessingNet, locale)}</strong>
        </div>
      </div>

      {connection === ConnectionState.Reconnecting ? (
        <p className="live-note" role="status">
          {m.live.reconnecting}
        </p>
      ) : null}
      {mediaNote ? (
        <p className="live-note" role="status">
          {mediaNote}
        </p>
      ) : null}
      {thanks ? <div className="live-thanks">{thanks}</div> : null}
      {bursts.map((burst) => (
        <div className="gift-burst" key={burst.id}>
          <span>{burst.symbol}</span>
          <strong>{burst.name}</strong>
          <em>{burst.donorName || m.common.anonymous}</em>
        </div>
      ))}
      {hearts.map((heart) => (
        <span className="heart-float" key={heart.id} style={{ right: heart.x }}>
          ♥
        </span>
      ))}

      <LiveChatPanel sessionId={sessionId} loggedIn={loggedIn} canModerate={canModerate} translateEnabled={translateEnabled} />

      <div className="live-rail">
        <button type="button" aria-label={m.live.heart} onClick={() => void sendHeart()}>
          ♥<span>{m.live.heart}</span>
        </button>
        {loggedIn ? (
          <button type="button" onClick={() => setCollabOpen(true)}>
            +<span>{m.bond.cohosts}</span>
          </button>
        ) : null}
        {loggedIn && !isHost ? (
          <button type="button" onClick={() => { setReceipt(null); setGiftOpen(true); }}>
            ✦<span>{m.live.gift}</span>
          </button>
        ) : null}
        {canPublish ? (
          <>
            <button type="button" onClick={() => setCameraOn((value) => !value)} aria-pressed={cameraOn && !audioOnly}>
              {cameraOn && !audioOnly ? "●" : "○"}
              <span>{cameraOn && !audioOnly ? m.studio.cameraOff : m.studio.cameraOn}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = facing === "user" ? "environment" : "user";
                setFacing(next);
                setCameraOn(true);
              }}
            >
              ↻<span>{m.live.flip}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                room.localParticipant.setMicrophoneEnabled(!next).catch(() => undefined);
              }}
            >
              {muted ? "🔇" : "🎤"}
              <span>{muted ? m.live.unmute : m.live.mute}</span>
            </button>
            <button type="button" onClick={() => setAudioOnly((value) => !value)}>
              {audioOnly ? "▶" : "♪"}
              <span>{audioOnly ? m.live.camera : m.live.audioOnly}</span>
            </button>
          </>
        ) : (
          <>
            <div className="live-quality" role="group" aria-label={m.live.quality}>
              {(["auto", "high", "low"] as const).map((item) => (
                <button key={item} type="button" className={quality === item ? "on" : ""} aria-pressed={quality === item} onClick={() => setQuality(item)}>
                  {item === "auto" ? m.live.qualityAuto : item === "high" ? m.live.qualityHigh : m.live.qualityLow}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setAudioOnly((value) => !value)}>
              ♪<span>{audioOnly ? m.live.camera : m.live.audioOnly}</span>
            </button>
          </>
        )}
        {isHost ? (
          <button
            type="button"
            onClick={async () => {
              await fetch(`/api/live/sessions/${sessionId}/end`, { method: "POST" });
              onEnded();
            }}
          >
            ■<span>{m.live.end}</span>
          </button>
        ) : null}
      </div>

      {collabOpen ? (
        <Sheet title={m.bond.cohosts} onClose={() => setCollabOpen(false)}>
          <CollabPanel sessionId={sessionId} loggedIn={loggedIn} />
        </Sheet>
      ) : null}
      {giftOpen ? (
        <Sheet title={m.live.gift} onClose={() => setGiftOpen(false)}>
          <div data-screen="live-gift">
            {receipt ? (
              <div data-screen="live-gift-receipt">
                <p className="kicker">{m.gifts.receiptTitle}</p>
                <p>
                  <strong>{formatMoney(receipt.grossCents, locale)}</strong>
                </p>
                <p className="muted">{m.gifts.recorded}</p>
                <p className="muted">{paymentNote(receipt.paymentMode, m)}</p>
                <button type="button" className="btn-primary" onClick={() => setGiftOpen(false)}>
                  {m.gifts.close}
                </button>
              </div>
            ) : chosen ? (
              <div className="stack">
                <p className="kicker">{m.live.gift}</p>
                <GiftPicker gifts={gifts} selected={chosen.slug} onSelect={setSlug} />
                <GiftFundNote gift={chosen} />
                {recipients.length > 1 ? (
                  <fieldset>
                    <legend>{m.bond.recipient}</legend>
                    {recipients.map((recipient) => (
                      <label key={recipient.creatorId} className="check-row">
                        <input
                          type="radio"
                          name="live-recipient"
                          checked={recipientId === recipient.creatorId}
                          onChange={() => setRecipientId(recipient.creatorId)}
                        />
                        <span>{recipient.name}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <label className="check-row">
                  <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
                  <span>{m.gifts.anonymous}</span>
                </label>
                <LightsStatus balance={lights} priceCents={chosen.priceCents} />
                <p className="muted">
                  {m.gifts.fiat}: {formatMoney(chosen.priceCents, locale)}
                </p>
                {lights >= chosen.priceCents ? (
                  giftAttempt.armed ? (
                    <GiftConfirm priceCents={chosen.priceCents} busy={busy} onYes={sendGift} onNo={giftAttempt.cancel} />
                  ) : (
                    <button type="button" className="btn-primary" disabled={busy} onClick={sendGift}>
                      {busy ? m.gifts.sending : m.gifts.send}
                    </button>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
