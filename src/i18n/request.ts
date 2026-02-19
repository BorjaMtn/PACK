import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, localeCookieName, locales, type AppLocale } from "./config";

function parseAcceptLanguage(value: string | null): AppLocale {
  if (!value) {
    return defaultLocale;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes("es")) {
    return "es";
  }

  return defaultLocale;
}

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const headerLocale = parseAcceptLanguage(headerStore.get("accept-language"));

  const locale = isAppLocale(cookieLocale) ? cookieLocale : headerLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
