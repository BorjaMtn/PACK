import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { createMeetupAction, joinMeetupAction } from "./actions";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type MeetupRow = {
  id: string;
  title: string;
  description: string;
  city: string;
  date: string;
  therian_type: string;
  created_by: string;
  created_at: string;
};

type MeetupParticipantRow = {
  meetup_id: string;
  user_id: string;
};

function normalizeTherianType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function packAccent(therianType: string) {
  const type = therianType.toLowerCase();
  if (type.includes("wolf") || type.includes("dog")) return "from-amber-300/30 to-orange-400/10";
  if (type.includes("cat") || type.includes("feline")) return "from-pink-300/30 to-rose-400/10";
  if (type.includes("fox")) return "from-orange-300/30 to-red-400/10";
  if (type.includes("bird")) return "from-sky-300/30 to-cyan-400/10";
  return "from-violet-300/30 to-indigo-400/10";
}

export default async function MeetupsPage({ searchParams }: Props) {
  const t = await getTranslations("Meetups");
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("therian_type")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const created = params.created === "1";
  const joined = params.joined === "1";

  const normalizedTherianType = normalizeTherianType(profile?.therian_type ?? "");
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

  const { data: meetupsData } = await supabase
    .from("meetups")
    .select("id, title, description, city, date, therian_type, created_by, created_at")
    .eq("therian_type", normalizedTherianType)
    .order("date", { ascending: true })
    .limit(50);

  const meetups = (meetupsData ?? []) as MeetupRow[];
  const meetupIds = meetups.map((meetup) => meetup.id);
  const { data: participantsData } = meetupIds.length
    ? await supabase.from("meetup_participants").select("meetup_id, user_id").in("meetup_id", meetupIds)
    : { data: [] };

  const participants = (participantsData ?? []) as MeetupParticipantRow[];
  const participantsCountByMeetup = new Map<string, number>();
  const joinedMeetupIds = new Set<string>();
  for (const participant of participants) {
    participantsCountByMeetup.set(
      participant.meetup_id,
      (participantsCountByMeetup.get(participant.meetup_id) ?? 0) + 1,
    );
    if (participant.user_id === user?.id) {
      joinedMeetupIds.add(participant.meetup_id);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const accent = packAccent(normalizedTherianType);

  return (
    <main className="fade-up px-4 pb-8 pt-6">
      <header className={`rounded-3xl border border-zinc-800/90 bg-gradient-to-br ${accent} p-[1px]`}>
        <div className="rounded-[22px] bg-zinc-950/95 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{t("title")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">📍 {t("title")}</h1>
          <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>
        </div>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-800 bg-red-900/30 px-3 py-2.5 text-sm text-red-300">{error}</p>
      ) : null}
      {created ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("created")}
        </p>
      ) : null}
      {joined ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-900/30 px-3 py-2.5 text-sm text-emerald-300">
          {t("joined")}
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
        <form action={createMeetupAction} className="space-y-3">
          <input
            name="title"
            required
            placeholder={t("titlePlaceholder")}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <textarea
            name="description"
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            name="city"
            required
            placeholder={t("cityPlaceholder")}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400">{t("dateLabel")}</p>
              <div className="w-full rounded-xl border border-zinc-700 bg-zinc-950">
                <input
                  name="date"
                  required
                  type="date"
                  className="h-12 w-full appearance-none rounded-xl bg-transparent px-3 py-3 text-sm text-zinc-100 outline-none [color-scheme:dark] [-webkit-appearance:none]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-400">{t("timeLabel")}</p>
              <div className="w-full rounded-xl border border-zinc-700 bg-zinc-950">
                <input
                  name="time"
                  required
                  type="time"
                  className="h-12 w-full appearance-none rounded-xl bg-transparent px-3 py-3 text-sm text-zinc-100 outline-none [color-scheme:dark] [-webkit-appearance:none]"
                />
              </div>
            </div>
          </div>
          <button className="w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition active:scale-[0.98]">
            {t("createButton")}
          </button>
        </form>
      </section>

      <section className="mt-4 space-y-3">
        {meetups.length ? (
          meetups.map((meetup) => {
            const count = participantsCountByMeetup.get(meetup.id) ?? 0;
            const isJoined = joinedMeetupIds.has(meetup.id);
            return (
              <article
                key={meetup.id}
                className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
              >
                <h2 className="text-base font-semibold text-zinc-100">{meetup.title}</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {meetup.city} · {dateFormatter.format(new Date(meetup.date))}
                </p>
                {meetup.description ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{meetup.description}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-300">
                    {count} {t("going")}
                  </p>
                  <form action={joinMeetupAction}>
                    <input type="hidden" name="meetup_id" value={meetup.id} />
                    <button
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                        isJoined
                          ? "border border-zinc-600 bg-zinc-800 text-zinc-200"
                          : "bg-zinc-100 text-zinc-950"
                      }`}
                    >
                      {isJoined ? t("joinedButton") : t("joinButton")}
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-zinc-800/90 bg-zinc-900/80 p-6 text-center text-sm text-zinc-300">
            <p className="text-2xl">📍</p>
            <p className="mt-2">{t("empty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}
