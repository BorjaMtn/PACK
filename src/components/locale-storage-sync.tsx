"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

const STORAGE_KEY = "NEXT_LOCALE";

export function LocaleStorageSync() {
  const locale = useLocale();

  useEffect(() => {
    const current = locale === "es" ? "es" : "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== current) {
      window.localStorage.setItem(STORAGE_KEY, current);
    }
    document.cookie = `NEXT_LOCALE=${current}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [locale]);

  return null;
}
