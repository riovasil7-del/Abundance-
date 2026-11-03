import Link from "next/link";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { formatMoney, pickLocalized } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";

export default async function CirclesPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  const circles = await db.blessingCircle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      participants: { include: { creator: true } },
      transactions: { where: { status: { in: ["HELD", "AVAILABLE", "PAID_OUT"] } }, select: { netCents: true } },
    },
  });

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.circles.kicker}</p>
        <h1>{messages.circles.title}</h1>
        <p className="lede">{messages.circles.subtitle}</p>
      </div>
      {user?.creatorProfile ? (
        <Link className="btn-primary" href="/circles/new">
          {messages.circles.create}
        </Link>
      ) : null}
      {circles.length === 0 ? <p className="empty">{messages.circles.empty}</p> : null}
      {circles.map((circle) => {
        const shared = circle.transactions.reduce((sum, transaction) => sum + transaction.netCents, 0);
        return (
          <Link key={circle.id} href={`/circles/${circle.id}`} className="card stack" style={{ textDecoration: "none" }}>
            <span className="pill">{messages.circles.everyone}</span>
            <h2>{pickLocalized(locale, circle.title, circle.titleEn)}</h2>
            <p className="muted">{pickLocalized(locale, circle.description, circle.descriptionEn)}</p>
            <div className="row">
              <span>
                {circle.participants.length} · {messages.circles.participants}
              </span>
              <strong>
                {messages.circles.shared} {formatMoney(shared, locale)}
              </strong>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
