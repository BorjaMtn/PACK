import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { PackChatRoom } from "./pack-chat-room";

function normalizeTherianType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function packTheme(therianType: string) {
  const type = therianType.toLowerCase();

  if (type.includes("wolf") || type.includes("dog")) {
    return { name: "Wolf Pack", emoji: "🐺", accent: "from-amber-300/30 to-orange-400/10" };
  }
  if (type.includes("cat") || type.includes("feline")) {
    return { name: "Feline Pack", emoji: "🐈", accent: "from-pink-300/30 to-rose-400/10" };
  }
  if (type.includes("fox")) {
    return { name: "Fox Pack", emoji: "🦊", accent: "from-orange-300/30 to-red-400/10" };
  }
  if (type.includes("bird")) {
    return { name: "Sky Pack", emoji: "🦅", accent: "from-sky-300/30 to-cyan-400/10" };
  }

  return { name: "Pack", emoji: "🏕️", accent: "from-violet-300/30 to-indigo-400/10" };
}

export default async function PackPage() {
  const t = await getTranslations("Pack");
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("therian_type, alias, avatar_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const therianType = profile?.therian_type?.trim();
  const normalizedTherianType = normalizeTherianType(therianType ?? "");
  if (!normalizedTherianType) {
    return (
      <main className="fade-up px-4 pb-8 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-sm text-zinc-300">
          {t("missingType")}
        </p>
      </main>
    );
  }

  const theme = packTheme(normalizedTherianType);

  let packChatId: string | null = null;

  const existingChat = await supabase
    .from("chats")
    .select("id")
    .eq("therian_type", normalizedTherianType)
    .maybeSingle();
  if (existingChat.data?.id) {
    packChatId = existingChat.data.id;
  }

  if (!packChatId) {
    const insertChat = await supabase
      .from("chats")
      .insert({ therian_type: normalizedTherianType })
      .select("id")
      .maybeSingle();
    if (insertChat.data?.id) {
      packChatId = insertChat.data.id;
    }
  }

  if (!packChatId) {
    const retryChat = await supabase
      .from("chats")
      .select("id")
      .eq("therian_type", normalizedTherianType)
      .maybeSingle();
    if (retryChat.data?.id) {
      packChatId = retryChat.data.id;
    }
  }

  const resolvedPackChatId = packChatId ?? "";

  let initialMessages: {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    profiles: { id: string; alias: string | null; avatar_url: string | null } | null;
  }[] = [];
  if (resolvedPackChatId) {
    const { data: messagesData } = await supabase
      .from("messages")
      .select(`
        id,
        chat_id,
        sender_id,
        content,
        created_at,
        profiles:profiles!messages_sender_id_profiles_fkey (
          id,
          alias,
          avatar_url
        )
      `)
      .eq("chat_id", resolvedPackChatId)
      .order("created_at", { ascending: true })
      .limit(100);

    initialMessages = (messagesData ?? []).map((message) => ({
      id: message.id,
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
      created_at: message.created_at,
      profiles: Array.isArray(message.profiles) ? (message.profiles[0] ?? null) : message.profiles,
    }));
  }

  return (
    <main className="fade-up flex h-full min-h-0 flex-col overflow-hidden px-4 pb-6 pt-6">
      <header className={`rounded-3xl border border-zinc-800/90 bg-gradient-to-br ${theme.accent} p-[1px]`}>
        <div className="rounded-[22px] bg-zinc-950/95 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("title")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {theme.name} {theme.emoji}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{t("subtitle", { type: normalizedTherianType })}</p>
        </div>
      </header>

      <PackChatRoom
        chatId={resolvedPackChatId}
        packType={normalizedTherianType}
        currentUserId={user?.id ?? ""}
        currentUserAlias={profile?.alias ?? null}
        currentUserAvatarUrl={profile?.avatar_url ?? null}
        initialMessages={initialMessages}
      />
    </main>
  );
}
