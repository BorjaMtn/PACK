import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfileAction } from "../actions";
import Image from "next/image";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditProfilePage({ searchParams }: Props) {
  const t = await getTranslations("Profile");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const withIdentityQuery = await supabase
    .from("profiles")
    .select("alias, therian_type, tags, bio, animal_identity, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let profile = withIdentityQuery.data;
  if (
    withIdentityQuery.error?.message?.includes("animal_identity") ||
    withIdentityQuery.error?.message?.includes("avatar_url")
  ) {
    const fallbackQuery = await supabase
      .from("profiles")
      .select("alias, therian_type, tags, bio")
      .eq("id", user.id)
      .maybeSingle();
    profile = fallbackQuery.data
      ? { ...fallbackQuery.data, animal_identity: null, avatar_url: null }
      : null;
  }

  const tagsValue = ((profile?.tags ?? []) as string[]).join(", ");

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <header className="mb-4">
        <Link href="/profile" className="text-xs text-zinc-400">
          {t("backToProfile")}
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("editTitle")}</h1>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <form
        action={updateProfileAction}
        className="space-y-3 rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
      >
        <input
          name="alias"
          defaultValue={profile?.alias ?? ""}
          placeholder={t("aliasPlaceholder")}
          required
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <input
          name="therian_type"
          defaultValue={profile?.therian_type ?? ""}
          placeholder={t("therianTypePlaceholder")}
          required
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <input
          name="tags"
          defaultValue={tagsValue}
          placeholder={t("tagsPlaceholder")}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ""}
          placeholder={t("bioPlaceholder")}
          rows={4}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <input
          name="animal_identity"
          defaultValue={profile?.animal_identity ?? ""}
          placeholder={t("animalIdentityPlaceholder")}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{t("avatar")}</p>
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt="Avatar"
              width={64}
              height={64}
              unoptimized
              className="mb-3 h-16 w-16 rounded-full border border-zinc-700 object-cover"
            />
          ) : null}
          <input
            name="avatar"
            type="file"
            accept="image/*"
            className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-xl file:border file:border-zinc-700 file:bg-zinc-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-200"
          />
        </div>
        <button className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.15)] transition active:scale-[0.98]">
          {t("save")}
        </button>
      </form>
    </main>
  );
}
