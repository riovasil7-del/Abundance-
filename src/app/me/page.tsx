import Link from "next/link";
import { AgeAttest } from "@/components/age-attest";
import { ReopenIntroButton } from "@/components/intro-tour";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { formatMoney } from "@/lib/format";
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
        <Link className="btn-primary" href="/login">
          {messages.auth.login}
        </Link>
        <ReopenIntroButton />
      </div>
    );
  }
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
        <p className="notice">{user.adultAttestedAt ? messages.age.declared : messages.age.need}</p>
      </div>
      {user.adultAttestedAt ? null : <AgeAttest />}
      {user.creatorProfile ? (
        <Link className="btn-ghost" href={`/creator/${user.creatorProfile.slug}`}>
          {user.creatorProfile.displayName}
        </Link>
      ) : null}
      {hasRole(user, ["MODERATOR", "ADMIN"]) ? (
        <Link className="btn-primary" href="/admin">
          {messages.common.admin}
        </Link>
      ) : null}
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
