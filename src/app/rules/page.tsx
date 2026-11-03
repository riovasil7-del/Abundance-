import { CONTENT_RULES } from "@/config/app";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";

export default async function RulesPage() {
  const locale = await getLocale();
  const messages = messagesFor(locale);
  return (
    <div className="page stack">
      <div>
        <p className="kicker">{messages.tagline}</p>
        <h1>{messages.rules.title}</h1>
        <p className="lede">{messages.rules.intro}</p>
      </div>
      <ul className="rule-list">
        {CONTENT_RULES.map((rule) => (
          <li key={rule.id}>{messages.rulesBody[rule.id]}</li>
        ))}
      </ul>
    </div>
  );
}
