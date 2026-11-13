"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { liveStartNotice, type LiveStartNotice } from "@/lib/live-start";
import type { GiftChoice } from "@/lib/types";
import { LiveChatPanel } from "./live-chat-panel";
import { useI18n } from "./providers";

const LiveStage = dynamic(() => import("./live-stage").then((mod) => mod.LiveStage), { ssr: false });

function roomNotice(notice: LiveStartNotice | null, m: { live: { ageFirst: string; needCreator: string; notConfigured: string; circleOnly: string; startFailed: string; failed: string }; terms: { need: string }; guardian: { locked: string; noLive: string } }) {
  if (notice === "age") return m.live.ageFirst;
  if (notice === "terms") return m.terms.need;
  if (notice === "creator") return m.live.needCreator;
  if (notice === "config") return m.live.notConfigured;
  if (notice === "circle") return m.live.circleOnly;
  if (notice === "parent") return m.guardian.locked;
  if (notice === "minorLive") return m.guardian.noLive;
  if (notice === "failed") return m.live.startFailed;
  return m.live.failed;
}

export function LiveRoomClient({
  sessionId,
  title,
  hostName,
  hostAvatar,
  hostUserId,
  configured,
  loggedIn,
  isHost,
  canModerate,
  translateEnabled,
  gifts,
  blessingNetCents,
  lightBalance,
  userLowData = false,
}: {
  sessionId: string;
  title: string;
  hostName: string;
  hostAvatar: string;
  hostUserId: string;
  configured: boolean;
  loggedIn: boolean;
  isHost: boolean;
  canModerate: boolean;
  translateEnabled: boolean;
  gifts: GiftChoice[];
  blessingNetCents: number;
  lightBalance: number;
  userLowData?: boolean;
}) {
  const { messages: m } = useI18n();
  const [connection, setConnection] = useState<{ url: string; token: string; canPublish: boolean } | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetch(`/api/live/sessions/${sessionId}/token`, { method: "POST" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          const notice = liveStartNotice(typeof data.error === "string" ? data.error : undefined, false);
          setConnectError(roomNotice(notice, m));
          return;
        }
        setConnection({ url: data.url, token: data.token, canPublish: Boolean(data.canPublish) });
      })
      .catch(() => {
        if (!cancelled) setConnectError(m.live.startFailed);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, sessionId, m.live.failed, m.live.notConfigured]);

  if (!configured) {
    return (
      <div className="live-shell" data-screen="live-room">
        <div className="live-audio-only" data-screen="live-stage">
          <p>{title}</p>
          <p>{hostName}</p>
          <p>{m.live.audioOnly}</p>
        </div>
        <LiveChatPanel sessionId={sessionId} loggedIn={loggedIn} canModerate={canModerate} translateEnabled={translateEnabled} />
      </div>
    );
  }

  if (ended) {
    return (
      <div className="page stack">
        <h1>{hostName}</h1>
        <p className="notice">{m.live.ended}</p>
        <Link className="btn-primary" href="/live">
          {m.common.back}
        </Link>
      </div>
    );
  }

  return (
    <div className="live-shell">
      {connectError ? <p className="live-note" role="alert">{connectError}</p> : null}
      {connection && isHost && !connection.canPublish ? <p className="live-note" role="alert">{m.live.ageFirst}</p> : null}
      {!connection && !connectError ? <p className="live-note">{m.live.connecting}</p> : null}
      {connection ? (
        <LiveStage
          url={connection.url}
          token={connection.token}
          canPublish={connection.canPublish}
          sessionId={sessionId}
          hostName={hostName}
          hostAvatar={hostAvatar}
          hostUserId={hostUserId}
          title={title}
          isHost={isHost}
          canModerate={canModerate}
          translateEnabled={translateEnabled}
          loggedIn={loggedIn}
          gifts={gifts}
          initialBlessingNetCents={blessingNetCents}
          initialLightBalance={lightBalance}
          userLowData={userLowData}
          onEnded={() => setEnded(true)}
          onError={() => setConnectError(m.live.failed)}
        />
      ) : null}
    </div>
  );
}
