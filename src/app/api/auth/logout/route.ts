import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth";

export async function POST(request: Request) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
