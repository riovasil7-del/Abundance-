import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_Arabic, Noto_Sans_Ethiopic, Outfit } from "next/font/google";
import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { AgeGate } from "@/components/age-gate";
import { BottomNav } from "@/components/bottom-nav";
import { IntroTour } from "@/components/intro-tour";
import { LangSwitch } from "@/components/lang-switch";
import { LocaleSync } from "@/components/locale-sync";
import { I18nProvider } from "@/components/providers";
import { RegisterSw } from "@/components/register-sw";
import { consentActive } from "@/server/age-gate";
import { getCurrentUser } from "@/server/auth";
import { LANGUAGE_META, messagesFor } from "@/i18n";
import { followsDeviceLanguage, getLocale } from "@/i18n/get-locale";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "600"],
});

const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  variable: "--font-ethiopic",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Sme z jednej matky a jedného Boha.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ee",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const locale = await getLocale(user);
  const followDevice = await followsDeviceLanguage(user);
  const messages = messagesFor(locale);
  const dir = LANGUAGE_META[locale].dir;
  const ageMode = !user?.creatorProfile || user.adultAttestedAt
    ? null
    : user.minorDeclaredAt
      ? consentActive(user.parentalConsent) ? null : "parent"
      : "ask";

  return (
    <html lang={locale} dir={dir} className={`${display.variable} ${sans.variable} ${arabic.variable} ${ethiopic.variable}`}>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <LocaleSync locale={locale} followDevice={followDevice} />
          <IntroTour />
          <AgeGate mode={ageMode} />
          <div className="sky">
            <div className="frame">
              <header className="site-header">
                <Link href="/" className="brand">
                  <span className="brand-name">{APP_NAME}</span>
                  <span className="brand-tag">{messages.tagline}</span>
                </Link>
                <div className="header-actions">
                  <Link href="/live">{messages.live.title}</Link>
                  {user ? <span className="who">{user.name.split(" ")[0]}</span> : <Link href="/login">{messages.auth.login}</Link>}
                  <LangSwitch locale={locale} />
                </div>
              </header>
              <main>{children}</main>
              <footer className="site-footer">
                <Link href="/terms">{messages.terms.link}</Link>
              </footer>
              <BottomNav />
            </div>
          </div>
          <RegisterSw />
        </I18nProvider>
      </body>
    </html>
  );
}
