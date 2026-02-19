import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, alias, therian_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.alias || !profile.therian_type) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">{children}</div>
      <BottomNav />
    </div>
  );
}
