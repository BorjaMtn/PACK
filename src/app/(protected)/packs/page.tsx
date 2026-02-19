import { createSupabaseServerClient } from "@/lib/supabase/server";
import { swipeAction } from "./actions";
import { blockUserAction, reportAction } from "@/app/(protected)/safety/actions";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Candidate = {
  id: string;
  alias: string | null;
  therian_type: string | null;
  tags: string[];
  bio: string | null;
  animal_identity?: string | null;
};

export default async function PacksPage({ searchParams }: Props) {
  const t = await getTranslations("Packs");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const matched = params.matched === "1";
  const blocked = params.blocked === "1";
  const reported = params.reported === "1";

  const { data: swipes } = await supabase.from("swipes").select("to_user").eq("from_user", user?.id ?? "");
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("therian_type, tags")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const { data: blocksData } = await supabase
    .from("blocks")
    .select("from_user, to_user")
    .or(`from_user.eq.${user?.id},to_user.eq.${user?.id}`);

  const excludedIds = new Set<string>([
    user?.id ?? "",
    ...(swipes ?? []).map((s) => s.to_user),
    ...(blocksData ?? []).map((block) => (block.from_user === user?.id ? block.to_user : block.from_user)),
  ]);

  const withIdentityProfilesQuery = await supabase
    .from("profiles")
    .select("id, alias, therian_type, tags, bio, animal_identity")
    .not("id", "eq", user?.id ?? "");

  let profiles = withIdentityProfilesQuery.data;
  if (withIdentityProfilesQuery.error?.message?.includes("animal_identity")) {
    const fallbackProfilesQuery = await supabase
      .from("profiles")
      .select("id, alias, therian_type, tags, bio")
      .not("id", "eq", user?.id ?? "");
    profiles = (fallbackProfilesQuery.data ?? []).map((profile) => ({
      ...profile,
      animal_identity: null,
    }));
  }

  const candidate = (profiles ?? []).find(
    (profile) =>
      !excludedIds.has(profile.id) && Boolean(profile.alias) && Boolean(profile.therian_type),
  ) as Candidate | undefined;
  const type = candidate?.therian_type?.toLowerCase() ?? "";
  const accent =
    type.includes("wolf") || type.includes("dog")
      ? "from-amber-300/30 to-orange-400/10"
      : type.includes("cat") || type.includes("feline")
        ? "from-pink-300/30 to-rose-400/10"
        : type.includes("fox")
          ? "from-orange-300/30 to-red-400/10"
          : type.includes("bird")
            ? "from-sky-300/30 to-cyan-400/10"
            : "from-violet-300/30 to-indigo-400/10";

  return (
    <main className="fade-up flex min-h-[calc(100dvh-6.5rem)] flex-col px-4 pb-8 pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>

      {matched ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("matched")}
        </p>
      ) : null}
      {blocked ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("blocked")}
        </p>
      ) : null}
      {reported ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("reported")}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {candidate ? (
        <section
          className={`mt-4 flex flex-1 flex-col justify-center rounded-3xl border border-zinc-800/90 bg-gradient-to-br ${accent} p-[1px]`}
        >
          <div className="rounded-[22px] bg-zinc-950/95 p-5 shadow-[0_16px_36px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-lg">
                🐾
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">@{candidate.alias}</p>
                <p className="text-sm text-zinc-400">{candidate.therian_type}</p>
              </div>
            </div>

            {candidate.tags.length ? (
              <p className="mt-1 text-xs text-zinc-400">{candidate.tags.join(" · ")}</p>
            ) : null}

            {candidate ? (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                {(() => {
                  const myType = (myProfile?.therian_type ?? "").toLowerCase();
                  const candidateType = (candidate.therian_type ?? "").toLowerCase();
                  const sameType = Boolean(myType && candidateType && myType === candidateType);
                  const myTags = ((myProfile?.tags ?? []) as string[]).map((tag) => tag.toLowerCase());
                  const sharedTags = candidate.tags.filter((tag) => myTags.includes(tag.toLowerCase()));
                  const compatibility = Math.min(
                    100,
                    35 + (sameType ? 35 : 0) + Math.min(30, sharedTags.length * 10),
                  );

                  return (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {t("compatibility")}
                        </p>
                        <p className="text-lg font-semibold text-zinc-100">{compatibility}%</p>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-zinc-100 transition-all"
                          style={{ width: `${compatibility}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {t("sharedAttributes")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {sameType ? (
                          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200">
                            {t("sameTherianType")}
                          </span>
                        ) : null}
                        {sharedTags.length
                          ? sharedTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200"
                              >
                                #{tag}
                              </span>
                            ))
                          : null}
                        {!sameType && sharedTags.length === 0 ? (
                          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-500">
                            {t("noShared")}
                          </span>
                        ) : null}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : null}

            {candidate.bio ? (
              <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-[15px] leading-relaxed text-zinc-100">
                {candidate.bio}
              </p>
            ) : (
              <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-400">
                {t("noBio")}
              </p>
            )}

            {candidate.animal_identity?.trim() ? (
              <p className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3 text-sm italic text-zinc-300">
                “{candidate.animal_identity.trim()}”
              </p>
            ) : null}

            <form action={swipeAction} className="mt-5 grid grid-cols-2 gap-3">
              <input type="hidden" name="to_user_id" value={candidate.id} />
              <button
                type="submit"
                name="action"
                value="dislike"
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-4 text-base font-semibold transition active:scale-[0.98]"
              >
                {t("noButton")}
              </button>
              <button
                type="submit"
                name="action"
                value="like"
                className="rounded-2xl bg-zinc-100 px-3 py-4 text-base font-semibold text-zinc-950 shadow-[0_10px_26px_rgba(255,255,255,0.14)] transition active:scale-[0.98]"
              >
                {t("yesButton")}
              </button>
            </form>
            <div className="mt-3 flex gap-2">
              <form action={reportAction}>
                <input type="hidden" name="target_type" value="user" />
                <input type="hidden" name="target_id" value={candidate.id} />
                <input type="hidden" name="reason" value="Reported from packs profile" />
                <input type="hidden" name="redirect_to" value="/packs" />
                <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
                  {t("report")}
                </button>
              </form>
              <form action={blockUserAction}>
                <input type="hidden" name="to_user_id" value={candidate.id} />
                <input type="hidden" name="redirect_to" value="/packs" />
                <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
                  {t("blockUser")}
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <div className="mt-6 rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-6 text-center text-sm text-zinc-300">
          <p className="text-2xl">🧭</p>
          <p className="mt-2">{t("empty")}</p>
        </div>
      )}
    </main>
  );
}
