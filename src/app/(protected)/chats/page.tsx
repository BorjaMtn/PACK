import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

type MatchRow = {
  id: string;
  user_a: string;
  user_b: string;
};

type ChatRow = {
  id: string;
  match_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  alias: string | null;
  therian_type: string | null;
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChatsPage({ searchParams }: Props) {
  const t = await getTranslations("Chats");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;
  const blocked = params.blocked === "1";
  const reported = params.reported === "1";
  const error = typeof params.error === "string" ? params.error : "";

  const { data: blocksData } = await supabase
    .from("blocks")
    .select("from_user, to_user")
    .or(`from_user.eq.${user?.id},to_user.eq.${user?.id}`);

  const blockedUserIds = new Set(
    (blocksData ?? []).map((block) => (block.from_user === user?.id ? block.to_user : block.from_user)),
  );

  const { data: matchesData } = await supabase
    .from("matches")
    .select("id, user_a, user_b")
    .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`);

  const matches = (matchesData ?? []) as MatchRow[];
  const matchIds = matches.map((match) => match.id);

  let chats: ChatRow[] = [];
  if (matchIds.length) {
    const { data: chatsData } = await supabase
      .from("chats")
      .select("id, match_id, created_at")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false });
    chats = (chatsData ?? []) as ChatRow[];
  }

  const otherUserIds = matches
    .map((match) => (match.user_a === user?.id ? match.user_b : match.user_a))
    .filter((id) => !blockedUserIds.has(id))
    .filter(Boolean);

  let profilesById = new Map<string, ProfileRow>();
  if (otherUserIds.length) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, alias, therian_type")
      .in("id", otherUserIds);
    const profiles = (profilesData ?? []) as ProfileRow[];
    profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  }

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {reported ? (
        <p className="mt-3 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("reported")}
        </p>
      ) : null}
      {blocked ? (
        <p className="mt-3 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("blocked")}
        </p>
      ) : null}

      <section className="mt-5 space-y-3">
        {chats.length ? (
          chats.map((chat) => {
            const match = matches.find((item) => item.id === chat.match_id);
            if (!match) {
              return null;
            }

            const otherUserId = match.user_a === user?.id ? match.user_b : match.user_a;
            if (blockedUserIds.has(otherUserId)) {
              return null;
            }
            const other = profilesById.get(otherUserId);
            const alias = other?.alias?.trim() || otherUserId.slice(0, 5) || t("unknown");
            const therian = other?.therian_type?.trim() || t("therianFallback");

            return (
              <Link
                key={chat.id}
                href={`/chats/${chat.id}`}
                className="block rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full border border-zinc-700 bg-zinc-950 text-sm">
                    💬
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">@{alias}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{therian}</p>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-6 text-center text-sm text-zinc-300">
            <p className="text-2xl">📭</p>
            <p className="mt-2">{t("empty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
