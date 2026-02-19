import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocaleAction } from "./actions";
import { defaultLocale } from "@/i18n/config";
import Link from "next/link";
import Image from "next/image";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const t = await getTranslations("Profile");
  const locale = await getLocale();
  const params = await searchParams;
  const updated = params.updated === "1";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const withIdentityQuery = await supabase
    .from("profiles")
    .select("alias, therian_type, tags, bio, animal_identity, avatar_url, safe_mode")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  let profile = withIdentityQuery.data;
  if (
    withIdentityQuery.error?.message?.includes("animal_identity") ||
    withIdentityQuery.error?.message?.includes("avatar_url")
  ) {
    const fallbackQuery = await supabase
      .from("profiles")
      .select("alias, therian_type, tags, bio, safe_mode")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    profile = fallbackQuery.data
      ? { ...fallbackQuery.data, animal_identity: null, avatar_url: null }
      : null;
  }

  const rawAlias = typeof profile?.alias === "string" ? profile.alias : "";
  const rawTherianType = typeof profile?.therian_type === "string" ? profile.therian_type : "";
  const rawBio = typeof profile?.bio === "string" ? profile.bio : "";
  const rawIdentity = typeof profile?.animal_identity === "string" ? profile.animal_identity : "";
  const tags = Array.isArray(profile?.tags)
    ? profile.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];

  const alias = rawAlias.trim() || user?.email?.split("@")[0] || t("unknownAlias");
  const therianType = rawTherianType.trim() || t("unknown");
  const avatarInitial = alias[0]?.toUpperCase() ?? "?";
  const accent =
    therianType.toLowerCase().includes("wolf") || therianType.toLowerCase().includes("dog")
      ? "from-amber-300/30 to-orange-400/10"
      : therianType.toLowerCase().includes("cat") || therianType.toLowerCase().includes("feline")
        ? "from-pink-300/30 to-rose-400/10"
        : therianType.toLowerCase().includes("fox")
          ? "from-orange-300/30 to-red-400/10"
          : therianType.toLowerCase().includes("bird")
            ? "from-sky-300/30 to-cyan-400/10"
            : "from-violet-300/30 to-indigo-400/10";

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
      <div className="mt-4">
        <Link
          href="/profile/edit"
          className="inline-flex rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
        >
          {t("editProfile")}
        </Link>
      </div>
      {updated ? (
        <p className="mt-3 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("updated")}
        </p>
      ) : null}

      <section className={`mt-5 rounded-3xl border border-zinc-800/90 bg-gradient-to-br ${accent} p-[1px]`}>
        <div className="rounded-[22px] bg-zinc-950/95 p-5 shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
          <div className={`rounded-2xl bg-gradient-to-r ${accent} p-[1px]`}>
            <div className="relative rounded-[15px] bg-zinc-900/95 p-4">
              <div className="h-16 rounded-xl bg-zinc-800/60" />
              <div className="absolute left-4 top-12 grid h-14 w-14 place-items-center rounded-full border-2 border-zinc-900 bg-zinc-100 text-xl font-bold text-zinc-950 shadow-[0_10px_24px_rgba(0,0,0,0.4)]">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={56}
                    height={56}
                    unoptimized
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="ml-20">
                <p className="text-2xl font-semibold tracking-tight">@{alias}</p>
                <p className="text-sm text-zinc-400">{therianType}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("identity")}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {rawIdentity.trim() || t("noIdentity")}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("tags")}</p>
            {tags.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">{t("noTags")}</p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("bio")}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {rawBio.trim() || t("noBio")}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("language")}</p>
            <form action={setLocaleAction} className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="submit"
                name="locale"
                value="en"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  locale === "en" || (!locale && defaultLocale === "en")
                    ? "bg-zinc-100 text-zinc-950"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-200"
                }`}
              >
                {t("english")}
              </button>
              <button
                type="submit"
                name="locale"
                value="es"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  locale === "es"
                    ? "bg-zinc-100 text-zinc-950"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-200"
                }`}
              >
                {t("spanish")}
              </button>
            </form>
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            {t("safeMode")}: {profile?.safe_mode ? t("on") : t("off")}
          </p>
        </div>
      </section>
    </main>
  );
}
