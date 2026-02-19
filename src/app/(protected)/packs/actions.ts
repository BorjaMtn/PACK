"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function swipeAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const toUserId = String(formData.get("to_user_id") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!toUserId || (action !== "like" && action !== "dislike")) {
    redirect("/packs?error=Invalid+swipe+request");
  }

  const isLike = action === "like";

  const { error: swipeError } = await supabase.from("swipes").upsert(
    {
      from_user: user.id,
      to_user: toUserId,
      is_like: isLike,
    },
    { onConflict: "from_user,to_user" },
  );

  if (swipeError) {
    redirect(`/packs?error=${encodeURIComponent(swipeError.message)}`);
  }

  if (!isLike) {
    redirect("/packs");
  }

  const { data: reverseSwipe } = await supabase
    .from("swipes")
    .select("id")
    .eq("from_user", toUserId)
    .eq("to_user", user.id)
    .eq("is_like", true)
    .maybeSingle();

  if (!reverseSwipe) {
    redirect("/packs");
  }

  const [userA, userB] = [user.id, toUserId].sort();

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .upsert(
      {
        user_a: userA,
        user_b: userB,
      },
      { onConflict: "user_a,user_b" },
    )
    .select("id")
    .single();

  if (matchError) {
    redirect(`/packs?error=${encodeURIComponent(matchError.message)}`);
  }

  const { error: chatError } = await supabase.from("chats").upsert(
    {
      match_id: match.id,
    },
    { onConflict: "match_id" },
  );

  if (chatError) {
    redirect(`/packs?error=${encodeURIComponent(chatError.message)}`);
  }

  redirect("/packs?matched=1");
}
