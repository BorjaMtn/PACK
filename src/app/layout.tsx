import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { LocaleStorageSync } from "@/components/locale-storage-sync";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "Pack",
  description: "Find your pack.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="h-dvh overflow-hidden">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <LocaleStorageSync />
          <ServiceWorkerRegister />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
