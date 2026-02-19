"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LandingLocale = "en" | "es";

const STORAGE_KEY = "NEXT_LOCALE";

const copy = {
  en: {
    brand: "Pack",
    heroLine1: "You have a pack 🐾",
    heroLine2: "You just haven’t found it yet",
    heroBody: "You are not too much. You are not alone. Your people are out there.",
    mainCta: "Find my pack 🐾",
    socialProof: "🐺 +120 members already found their pack",
    card1Title: "Find others like you 🐾",
    card1Body: "People who feel what you feel, without needing to explain.",
    card2Title: "Speak freely. They understand you",
    card2Body: "Share what’s inside you in a space that feels safe and real.",
    card3Title: "Your pack exists outside the screen",
    card3Body: "Turn connection into real moments, together in your city.",
    finalCtaTitle: "Your pack is already out there 🐾",
  },
  es: {
    brand: "Pack",
    heroLine1: "Tienes una manada 🐾",
    heroLine2: "Solo que todavía no la has encontrado",
    heroBody: "No eres demasiado. No estás sola/o. Tu gente está ahí fuera.",
    mainCta: "Encontrar mi manada 🐾",
    socialProof: "🐺 +120 miembros ya han encontrado su manada",
    card1Title: "Encuentra a otros como tú 🐾",
    card1Body: "Personas que sienten lo que tú sientes, sin tener que explicarte.",
    card2Title: "Habla libremente. Te entienden",
    card2Body: "Comparte lo que llevas dentro en un espacio seguro y real.",
    card3Title: "Tu manada existe fuera de la pantalla",
    card3Body: "Convierte la conexión en momentos reales, juntos en tu ciudad.",
    finalCtaTitle: "Tu manada ya está ahí fuera 🐾",
  },
} as const;

function detectBrowserLocale(): LandingLocale {
  if (typeof navigator === "undefined") {
    return "en";
  }

  const value = navigator.language.toLowerCase();
  return value.startsWith("es") ? "es" : "en";
}

export function LandingClient() {
  const [locale, setLocale] = useState<LandingLocale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "es") {
      setLocale(saved);
      document.cookie = `NEXT_LOCALE=${saved}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      return;
    }

    const detected = detectBrowserLocale();
    setLocale(detected);
    window.localStorage.setItem(STORAGE_KEY, detected);
    document.cookie = `NEXT_LOCALE=${detected}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const t = useMemo(() => copy[locale], [locale]);

  function handleLocaleChange(nextLocale: LandingLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-zinc-950 px-5 pb-10 pt-8 text-zinc-100">
      <section className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t.brand}</p>
          <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/70 p-1 text-[11px]">
            <button
              onClick={() => handleLocaleChange("en")}
              className={`rounded-full px-2.5 py-1 font-semibold transition ${
                locale === "en" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"
              }`}
              type="button"
            >
              EN
            </button>
            <button
              onClick={() => handleLocaleChange("es")}
              className={`rounded-full px-2.5 py-1 font-semibold transition ${
                locale === "es" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400"
              }`}
              type="button"
            >
              ES
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          <span className="block">{t.heroLine1}</span>
          <span className="block">{t.heroLine2}</span>
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-300">{t.heroBody}</p>
        <Link
          href="/auth"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition active:scale-[0.98]"
        >
          {t.mainCta}
        </Link>
        <p className="mt-3 text-center text-xs text-zinc-400">{t.socialProof}</p>
      </section>

      <section className="mt-6 space-y-3">
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-base font-semibold">{t.card1Title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t.card1Body}</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-base font-semibold">{t.card2Title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t.card2Body}</p>
        </article>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="text-base font-semibold">{t.card3Title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t.card3Body}</p>
        </article>
      </section>

      <section className="mt-7 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 text-center">
        <p className="text-lg font-semibold tracking-tight">{t.finalCtaTitle}</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition active:scale-[0.98]"
        >
          {t.mainCta}
        </Link>
      </section>
    </main>
  );
}
