import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";

export default async function TermsPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const terms = messages.terms;
  return (
    <article className="page stack" data-screen="terms">
      <h1>{terms.title}</h1>
      <p>{terms.lights}</p>
      <p>{terms.split}</p>
      <p>{terms.fund}</p>
      <p>{terms.holds}</p>
      <p>{terms.age}</p>
      <p>{terms.dignity}</p>
    </article>
  );
}
