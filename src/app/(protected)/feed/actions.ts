"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function sanitizeFilename(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
}

function normalizeTherianType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function createPostAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("therian_type")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.therian_type) {
    redirect("/onboarding");
  }

  const normalizedTherianType = normalizeTherianType(profile.therian_type);

  const content = String(formData.get("content") ?? "").trim();
  const scope = formData.get("scope") === "all" ? "all" : "mine";
  const media = formData.get("media");

  let mediaUrl: string | null = null;
  let mediaType: "image" | "video" | null = null;

  if (media instanceof File && media.size > 0) {
    if (media.type.startsWith("image/")) {
      mediaType = "image";
    } else if (media.type.startsWith("video/")) {
      mediaType = "video";
    } else {
      redirect("/feed?error=Only+image+or+video+files+are+allowed");
    }

    const path = `${user.id}/${crypto.randomUUID()}-${sanitizeFilename(media.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(path, media, { contentType: media.type, upsert: false });

    if (uploadError) {
      redirect(`/feed?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    mediaUrl = data.publicUrl;
  }

  if (!content && !mediaUrl) {
    redirect("/feed?error=Write+something+or+attach+media");
  }

  const { data: insertedPost, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      therian_type: normalizedTherianType,
    })
    .select("id, user_id, content, therian_type, created_at")
    .single();

  if (error) {
    redirect(`/feed?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/feed");
  revalidatePath("/pack");

  redirect(`/feed?scope=${scope}&created=${encodeURIComponent(insertedPost.id)}`);
}
