import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DuetLogin } from "@/components/duet-login";
import { DuetOrganizer } from "@/components/duet-organizer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duet — Daniel & Letícia" },
      { name: "description", content: "O organizador privado de Daniel e Letícia: planos, escolhas e o nosso casamento." },
      { property: "og:title", content: "Duet — Daniel & Letícia" },
      { property: "og:description", content: "Organizador privado do casal: planos, escolhas e casamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DuetApp,
});

function DuetApp() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (userId === undefined) return <div className="min-h-screen bg-background" />;
  return userId ? <DuetOrganizer userId={userId} /> : <DuetLogin />;
}
