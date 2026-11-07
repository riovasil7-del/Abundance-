import Link from "next/link";
import { StoryForm } from "@/components/story-form";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { pickLocalized } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";

export default async function UploadPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="page">
        <h1>{messages.upload.title}</h1>
        <Link href="/login">{messages.auth.login}</Link>
      </div>
    );
  }
  if (!user.creatorProfile) {
    return (
      <div className="page stack">
        <h1>{messages.upload.title}</h1>
        <p>{messages.upload.needCreator}</p>
        <Link href="/rules">{messages.upload.rulesLink}</Link>
      </div>
    );
  }
  const memberships = await db.circleParticipant.findMany({
    where: { creatorId: user.creatorProfile.id },
    include: { circle: true },
  });

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.upload.rulesLink}</p>
        <h1>{messages.upload.title}</h1>
        <Link href="/rules">{messages.upload.rulesLink}</Link>
      </div>
      <StoryForm
        ownerId={user.id}
        circles={memberships.map((membership) => ({
          id: membership.circle.id,
          title: pickLocalized(locale, membership.circle.title, membership.circle.titleEn),
        }))}
      />
    </div>
  );
}
