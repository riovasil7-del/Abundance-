import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, Noto_Sans_Arabic, Noto_Sans_Ethiopic, Noto_Serif_Ethiopic } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { AgeGate } from "@/components/age-gate";
import { BottomNav } from "@/components/bottom-nav";
import { IntroTour } from "@/components/intro-tour";
import { LangSwitch } from "@/components/lang-switch";
import { LocaleSync } from "@/components/locale-sync";
import { Mark } from "@/components/mark";
import { I18nProvider } from "@/components/providers";
import { RegisterSw } from "@/components/register-sw";
import { consentActive } from "@/server/age-gate";
import { getCurrentUser } from "@/server/auth";
import { LANGUAGE_META, messagesFor } from "@/i18n";
import { followsDeviceLanguage, getLocale } from "@/i18n/get-locale";
import { THEME_COOKIE, parseTheme, themeBootScript } from "@/lib/theme";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display",
  preload: true,
});

const body = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
  preload: true,
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-arabic",
  preload: false,
});

const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-ethiopic",
  preload: false,
});

const ethiopicSerif = Noto_Serif_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["600"],
  display: "swap",
  variable: "--font-ethiopic-serif",
  preload: false,
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Sme z jednej matky a jedného Boha.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const dynamic = "force-dynamic";

export async function generateViewport(): Promise<Viewport> {
  const user = await getCurrentUser();
  const cookieTheme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const theme = parseTheme(user?.themeChoice) ?? cookieTheme;
  return {
    themeColor: theme === "diamond" ? "#07060f" : theme === "garden" ? "#f4e2cc" : "#f6efe6",
    width: "device-width",
    initialScale: 1,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const cookieTheme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const theme = parseTheme(user?.themeChoice) ?? cookieTheme;
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
    <html
      lang={locale}
      dir={dir}
      data-theme={theme ?? undefined}
      data-low={user?.lowData ? "1" : undefined}
      className={`${display.variable} ${body.variable} ${arabic.variable} ${ethiopic.variable} ${ethiopicSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <LocaleSync locale={locale} followDevice={followDevice} />
          <IntroTour />
          <AgeGate mode={ageMode} />
          <div className="sky">
            <div className="frame">
              <header className="site-header">
                <Link href="/" className="brand">
                  <Mark />
                  <span>
                    <span className="brand-name">{APP_NAME}</span>
                    <span className="brand-tag">{messages.tagline}</span>
                  </span>
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
