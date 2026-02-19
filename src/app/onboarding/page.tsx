import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeOnboardingAction } from "./actions";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const withIdentityQuery = await supabase
    .from("profiles")
    .select("id, alias, therian_type, tags, bio, animal_identity, safe_mode")
    .eq("id", user.id)
    .maybeSingle();

  let profile = withIdentityQuery.data;
  if (withIdentityQuery.error?.message?.includes("animal_identity")) {
    const fallbackQuery = await supabase
      .from("profiles")
      .select("id, alias, therian_type, tags, bio, safe_mode")
      .eq("id", user.id)
      .maybeSingle();
    profile = fallbackQuery.data ? { ...fallbackQuery.data, animal_identity: null } : null;
  }

  if (profile?.alias && profile.therian_type) {
    redirect("/feed");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-xl">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="mt-1 text-sm text-zinc-400">Complete your profile.</p>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <form action={completeOnboardingAction} className="mt-5 space-y-3">
          <input
            required
            name="alias"
            placeholder="Alias"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            required
            name="therian_type"
            placeholder="Therian type (e.g. wolf)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            name="tags"
            placeholder="Tags (comma separated)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <textarea
            name="bio"
            placeholder="Bio (optional)"
            rows={4}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            name="animal_identity"
            placeholder="Animal identity in one line (optional)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              name="safe_mode"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
            />
            Enable safe mode
          </label>
          <button className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950">
            Save profile
          </button>
        </form>
      </section>
    </main>
  );
}
