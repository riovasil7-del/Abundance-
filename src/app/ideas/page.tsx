import { IdeasLibrary } from "@/components/ideas-library";
import { IDEA_CATEGORIES } from "@/config/app";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { publicIdea } from "@/lib/idea-rules";

export default async function IdeasPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const ideas = await db.idea.findMany({
    where: user ? { OR: [{ status: "approved" }, { createdById: user.id }] } : { status: "approved" },
    orderBy: { title: "asc" },
    include: user ? { saves: { where: { userId: user.id }, select: { id: true } } } : undefined,
  });
  const cards = ideas.map((idea) =>
    publicIdea(
      {
        ...idea,
        saved: "saves" in idea && Array.isArray(idea.saves) ? idea.saves.length > 0 : false,
      },
      locale,
    ),
  );

  return (
    <div className="page stack" data-screen="ideas">
      <div>
        <p className="kicker">{messages.nav.ideas}</p>
        <h1>{messages.ideas.title}</h1>
        <p className="lede">{messages.ideas.lead}</p>
      </div>
      <IdeasLibrary
        ideas={cards}
        categories={[...IDEA_CATEGORIES]}
        loggedIn={Boolean(user)}
      />
    </div>
  );
}
