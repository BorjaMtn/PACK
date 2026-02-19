"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { defaultLocale, localeCookieName, locales, type AppLocale } from "@/i18n/config";

function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}

export async function setLocaleAction(formData: FormData) {
  const requested = String(formData.get("locale") ?? "");
  const locale = isLocale(requested) ? requested : defaultLocale;

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/profile");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const alias = String(formData.get("alias") ?? "").trim();
  const therianType = String(formData.get("therian_type") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const animalIdentity = String(formData.get("animal_identity") ?? "").trim();
  const tagsInput = String(formData.get("tags") ?? "").trim();
  const avatar = formData.get("avatar");

  if (!alias || !therianType) {
    redirect("/profile/edit?error=Alias+and+therian+type+are+required");
  }

  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  let avatarUrl: string | null | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      redirect("/profile/edit?error=La+foto+debe+ser+una+imagen");
    }

    const sanitizedName = avatar.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `${user.id}/avatar-${crypto.randomUUID()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(path, avatar, { contentType: avatar.type, upsert: true });

    if (uploadError) {
      redirect(`/profile/edit?error=${encodeURIComponent(uploadError.message)}`);
    }

    const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
    avatarUrl = data.publicUrl;
  }

  const payloadWithOptionalFields = {
    alias,
    therian_type: therianType,
    tags,
    bio: bio || null,
    animal_identity: animalIdentity || null,
    ...(typeof avatarUrl === "string" ? { avatar_url: avatarUrl } : {}),
  };

  const { error } = await supabase
    .from("profiles")
    .update(payloadWithOptionalFields)
    .eq("id", user.id);

  if (error?.message?.includes("animal_identity") || error?.message?.includes("avatar_url")) {
    if (error.message.includes("animal_identity") && animalIdentity) {
      redirect(
        "/profile/edit?error=Falta+la+migracion+0007_profiles_identity.sql+en+Supabase",
      );
    }

    if (error.message.includes("avatar_url") && typeof avatarUrl === "string") {
      redirect("/profile/edit?error=Falta+la+migracion+0008_profiles_avatar.sql+en+Supabase");
    }

    const { error: fallbackError } = await supabase
      .from("profiles")
      .update({
        alias,
        therian_type: therianType,
        tags,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (fallbackError) {
      redirect(`/profile/edit?error=${encodeURIComponent(fallbackError.message)}`);
    }

    redirect("/profile?updated=1");
  }

  if (error) {
    redirect(`/profile/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/profile?updated=1");
}
