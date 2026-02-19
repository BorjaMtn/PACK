"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function cleanRedirect(raw: string) {
  return raw.startsWith("/") ? raw : "/feed";
}

export async function blockUserAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const toUserId = String(formData.get("to_user_id") ?? "");
  const redirectTo = cleanRedirect(String(formData.get("redirect_to") ?? "/feed"));

  if (!toUserId || toUserId === user.id) {
    redirect(`${redirectTo}?error=Invalid+user+to+block`);
  }

  const { error } = await supabase.from("blocks").upsert(
    {
      from_user: user.id,
      to_user: toUserId,
    },
    { onConflict: "from_user,to_user" },
  );

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${redirectTo}?blocked=1`);
}

export async function reportAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const targetType = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const redirectTo = cleanRedirect(String(formData.get("redirect_to") ?? "/feed"));

  if (!targetId || !["post", "user", "message"].includes(targetType)) {
    redirect(`${redirectTo}?error=Invalid+report+request`);
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason || null,
  });

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${redirectTo}?reported=1`);
}
