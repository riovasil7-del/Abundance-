import { readLiveKitCredentials } from "./live-access";

/** Tell everyone already in the LiveKit room. Safe to call from a Vercel function: it returns when the packet is sent. */
export async function publishRoomEvent(roomName: string, event: unknown): Promise<void> {
  const credentials = readLiveKitCredentials();
  if (!credentials) return;
  try {
    const { DataPacket_Kind, RoomServiceClient } = await import("livekit-server-sdk");
    const httpUrl = credentials.url.replace(/^ws/i, "http");
    const client = new RoomServiceClient(httpUrl, credentials.apiKey, credentials.apiSecret);
    await client.sendData(roomName, new TextEncoder().encode(JSON.stringify(event)), DataPacket_Kind.RELIABLE, {
      topic: "hojnost",
    });
  } catch (error) {
    console.error("LIVE_DATA_FAILED", error instanceof Error ? error.message : error);
  }
}
