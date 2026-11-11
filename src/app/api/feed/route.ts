import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { loadFeedPage, parseFeedView } from "@/server/feed";
import { getLocale } from "@/i18n/get-locale";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  const locale = await getLocale();
  const page = await loadFeedPage({
    locale,
    userId: user?.id ?? null,
    view: parseFeedView(url.searchParams.get("view")),
    cursor: url.searchParams.get("cursor"),
    category: url.searchParams.get("category"),
  });
  return NextResponse.json(page);
}
