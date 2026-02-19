export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <section className="animate-pulse rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
        <div className="h-8 w-24 rounded bg-zinc-800/80" />
        <div className="mt-3 h-4 w-40 rounded bg-zinc-800/80" />
        <div className="mt-7 h-5 w-28 rounded bg-zinc-800/80" />
        <div className="mt-5 space-y-3">
          <div className="h-10 rounded-xl bg-zinc-800/80" />
          <div className="h-10 rounded-xl bg-zinc-800/80" />
          <div className="h-10 rounded-xl bg-zinc-800/80" />
        </div>
      </section>
    </main>
  );
}
