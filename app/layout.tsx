import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { t } from "@/lib/i18n";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

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
  themeColor: "#0f7b5a",
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
    <html lang="fa" dir="rtl" className={`${vazir.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-pitch-50 text-ink">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
