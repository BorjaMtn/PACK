import { signInAction, signUpAction } from "./actions";
import { getTranslations } from "next-intl/server";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthPage({ searchParams }: Props) {
  const t = await getTranslations("Auth");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const requestedMode = params.mode === "signup" ? "signup" : "signin";
  const mode = message ? "signup" : requestedMode;
  const isSignIn = mode === "signin";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold tracking-tight">Pack</h1>
        <p className="mt-2 text-sm text-zinc-400">{t("tagline")}</p>
        <h2 className="mt-7 text-lg font-medium">{isSignIn ? t("signInTitle") : t("joinTitle")}</h2>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-800 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        <form action={isSignIn ? signInAction : signUpAction} className="mt-5 space-y-3">
          <input
            required
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <input
            required
            minLength={8}
            name="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
          />
          <button className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950">
            {isSignIn ? t("signInButton") : t("joinButton")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-400">
          {isSignIn ? `${t("newHere")} ` : `${t("hasAccount")} `}
          <a
            href={isSignIn ? "/auth?mode=signup" : "/auth?mode=signin"}
            className="font-medium text-zinc-100 underline underline-offset-2"
          >
            {isSignIn ? t("switchToJoin") : t("switchToSignIn")}
          </a>
        </p>
      </section>
    </main>
  );
}
