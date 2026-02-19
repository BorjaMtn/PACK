"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function completeOnboardingAction(formData: FormData) {
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
  const tagsInput = String(formData.get("tags") ?? "");
  const safeMode = formData.get("safe_mode") === "on";

  if (!alias || !therianType) {
    redirect("/onboarding?error=Alias+and+therian+type+are+required");
  }

  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const payloadWithIdentity = {
    id: user.id,
    alias,
    therian_type: therianType,
    bio,
    animal_identity: animalIdentity || null,
    tags,
    safe_mode: safeMode,
  };

  const { error } = await supabase.from("profiles").upsert(payloadWithIdentity);

  if (error?.message?.includes("animal_identity")) {
    const { error: fallbackError } = await supabase.from("profiles").upsert({
      id: user.id,
      alias,
      therian_type: therianType,
      bio,
      tags,
      safe_mode: safeMode,
    });

    if (fallbackError) {
      redirect(`/onboarding?error=${encodeURIComponent(fallbackError.message)}`);
    }

    redirect("/feed");
  }

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/feed");
}
