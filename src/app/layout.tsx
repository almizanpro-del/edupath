']* This file was updated to force Vercel rebuild *
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EduPath - Affordable Universities for MENA Students",
    template: "%s | EduPath",
  },
  description: "Discover, compare, and review 107+ affordable universities across 10 countries. AI essay review, scholarship matching, transfer pathways. Built for Arabic-speaking students.",
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
    title: "EduPath - Affordable Universities for MENA Students",
    description: "Discover, compare, and review 107+ affordable universities worldwide. AI essay review, scholarship matching, transfer pathways.",
    siteName: "EduPath",
    type: "website",
    url: "https://edupath-amber-three.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPath - Affordable Universities for MENA Students",
    description: "Discover, compare, and review 107+ affordable universities worldwide.",
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1628" },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
            <Toaster />
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

