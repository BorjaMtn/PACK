"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: { id: string; alias: string | null; avatar_url: string | null } | null;
};

type Props = {
  chatId: string;
  packType: string;
  currentUserId: string;
  currentUserAlias: string | null;
  currentUserAvatarUrl: string | null;
  initialMessages: Message[];
};

export function PackChatRoom({
  chatId,
  packType,
  currentUserId,
  currentUserAlias,
  currentUserAvatarUrl,
  initialMessages,
}: Props) {
  const t = useTranslations("Pack");
  const supabase = createSupabaseBrowserClient();

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeChatId, setActiveChatId] = useState(chatId);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; alias: string }[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, { alias: string; avatar_url: string | null }>>(
    () => {
      const map: Record<string, { alias: string; avatar_url: string | null }> = {};
      for (const message of initialMessages) {
        if (message.profiles && message.sender_id) {
          map[message.sender_id] = {
            alias: message.profiles.alias?.trim() || "Anon",
            avatar_url: message.profiles.avatar_url ?? null,
          };
        }
      }
      if (currentUserId) {
        map[currentUserId] = {
          alias: currentUserAlias?.trim() || "Anon",
          avatar_url: currentUserAvatarUrl ?? null,
        };
      }
      return map;
    },
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profilesRef = useRef<Record<string, { alias: string; avatar_url: string | null }>>(profilesByUserId);

  useEffect(() => {
    profilesRef.current = profilesByUserId;
  }, [profilesByUserId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: mounted ? "smooth" : "auto",
    });
  }, [messages.length, mounted]);

  useEffect(() => {
    async function ensureChat() {
      if (activeChatId) return;

      const existing = await supabase.from("chats").select("id").eq("therian_type", packType).maybeSingle();
      if (existing.data?.id) {
        setActiveChatId(existing.data.id);
        return;
      }

      const inserted = await supabase
        .from("chats")
        .insert({ therian_type: packType })
        .select("id")
        .maybeSingle();

      if (inserted.data?.id) {
        setActiveChatId(inserted.data.id);
      }
    }

    void ensureChat();
  }, [activeChatId, packType, supabase]);

  useEffect(() => {
    if (!activeChatId) return;

    const channel = supabase
      .channel(`pack-room:${activeChatId}`, {
        config: { presence: { key: currentUserId } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${activeChatId}`,
        },
        (payload) => {
          const incoming = payload.new as Omit<Message, "profiles">;
          const next: Message = { ...incoming, profiles: null };

          setMessages((prev) => {
            if (prev.some((message) => message.id === next.id)) return prev;
            return [...prev, next];
          });

          void supabase
            .from("profiles")
            .select("id, alias, avatar_url")
            .eq("id", incoming.sender_id)
            .maybeSingle()
            .then(({ data }) => {
              if (!data) return;
              setProfilesByUserId((prev) => ({
                ...prev,
                [incoming.sender_id]: {
                  alias: data.alias?.trim() || "Anon",
                  avatar_url: data.avatar_url ?? null,
                },
              }));
            });
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ typing?: boolean; alias?: string; user_id?: string }>();
        const seen = new Set<string>();
        const nextTypingUsers: { userId: string; alias: string }[] = [];

        for (const [presenceKey, items] of Object.entries(state)) {
          for (const item of items) {
            const userId = item.user_id || presenceKey;
            if (!item.typing || userId === currentUserId || seen.has(userId)) continue;
            seen.add(userId);
            nextTypingUsers.push({
              userId,
              alias: item.alias?.trim() || profilesRef.current[userId]?.alias || "Anon",
            });
          }
        }

        setTypingUsers(nextTypingUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            typing: false,
            alias: currentUserAlias?.trim() || "Anon",
            user_id: currentUserId,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeChatId, currentUserAlias, currentUserId, supabase]);

  function trackTyping(typing: boolean) {
    if (!channelRef.current) return;
    void channelRef.current.track({
      typing,
      alias: currentUserAlias?.trim() || "Anon",
      user_id: currentUserId,
    });
  }

  function handleTextChange(value: string) {
    setText(value);

    if (!value.trim()) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      trackTyping(false);
      return;
    }

    trackTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      trackTyping(false);
    }, 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    if (!activeChatId) {
      setError(t("chatUnavailable"));
      return;
    }

    setSending(true);
    setError("");

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: activeChatId,
      sender_id: currentUserId,
      content,
    });

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    trackTyping(false);
    setText("");
    setSending(false);
  }

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages],
  );

  const viewMessages = useMemo(
    () =>
      sortedMessages.map((message, index) => {
        const senderProfile = profilesByUserId[message.sender_id];
        const alias = message.profiles?.alias?.trim() ?? senderProfile?.alias ?? "Anon";
        const avatarUrl = message.profiles?.avatar_url ?? senderProfile?.avatar_url ?? null;
        const previous = sortedMessages[index - 1];
        const startsGroup = !previous || previous.sender_id !== message.sender_id;
        const isMine = message.sender_id === currentUserId;
        return {
          ...message,
          user_id: message.sender_id,
          alias,
          avatarUrl,
          startsGroup,
          compact: Boolean(previous && previous.sender_id === message.sender_id),
          isMine,
        };
      }),
    [sortedMessages, profilesByUserId, currentUserId],
  );

  function formatTime(value: string) {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function initialLetter(alias: string) {
    return alias.trim().charAt(0).toUpperCase() || "A";
  }

  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.3)]">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("packChat")}</p>
      <div
        ref={scrollRef}
        className="mt-3 flex-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 pb-6"
      >
        {viewMessages.length ? (
          viewMessages.map((message) => (
            <div
              key={message.id}
              className={`message-fade-in flex ${message.isMine ? "justify-end" : "justify-start"} ${
                message.compact ? "mt-1" : "mt-2"
              }`}
            >
              <div className={`flex max-w-[88%] flex-col ${message.isMine ? "items-end" : "items-start"}`}>
                {!message.isMine && message.startsGroup ? (
                  <p className="mb-1 text-[11px] font-medium text-zinc-400/90">@{message.alias}</p>
                ) : null}
                <div className={`flex items-end gap-2 ${message.isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!message.isMine && message.startsGroup ? (
                    <div className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-[10px] font-semibold text-zinc-300">
                      {message.avatarUrl ? (
                        <Image
                          src={message.avatarUrl}
                          alt="Avatar"
                          width={32}
                          height={32}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initialLetter(message.alias)
                      )}
                    </div>
                  ) : (
                    <div className={message.isMine ? "w-0" : "w-8"} />
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2.5 text-sm shadow-[0_6px_16px_rgba(0,0,0,0.25)] ${
                      message.isMine ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500/75" suppressHydrationWarning>
                  {mounted ? formatTime(message.created_at) : ""}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="grid h-full place-items-center text-center">
            <p className="text-sm text-zinc-400">{t("packChatEmpty")}</p>
          </div>
        )}
      </div>

      {typingUsers.length ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
          <span>
            {typingUsers.length === 1
              ? t("typingSingle", { name: typingUsers[0].alias })
              : t("typingMultiple", { count: typingUsers.length })}
          </span>
          <span className="typing-dots">
            <span />
            <span />
            <span />
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 mt-3 border-t border-zinc-800/80 bg-zinc-900/95 pt-3 shadow-[0_-10px_24px_rgba(0,0,0,0.35)]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder={t("packChatPlaceholder")}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-60"
          >
            {t("send")}
          </button>
        </form>
      </div>
    </section>
  );
}
