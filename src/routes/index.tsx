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
    // A recovery/invitation link can land on "/" when the email template uses
    // the site's base URL. Route it to the password form before treating the
    // newly established session as an ordinary login.
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const linkType = hash.get('type') ?? query.get('type');
    if (linkType === 'recovery' || linkType === 'invite') {
      window.location.replace('/reset-password' + window.location.search + window.location.hash);
      return;
    }

    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (userId === undefined) return <div className="min-h-screen bg-background" />;
  return userId ? <DuetOrganizer userId={userId} /> : <DuetLogin />;
}
