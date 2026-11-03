import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { BottomNav } from "@/components/bottom-nav";
import { LangSwitch } from "@/components/lang-switch";
import { I18nProvider } from "@/components/providers";
import { RegisterSw } from "@/components/register-sw";
import { getCurrentUser } from "@/server/auth";
import { messagesFor } from "@/i18n";
import { getLocale } from "@/i18n/get-locale";
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
  const locale = await getLocale();
  const messages = messagesFor(locale);
  const user = await getCurrentUser();

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable}`}>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <div className="sky">
            <div className="frame">
              <header className="site-header">
                <Link href="/" className="brand">
                  <span className="brand-name">{APP_NAME}</span>
                  <span className="brand-tag">{messages.tagline}</span>
                </Link>
                <div className="header-actions">
                  {user ? <span className="who">{user.name.split(" ")[0]}</span> : <Link href="/login">{messages.auth.login}</Link>}
                  <LangSwitch locale={locale} />
                </div>
              </header>
              <main>{children}</main>
              <BottomNav />
            </div>
          </div>
          <RegisterSw />
        </I18nProvider>
      </body>
    </html>
  );
}
