import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatRoom } from "./chat-room";
import { blockUserAction, reportAction } from "@/app/(protected)/safety/actions";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default async function ChatPage({ params, searchParams }: Props) {
  const t = await getTranslations("ChatRoom");
  const { chatId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const error = typeof query.error === "string" ? query.error : "";
  const blocked = query.blocked === "1";
  const reported = query.reported === "1";

  const { data: chat } = await supabase
    .from("chats")
    .select("id, match_id")
    .eq("id", chatId)
    .maybeSingle();

  if (!chat || !user) {
    notFound();
  }

  const { data: match } = await supabase
    .from("matches")
    .select("id, user_a, user_b")
    .eq("id", chat.match_id)
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .maybeSingle();

  if (!match) {
    notFound();
  }

  const otherUserId = match.user_a === user.id ? match.user_b : match.user_a;

  const { data: block } = await supabase
    .from("blocks")
    .select("id")
    .or(
      `and(from_user.eq.${user.id},to_user.eq.${otherUserId}),and(from_user.eq.${otherUserId},to_user.eq.${user.id})`,
    )
    .maybeSingle();

  if (block) {
    redirect("/chats");
  }

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("alias")
    .eq("id", otherUserId)
    .maybeSingle();
  const chatAlias = otherProfile?.alias?.trim() || otherUserId.slice(0, 5) || t("unknown");

  const { data: messagesData } = await supabase
    .from("messages")
    .select("id, chat_id, sender_id, content, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(100);

  const initialMessages = (messagesData ?? []) as Message[];

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <header className="mb-4 rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
        <Link href="/chats" className="text-xs text-zinc-400">
          {t("back")}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          @{chatAlias}
        </h1>
        <div className="mt-3 flex gap-2">
          <form action={reportAction}>
            <input type="hidden" name="target_type" value="user" />
            <input type="hidden" name="target_id" value={otherUserId} />
            <input type="hidden" name="reason" value="Reported from chat header" />
            <input type="hidden" name="redirect_to" value={`/chats/${chatId}`} />
            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
              {t("reportUser")}
            </button>
          </form>
          <form action={blockUserAction}>
            <input type="hidden" name="to_user_id" value={otherUserId} />
            <input type="hidden" name="redirect_to" value="/chats" />
            <button className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium transition active:scale-[0.98]">
              {t("blockUser")}
            </button>
          </form>
        </div>
      </header>
      {error ? (
        <p className="mb-3 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {reported ? (
        <p className="mb-3 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("reported")}
        </p>
      ) : null}
      {blocked ? (
        <p className="mb-3 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("blocked")}
        </p>
      ) : null}
      <ChatRoom
        chatId={chatId}
        currentUserId={user.id}
        initialMessages={initialMessages}
        reportMessageAction={reportAction}
      />
    </main>
  );
}
