"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function FeedLiveUpdates() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const refreshSoon = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        router.refresh();
      }, 350);
    };

    const channel = supabase
      .channel("feed-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, refreshSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, refreshSoon)
      .subscribe();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
