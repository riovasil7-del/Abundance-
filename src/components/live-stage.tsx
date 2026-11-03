"use client";

import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useRoomContext, useTracks } from "@livekit/components-react";
import { Track, type RoomOptions } from "livekit-client";
import { useEffect } from "react";

const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  publishDefaults: {
    simulcast: true,
  },
};

export function LiveStage({
  url,
  token,
  canPublish,
  audioOnly,
  onError,
}: {
  url: string;
  token: string;
  canPublish: boolean;
  audioOnly: boolean;
  onError: (message: string) => void;
}) {
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio={canPublish}
      video={canPublish && !audioOnly}
      options={roomOptions}
      onError={(error) => onError(error.message)}
    >
      <Bandwidth audioOnly={audioOnly} canPublish={canPublish} />
      <Stage audioOnly={audioOnly} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Bandwidth({ audioOnly, canPublish }: { audioOnly: boolean; canPublish: boolean }) {
  const room = useRoomContext();
  useEffect(() => {
    const apply = () => {
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === Track.Kind.Video) {
            publication.setSubscribed(!audioOnly);
          }
        });
      });
      if (canPublish) {
        room.localParticipant.setCameraEnabled(!audioOnly).catch(() => undefined);
      }
    };
    apply();
    room.on("trackPublished", apply);
    return () => {
      room.off("trackPublished", apply);
    };
  }, [audioOnly, canPublish, room]);
  return null;
}

function Stage({ audioOnly }: { audioOnly: boolean }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  if (audioOnly || tracks.length === 0) {
    return <div className="live-audio-only">{audioOnly ? "♪" : "…"}</div>;
  }
  return (
    <div className={tracks.length > 1 ? "live-grid many" : "live-grid"}>
      {tracks.map((track) => (
        <VideoTrack key={track.publication.trackSid} trackRef={track} />
      ))}
    </div>
  );
}
