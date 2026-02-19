import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LandingClient } from "./landing-client";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  let user = null;
  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    user = currentUser;
  } catch {
    user = null;
  }

  if (user) {
    redirect("/feed");
  }

  return <LandingClient />;
}
