"use client";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-red-900/70 bg-zinc-900/90 p-6 text-zinc-100">
        <h1 className="text-xl font-semibold">Something went wrong in your pack</h1>
        <p className="mt-2 text-sm text-zinc-300">{error.message || "Unexpected error"}</p>
        <button
          onClick={reset}
          className="mt-4 w-full rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950"
        >
          Reload
        </button>
      </section>
    </main>
  );
}
