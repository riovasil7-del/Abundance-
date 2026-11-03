import { NextResponse } from "next/server";
import { readLiveKitCredentials } from "@/server/live-access";

export async function GET() {
  const credentials = readLiveKitCredentials();
  return NextResponse.json({ configured: Boolean(credentials) });
}
