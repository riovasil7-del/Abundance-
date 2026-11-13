import { ConsentForm } from "@/components/consent-form";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { consentActive } from "@/server/age-gate";
import { hashConsentToken } from "@/server/consent-token";
import { db } from "@/server/db";

export default async function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const row = token.length >= 20
    ? await db.parentalConsent.findUnique({
        where: { tokenHash: hashConsentToken(token) },
        include: { user: { select: { name: true } } },
      })
    : null;
  if (!row) {
    return (
      <div className="page stack">
        <h1>{messages.guardian.title}</h1>
        <p>{messages.guardian.missing}</p>
      </div>
    );
  }
  const status = consentActive(row) ? "approved" : row.revokedAt ? "revoked" : "pending";
  return (
    <article className="page stack" data-screen="parent-consent">
      <h1>{messages.guardian.title}</h1>
      <p>{messages.guardian.intro}</p>
      <p>
        <strong>{messages.guardian.child}:</strong> {row.user.name}
      </p>
      <p>{messages.guardian.rules}</p>
      <p className="muted">{messages.guardian.notCheck}</p>
      <ConsentForm token={token} status={status} />
    </article>
  );
}
