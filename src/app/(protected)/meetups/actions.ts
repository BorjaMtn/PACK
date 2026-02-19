"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeTherianType(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function withError(message: string) {
  return `/meetups?error=${encodeURIComponent(message)}`;
}

export async function createMeetupAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const rawDate = String(formData.get("date") ?? "").trim();
  const rawTime = String(formData.get("time") ?? "").trim();

  if (!title || !city || !rawDate || !rawTime) {
    redirect(withError("Please complete title, city, date and time"));
  }

  const date = new Date(`${rawDate}T${rawTime}`);
  if (Number.isNaN(date.getTime())) {
    redirect(withError("Invalid meetup date"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("therian_type")
    .eq("id", user.id)
    .maybeSingle();

  const therianType = normalizeTherianType(profile?.therian_type ?? "");
  if (!therianType) {
    redirect(withError("Complete onboarding before creating meetups"));
  }

  const { error } = await supabase.from("meetups").insert({
    title,
    description,
    city,
    date: date.toISOString(),
    therian_type: therianType,
    created_by: user.id,
  });

  if (error) {
    redirect(withError(error.message));
  }

  revalidatePath("/meetups");
  redirect("/meetups?created=1");
}

export async function joinMeetupAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const meetupId = String(formData.get("meetup_id") ?? "");
  if (!meetupId) {
    redirect(withError("Invalid meetup"));
  }

  const [{ data: profile }, { data: meetup }] = await Promise.all([
    supabase.from("profiles").select("therian_type").eq("id", user.id).maybeSingle(),
    supabase.from("meetups").select("id, therian_type").eq("id", meetupId).maybeSingle(),
  ]);

  const myType = normalizeTherianType(profile?.therian_type ?? "");
  const meetupType = normalizeTherianType(meetup?.therian_type ?? "");
  if (!meetup?.id || !myType || myType !== meetupType) {
    redirect(withError("You can only join meetups from your pack"));
  }

  const { error } = await supabase.from("meetup_participants").upsert(
    {
      meetup_id: meetup.id,
      user_id: user.id,
    },
    { onConflict: "meetup_id,user_id" },
  );

  if (error) {
    redirect(withError(error.message));
  }

  revalidatePath("/meetups");
  redirect("/meetups?joined=1");
}
