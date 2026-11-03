import Link from "next/link";
import { CreateCircleForm } from "@/components/admin-panel";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
import { getCurrentUser } from "@/server/auth";

export default async function NewCirclePage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();
  if (!user?.creatorProfile) {
    return (
      <div className="page">
        <h1>{messages.circles.create}</h1>
        <p>{messages.upload.needCreator}</p>
        <Link href="/register">{messages.auth.register}</Link>
      </div>
    );
  }
  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.circles.kicker}</p>
        <h1>{messages.circles.create}</h1>
      </div>
      <CreateCircleForm />
    </div>
  );
}
