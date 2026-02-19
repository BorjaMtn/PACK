import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";
import { createPostAction } from "./actions";
import { blockUserAction, reportAction } from "@/app/(protected)/safety/actions";
import { reactToPostAction } from "@/app/(protected)/reactions/actions";
import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FeedLiveUpdates } from "./feed-live-updates";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  therian_type: string;
  created_at: string;
  profiles:
    | {
        id: string;
        alias: string | null;
        avatar_url: string | null;
        therian_type: string | null;
      }[]
    | null;
};

type ReactionRow = {
  post_id: string;
  user_id: string;
  type: string;
};

const REACTION_TYPES = ["🐾", "🔥", "🌙", "🖤"] as const;

function normalizeTherianType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default async function FeedPage({ searchParams }: Props) {
  const t = await getTranslations("Feed");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const scope = params.scope === "all" ? "all" : "mine";
  const createdPostId = typeof params.created === "string" ? params.created : "";
  const error = typeof params.error === "string" ? params.error : "";
  const blocked = params.blocked === "1";
  const reported = params.reported === "1";

  const { data: profile } = await supabase
    .from("profiles")
    .select("therian_type, safe_mode")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: blocksData } = await supabase
    .from("blocks")
    .select("from_user, to_user")
    .or(`from_user.eq.${user?.id},to_user.eq.${user?.id}`);

  const blockedUserIds = new Set(
    (blocksData ?? []).map((block) => (block.from_user === user?.id ? block.to_user : block.from_user)),
  );

  const postsQuery = supabase
    .from("posts")
    .select(`
      id,
      user_id,
      content,
      media_url,
      media_type,
      therian_type,
      created_at,
      profiles (
        id,
        alias,
        avatar_url,
        therian_type
      )
    `)
    .order("created_at", { ascending: false })
    .limit(80);

  const normalizedMyType = normalizeTherianType(profile?.therian_type ?? "");
  const { data: postsData } = await postsQuery;
  const allPosts = (postsData ?? []) as PostRow[];
  const authorIds = Array.from(new Set(allPosts.map((post) => post.user_id).filter(Boolean)));
  const { data: profilesData } = authorIds.length
    ? await supabase.from("profiles").select("id, alias, avatar_url, therian_type").in("id", authorIds)
    : { data: [] };
  const profileByUserId = new Map(
    (profilesData ?? []).map((row) => [
      row.id,
      {
        alias: row.alias,
        avatar_url: row.avatar_url,
        therian_type: row.therian_type,
      },
    ]),
  );
  const visiblePosts = allPosts.filter((post) => !blockedUserIds.has(post.user_id));
  const posts =
    scope === "mine" && normalizedMyType
      ? visiblePosts.filter(
          (post) => normalizeTherianType(post.therian_type ?? "") === normalizedMyType,
        )
      : visiblePosts;
  const postIds = posts.map((post) => post.id);
  const { data: reactionsData } = postIds.length
    ? await supabase.from("reactions").select("post_id, user_id, type").in("post_id", postIds)
    : { data: [] };
  const reactions = (reactionsData ?? []) as ReactionRow[];

  const reactionCountMap = new Map<string, number>();
  const myReactionByPost = new Map<string, string>();
  for (const reaction of reactions) {
    const key = `${reaction.post_id}:${reaction.type}`;
    reactionCountMap.set(key, (reactionCountMap.get(key) ?? 0) + 1);
    if (reaction.user_id === user?.id) {
      myReactionByPost.set(reaction.post_id, reaction.type);
    }
  }

  const createdIsVisible = createdPostId ? posts.some((post) => post.id === createdPostId) : false;
  const myType = profile?.therian_type ?? t("therianFallback");
  const accent =
    myType.toLowerCase().includes("wolf") || myType.toLowerCase().includes("dog")
      ? "from-amber-300/30 to-orange-400/10"
      : myType.toLowerCase().includes("cat") || myType.toLowerCase().includes("feline")
        ? "from-pink-300/30 to-rose-400/10"
        : myType.toLowerCase().includes("fox")
          ? "from-orange-300/30 to-red-400/10"
          : myType.toLowerCase().includes("bird")
            ? "from-sky-300/30 to-cyan-400/10"
            : "from-violet-300/30 to-indigo-400/10";

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <FeedLiveUpdates />
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("headerEyebrow")}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-xs text-zinc-400">{user?.email}</p>
        </div>
        <form action={signOutAction}>
          <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium transition active:scale-[0.98]">
            {t("signOut")}
          </button>
        </form>
      </header>

      <div className={`mb-5 rounded-3xl border border-zinc-800/80 bg-gradient-to-br ${accent} p-[1px]`}>
        <div className="grid grid-cols-2 gap-2 rounded-[22px] bg-zinc-950/95 p-2">
          <Link
            href="/feed?scope=mine"
            className={`rounded-2xl px-3 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] ${
              scope === "mine" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {t("filterMine")}
          </Link>
          <Link
            href="/feed?scope=all"
            className={`rounded-2xl px-3 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] ${
              scope === "all" ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-900"
            }`}
          >
            {t("filterAll")}
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {blocked ? (
        <p className="mb-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("blocked")}
        </p>
      ) : null}
      {reported ? (
        <p className="mb-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("reported")}
        </p>
      ) : null}
      {scope === "mine" && createdPostId && !createdIsVisible ? (
        <p className="mb-4 rounded-xl border border-amber-800 bg-amber-900/20 px-3 py-2.5 text-sm text-amber-200">
          Tu post se ha guardado, pero no coincide con el filtro actual de especie.
        </p>
      ) : null}

      <section className="mb-6 rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_14px_30px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 bg-zinc-950 text-lg">
            🐾
          </div>
          <div>
            <p className="text-sm font-semibold">{t("composerTitle")}</p>
            <p className="text-xs text-zinc-400">{t("composerSubtitle")}</p>
          </div>
        </div>
        <form action={createPostAction} className="space-y-3">
          <input type="hidden" name="scope" value={scope} />
          <textarea
            name="content"
            placeholder={t("composerPlaceholder")}
            rows={4}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            name="media"
            type="file"
            accept="image/*,video/*"
            className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-xl file:border file:border-zinc-700 file:bg-zinc-950 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-200"
          />
          <button className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.15)] transition active:scale-[0.98]">
            {t("composerButton")}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {posts?.length ? (
          posts.map((post) => {
            const authorProfile = Array.isArray(post.profiles) ? post.profiles[0] : null;
            const fallbackProfile = profileByUserId.get(post.user_id);
            const profileAlias = authorProfile?.alias?.trim() || fallbackProfile?.alias?.trim();
            const displayAlias = profileAlias || `@${post.user_id?.slice(0, 5) || "user"}`;
            const displayTherianType =
              authorProfile?.therian_type || fallbackProfile?.therian_type || post.therian_type;
            const avatarUrl = authorProfile?.avatar_url || fallbackProfile?.avatar_url;
            return (
            <article
              key={post.id}
              className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition active:scale-[0.995]"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-zinc-700 bg-zinc-950 text-sm">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={36}
                      height={36}
                      unoptimized
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    "🐺"
                  )}
                </div>
                <p className="text-sm font-medium text-zinc-200">
                  {displayAlias.startsWith("@") ? displayAlias : `@${displayAlias}`}{" "}
                  <span className="text-xs font-normal text-zinc-500">· {displayTherianType}</span>
                </p>
              </div>
              {post.content ? (
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-100">{post.content}</p>
              ) : null}
              {post.media_url && post.media_type === "image" ? (
                <Image
                  src={post.media_url}
                  alt="Post media"
                  width={1200}
                  height={900}
                  unoptimized
                  className="mt-3 max-h-80 w-full rounded-2xl border border-zinc-800 object-cover"
                />
              ) : null}
              {post.media_url && post.media_type === "video" ? (
                profile?.safe_mode ? (
                  <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-400">
                    {t("videoHidden")}
                  </div>
                ) : (
                  <video
                    src={post.media_url}
                    controls
                    className="mt-3 max-h-80 w-full rounded-2xl border border-zinc-800"
                  />
                )
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {REACTION_TYPES.map((emoji) => {
                  const selected = myReactionByPost.get(post.id) === emoji;
                  const count = reactionCountMap.get(`${post.id}:${emoji}`) ?? 0;
                  return (
                    <form key={`${post.id}-${emoji}`} action={reactToPostAction}>
                      <input type="hidden" name="post_id" value={post.id} />
                      <input type="hidden" name="type" value={emoji} />
                      <input type="hidden" name="redirect_to" value={`/feed?scope=${scope}`} />
                      <button
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 ${
                          selected
                            ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                            : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                        }`}
                        aria-label={`React ${emoji}`}
                      >
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </button>
                    </form>
                  );
                })}
              </div>
              {post.user_id !== user?.id ? (
                <div className="mt-4 flex gap-2">
                  <form action={reportAction}>
                    <input type="hidden" name="target_type" value="post" />
                    <input type="hidden" name="target_id" value={post.id} />
                    <input type="hidden" name="reason" value="Reported from feed post" />
                    <input type="hidden" name="redirect_to" value="/feed" />
                    <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
                      {t("report")}
                    </button>
                  </form>
                  <form action={blockUserAction}>
                    <input type="hidden" name="to_user_id" value={post.user_id} />
                    <input type="hidden" name="redirect_to" value="/feed" />
                    <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
                      {t("blockUser")}
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-6 text-center text-sm text-zinc-300">
            <p className="text-2xl">🌙</p>
            <p className="mt-2">{t("empty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
