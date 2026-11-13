import Link from "next/link";
import { ReportNoteButton } from "@/components/report-note";
import { AgeAttest } from "@/components/age-attest";
import { ReopenIntroButton } from "@/components/intro-tour";
import { LangSwitch } from "@/components/lang-switch";
import { UnblockButton } from "@/components/unblock-button";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { formatMoney } from "@/lib/format";
import { consentActive } from "@/server/age-gate";
import { getCurrentUser, hasRole } from "@/server/auth";
import { db } from "@/server/db";

export default async function MePage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="page">
        <h1>{messages.me.title}</h1>
        <LangSwitch locale={locale} />
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
        <ReopenIntroButton />
      </div>
    );
  }
  const following = await db.follow.findMany({
    where: { followerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { creator: { include: { creatorProfile: true } } },
  });
  const notes = await db.encouragement.findMany({
    where: { toUserId: user.id, moderationStatus: "VISIBLE" },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { fromUser: { select: { name: true } } },
  });
  const blocks = await db.userBlock.findMany({
    where: { blockerId: user.id },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const families = await db.familyMembership.findMany({
    where: { supporterId: user.id, status: "ACTIVE" },
    include: { creator: true },
  });

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.me.role}</p>
        <h1>{user.name}</h1>
        <p className="lede">{messages.roles[user.role]}</p>
        <p>{messages.me.oneAccount}</p>
        <p className="notice">
          {user.adultAttestedAt
            ? messages.age.declared
            : user.minorDeclaredAt
              ? consentActive(user.parentalConsent)
                ? messages.guardian.canPost
                : messages.guardian.locked
              : messages.age.need}
        </p>
      </div>
      {user.adultAttestedAt ? null : <AgeAttest />}
      {user.creatorProfile ? (
        <Link className="btn-ghost" href={`/creator/${user.creatorProfile.slug}`}>
          {user.creatorProfile.displayName}
        </Link>
      ) : null}
      <LangSwitch locale={locale} />
      <section className="stack" data-screen="chat-blocks">
        <h2>{messages.me.blockedTitle}</h2>
        {blocks.length === 0 ? <p className="empty">{messages.me.blockedEmpty}</p> : null}
        {blocks.map((block) => (
          <div className="row" key={block.id}>
            <span>{block.blocked.name}</span>
            <UnblockButton userId={block.blocked.id} label={messages.me.unblock} />
          </div>
        ))}
      </section>
      <Link className="muted" href="/terms">
        {messages.terms.link}
      </Link>
      {hasRole(user, ["MODERATOR", "ADMIN"]) ? (
        <Link className="btn-primary" href="/admin">
          {messages.common.admin}
        </Link>
      ) : null}
      <section className="stack" data-screen="following">
        <h2>{messages.bond.followingList}</h2>
        {following.length === 0 ? <p className="empty">{messages.bond.followingEmpty}</p> : null}
        {following.map((row) =>
          row.creator.creatorProfile ? (
            <Link key={row.id} href={`/creator/${row.creator.creatorProfile.slug}`} className="card" style={{ textDecoration: "none" }}>
              <strong>{row.creator.creatorProfile.displayName}</strong>
            </Link>
          ) : null,
        )}
      </section>
      <section className="stack" data-screen="private-inbox">
        <h2>{messages.bond.inbox}</h2>
        <p className="muted">{messages.bond.thanksHint}</p>
        {notes.length === 0 ? <p className="empty">{messages.bond.inboxEmpty}</p> : null}
        {notes.map((note) => (
          <article key={note.id} className="card">
            <strong>{note.fromUser.name}</strong>
            <p>{note.kind === "HELPFUL" ? messages.bond.reaction : note.body}</p>
            <ReportNoteButton id={note.id} />
          </article>
        ))}
      </section>
      <section className="stack">
        <h2>{messages.me.family}</h2>
        {families.length === 0 ? <p className="empty">{messages.me.none}</p> : null}
        {families.map((family) => (
          <Link key={family.id} href={`/creator/${family.creator.slug}`} className="card" style={{ textDecoration: "none" }}>
            <strong>{family.creator.displayName}</strong>
            <div>{formatMoney(family.monthlyCents, locale)}</div>
          </Link>
        ))}
      </section>
      <ReopenIntroButton />
      <form action="/api/auth/logout" method="post">
        <button className="btn-ghost" type="submit">
          {messages.auth.logout}
        </button>
      </form>
    </div>
  );
}
