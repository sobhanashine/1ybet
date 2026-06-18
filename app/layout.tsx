import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { t } from "@/lib/i18n";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import TelegramProvider from "@/components/TelegramProvider";

const vazir = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: t.appName,
  description: t.tagline,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: t.appName },
};

export const viewport: Viewport = {
  themeColor: "#0a120e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The Telegram WebApp SDK (loaded beforeInteractive) injects --tg-viewport-*
    // CSS vars onto <html> before hydration, which React would flag as an
    // attribute mismatch. suppressHydrationWarning silences that for the root el.
    <html
      lang="fa"
      dir="rtl"
      className={`${vazir.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Load Telegram WebApp SDK before interactive scripts */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col text-ink">
        {children}
        <TelegramProvider />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
