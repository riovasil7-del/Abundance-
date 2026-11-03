import { FeedExperience } from "@/components/feed-experience";
import { loadGiftChoices } from "@/server/catalog";
import { getCurrentUser } from "@/server/auth";
import { loadFeed } from "@/server/feed";
import { getLocale } from "@/i18n/get-locale";

export default async function HomePage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  const [videos, gifts] = await Promise.all([loadFeed(locale, user?.id ?? null), loadGiftChoices(locale)]);

  return (
    <div className="feed-page">
      <FeedExperience videos={videos} gifts={gifts} loggedIn={Boolean(user)} viewerName={user?.name ?? null} />
    </div>
  );
}
