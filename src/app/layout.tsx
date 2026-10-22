import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tajawal } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { CookieConsent } from "@/components/edupath/cookie-consent";
import { PostHogProvider } from "@/components/edupath/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: {
      default: t("titleDefault"),
      template: "%s | EduPath",
    },
    description: t("description"),
    keywords: [
      "EduPath", "affordable universities", "MENA students", "Arabic students",
      "study abroad", "scholarships", "university admission", "Jordan education",
      "Egypt education", "Turkey universities", "Germany universities", "Malaysia universities",
      "international students", "transfer credits", "AI essay review", "cost calculator",
    ],
    authors: [{ name: "EduPath" }],
    metadataBase: new URL("https://edupath-amber-three.vercel.app"),
    alternates: {
      canonical: "/",
      languages: { en: "/", ar: "/" },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      siteName: "EduPath",
      type: "website",
      url: "https://edupath-amber-three.vercel.app",
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "EduPath",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === "ar";

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tajawal.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <PostHogProvider>
              {children}
              <Toaster />
              <CookieConsent />
            </PostHogProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) { console.log('[SW] registered'); },
                    function(err) { console.log('[SW] failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

