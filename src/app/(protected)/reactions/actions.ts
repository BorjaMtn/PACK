"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_REACTIONS = new Set(["🐾", "🔥", "🌙", "🖤"]);

function cleanRedirect(raw: string) {
  return raw.startsWith("/") ? raw : "/feed";
}

function withError(redirectTo: string, message: string) {
  const separator = redirectTo.includes("?") ? "&" : "?";
  return `${redirectTo}${separator}error=${encodeURIComponent(message)}`;
}

export async function reactToPostAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const postId = String(formData.get("post_id") ?? "");
  const reactionType = String(formData.get("type") ?? "");
  const redirectTo = cleanRedirect(String(formData.get("redirect_to") ?? "/feed"));

  if (!postId || !ALLOWED_REACTIONS.has(reactionType)) {
    redirect(withError(redirectTo, "Invalid reaction request"));
  }

  const { error } = await supabase.from("reactions").upsert(
    {
      user_id: user.id,
      post_id: postId,
      type: reactionType,
    },
    { onConflict: "user_id,post_id" },
  );

  if (error) {
    redirect(withError(redirectTo, error.message));
  }

  revalidatePath("/feed");
  revalidatePath("/pack");
  redirect(redirectTo);
}
