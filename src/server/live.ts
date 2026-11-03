/**
 * Live streaming seam. The MVP does not open a real room.
 * LiveKit, Agora, or Mux can replace StubLiveProvider later.
 */

export type LiveRoom = {
  provider: string;
  roomId: string;
  status: "stub";
};

export interface LiveStreamingProvider {
  readonly providerName: string;
  createRoom(creatorId: string): Promise<LiveRoom>;
}

export class StubLiveProvider implements LiveStreamingProvider {
  readonly providerName = "stub";

  async createRoom(creatorId: string): Promise<LiveRoom> {
    return {
      provider: "stub",
      roomId: `stub_${creatorId}`,
      status: "stub",
    };
  }
}

export class LiveKitProvider implements LiveStreamingProvider {
  readonly providerName = "livekit";
  async createRoom(): Promise<LiveRoom> {
    throw new Error("LIVEKIT_NOT_CONFIGURED");
  }
}

export function getLiveProvider(): LiveStreamingProvider {
  const choice = process.env.LIVE_PROVIDER ?? "stub";
  if (choice === "livekit") return new LiveKitProvider();
  return new StubLiveProvider();
}
