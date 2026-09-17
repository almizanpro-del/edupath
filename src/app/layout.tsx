import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduPath - Affordable Universities for MENA Students",
  description: "Discover, compare, and review affordable universities worldwide. Built for Arabic-speaking students seeking quality education without breaking the bank.",
  keywords: ["EduPath", "university", "admission", "MENA", "Arabic students", "affordable education", "scholarships", "international students"],
  authors: [{ name: "EduPath" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "EduPath - Affordable Universities for MENA Students",
    description: "Discover, compare, and review affordable universities worldwide.",
    siteName: "EduPath",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPath",
    description: "Affordable universities for MENA students",
  },
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
