import Link from "next/link";
import { AdminActions } from "@/components/admin-panel";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser, hasRole } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  if (!hasRole(user, ["MODERATOR", "ADMIN"])) {
    return (
      <div className="page">
        <h1>{messages.admin.title}</h1>
        <p>{messages.admin.noAccess}</p>
        <Link href="/login">{messages.auth.login}</Link>
      </div>
    );
  }

  const [reports, comments, creators, logs, videos, reviews] = await Promise.all([
    db.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 30, include: { reporter: true } }),
    db.comment.findMany({
      where: { moderationStatus: { in: ["FLAGGED", "HIDDEN"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: true },
    }),
    db.creatorProfile.findMany({ orderBy: { createdAt: "desc" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { actor: true } }),
    db.video.findMany({ where: { moderationStatus: { not: "VISIBLE" } }, take: 20 }),
    db.accountReview.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 30, include: { user: true } }),
  ]);

  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.common.admin}</p>
        <h1>{messages.admin.title}</h1>
        <p className="lede">{messages.admin.intro}</p>
      </div>

      <section className="stack" data-screen="money-reviews">
        <h2>{messages.admin.money}</h2>
        <p className="muted">{messages.admin.moneyNote}</p>
        {reviews.length === 0 ? <p className="empty">{messages.admin.empty}</p> : null}
        {reviews.map((review) => (
          <article className="card stack" key={review.id}>
            <strong>
              {review.kind} · {review.user.name}
            </strong>
            <p className="muted">
              {messages.wallet.reserved} {review.frozenCents} · {messages.admin.reversed} {review.reversedCents}
            </p>
            <AdminActions kind="review" id={review.id} />
          </article>
        ))}
      </section>

      <section className="stack">
        <h2>{messages.admin.reports}</h2>
        {reports.length === 0 ? <p className="empty">{messages.admin.empty}</p> : null}
        {reports.map((report) => (
          <article className="card stack" key={report.id}>
            <strong>
              {report.reason} · {report.targetType}
            </strong>
            <p className="muted">
              {report.reporter.name}
              {report.details ? ` — ${report.details}` : ""}
            </p>
            <AdminActions kind="report" id={report.id} />
          </article>
        ))}
      </section>

      <section className="stack">
        <h2>{messages.admin.comments}</h2>
        {comments.length === 0 ? <p className="empty">{messages.admin.empty}</p> : null}
        {comments.map((comment) => (
          <article className="card stack" key={comment.id}>
            <strong>{comment.user.name}</strong>
            <p>{comment.body}</p>
            <AdminActions kind="comment" id={comment.id} />
          </article>
        ))}
      </section>

      <section className="stack">
        <h2>{messages.admin.creators}</h2>
        {creators.map((creator) => (
          <article className="card stack" key={creator.id}>
            <div className="row">
              <strong>{creator.displayName}</strong>
              <span className={creator.verificationStatus === "VERIFIED" ? "pill" : "pill wait"}>
                {messages.verify[creator.verificationStatus]}
              </span>
            </div>
            <AdminActions kind="creator" id={creator.id} />
          </article>
        ))}
      </section>

      {videos.length > 0 ? (
        <section className="stack">
          <h2>{messages.creator.videos}</h2>
          {videos.map((video) => (
            <article className="card stack" key={video.id}>
              <strong>{video.title}</strong>
              <AdminActions kind="video" id={video.id} />
            </article>
          ))}
        </section>
      ) : null}

      <section className="stack">
        <h2>{messages.admin.audit}</h2>
        {logs.map((log) => (
          <article className="card" key={log.id}>
            <strong>{log.action}</strong>
            <div className="muted">
              {log.actor?.name ?? "—"} · {log.entityType} · {log.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
