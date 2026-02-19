"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTranslations } from "next-intl";

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type Props = {
  chatId: string;
  currentUserId: string;
  initialMessages: Message[];
  reportMessageAction: (formData: FormData) => void | Promise<void>;
};

export function ChatRoom({ chatId, currentUserId, initialMessages, reportMessageAction }: Props) {
  const t = useTranslations("ChatRoom");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((message) => message.id === incoming.id)) {
              return prev;
            }
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) {
      return;
    }

    setSending(true);
    setError("");

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      sender_id: currentUserId,
      content,
    });

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    setText("");
    setSending(false);
  }

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [messages],
  );

  return (
    <section className="flex h-[calc(100dvh-9rem)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_14px_30px_rgba(0,0,0,0.3)]">
        {sortedMessages.length ? (
          sortedMessages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div>
                  <p
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-[0_6px_14px_rgba(0,0,0,0.25)] ${
                      mine ? "bg-zinc-100 text-zinc-950" : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {message.content}
                  </p>
                  {!mine ? (
                    <form action={reportMessageAction} className="mt-1">
                      <input type="hidden" name="target_type" value="message" />
                      <input type="hidden" name="target_id" value={message.id} />
                      <input type="hidden" name="reason" value="Reported from chat message" />
                      <input type="hidden" name="redirect_to" value={`/chats/${chatId}`} />
                      <button className="text-[10px] text-zinc-500 underline underline-offset-2">
                        {t("report")}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="grid h-full place-items-center text-center">
            <p className="text-sm text-zinc-400">{t("empty")}</p>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-2 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("placeholder")}
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-[0_10px_24px_rgba(255,255,255,0.14)] transition active:scale-[0.98] disabled:opacity-60"
        >
          {t("send")}
        </button>
      </form>
    </section>
  );
}
