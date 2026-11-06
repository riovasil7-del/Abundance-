"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GiftChoice } from "@/lib/types";
import { useI18n } from "./providers";

const LiveStage = dynamic(() => import("./live-stage").then((mod) => mod.LiveStage), { ssr: false });

export function LiveRoomClient({
  sessionId,
  title,
  hostName,
  hostAvatar,
  configured,
  loggedIn,
  isHost,
  gifts,
  blessingNetCents,
  lightBalance,
}: {
  sessionId: string;
  title: string;
  hostName: string;
  hostAvatar: string;
  configured: boolean;
  loggedIn: boolean;
  isHost: boolean;
  gifts: GiftChoice[];
  blessingNetCents: number;
  lightBalance: number;
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
          setConnectError(data.error === "LIVE_NOT_CONFIGURED" ? m.live.notConfigured : m.live.failed);
          return;
        }
        setConnection({ url: data.url, token: data.token, canPublish: Boolean(data.canPublish) });
      })
      .catch(() => {
        if (!cancelled) setConnectError(m.live.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [configured, sessionId, m.live.failed, m.live.notConfigured]);

  if (!configured) {
    return (
      <div className="page stack" data-screen="live-unconfigured">
        <p className="kicker">{m.live.title}</p>
        <h1>{title}</h1>
        <div className="notice">{m.live.notConfigured}</div>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="page stack">
        <h1>{hostName}</h1>
        <p className="notice">{m.live.ended}</p>
        <a className="btn-primary" href="/live">
          {m.common.back}
        </a>
      </div>
    );
  }

  return (
    <div className="live-shell">
      {connectError ? <p className="live-note">{connectError}</p> : null}
      {!connection && !connectError ? <p className="live-note">{m.live.connecting}</p> : null}
      {connection ? (
        <LiveStage
          url={connection.url}
          token={connection.token}
          canPublish={connection.canPublish}
          sessionId={sessionId}
          hostName={hostName}
          hostAvatar={hostAvatar}
          isHost={isHost}
          loggedIn={loggedIn}
          gifts={gifts}
          initialBlessingNetCents={blessingNetCents}
          initialLightBalance={lightBalance}
          onEnded={() => setEnded(true)}
          onError={() => setConnectError(m.live.failed)}
        />
      ) : null}
    </div>
  );
}
