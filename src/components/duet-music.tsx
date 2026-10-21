import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music, Search, Trash2, Youtube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { findMusic } from "@/lib/duet.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Row } from "@/lib/duet.types";

const moments = [
  "Entrada dos padrinhos",
  "Início da cerimônia",
  "Entrada da noiva",
  "Alianças",
  "Saída dos noivos",
  "Primeira dança",
  "Festa",
];

export function DuetMusic({ records, userId }: { records: Row<"records">[]; userId: string }) {
  const cache = useQueryClient();
  const search = useServerFn(findMusic);
  const [moment, setMoment] = useState(moments[2]!);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [results, setResults] = useState<{ title: string; url: string }[]>([]);
  const songs = records.filter((r) => r.kind === "music");
  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await search({ data: { q: q.trim() } });
      setResults(r.results);
      if (r.error) toast.error(r.error);
      else if (!r.results.length) toast("Nenhuma música encontrada.");
    } catch {
      toast.error("Não foi possível pesquisar.");
    } finally {
      setBusy(false);
    }
  }
  async function add(item: { title: string; url: string }) {
    const { error } = await supabase.from("records").insert({
      kind: "music",
      title: item.title,
      body: item.url,
      period: moment,
      created_by: userId,
      updated_by: userId,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Adicionada em ${moment} ♪`);
      setResults([]);
      setQ("");
    }
  }
  async function removeSong(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      const { data, error } = await supabase
        .from("records")
        .delete()
        .eq("id", id)
        .eq("kind", "music")
        .select("id");
      if (error) throw error;
      await cache.invalidateQueries({ queryKey: ["duet", userId] });
      if (!data?.length) {
        toast.error("A música não foi removida. Atualize a lista e tente novamente.");
        return;
      }
      toast.success("Música removida.");
    } catch {
      toast.error("Não foi possível remover a música. Tente novamente.");
    } finally {
      setRemovingId(null);
    }
  }
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Music size={18} className="text-primary" />
        <h2 className="text-xl font-semibold">Nossas músicas</h2>
      </div>
      <form onSubmit={run} className="space-y-2">
        <select
          aria-label="Momento"
          value={moment}
          onChange={(e) => setMoment(e.target.value)}
          className="h-10 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {moments.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome da música ou artista"
            maxLength={150}
          />
          <Button disabled={busy} size="icon" title="Pesquisar">
            <Search />
          </Button>
        </div>
      </form>
      {busy && <p className="mt-3 text-sm text-muted-foreground">Buscando músicas…</p>}
      {results.map((r) => (
        <div
          key={r.url}
          className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"
        >
          <a href={r.url} target="_blank" rel="noreferrer" className="min-w-0 truncate">
            {r.title}
          </a>
          <Button size="sm" variant="outline" onClick={() => add(r)}>
            Adicionar
          </Button>
        </div>
      ))}
      <div className="mt-5 space-y-4">
        {moments
          .filter((m) => songs.some((s) => s.period === m))
          .map((m) => (
            <div key={m}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{m}</p>
              {songs
                .filter((s) => s.period === m)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"
                  >
                    <a
                      href={s.body}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-2"
                    >
                      {s.body.includes("youtu") ? <Youtube size={16} className="shrink-0 text-primary" /> : <Music size={16} className="shrink-0 text-primary" />}
                      <span className="truncate">{s.title}</span>
                    </a>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Remover"
                      aria-label={`Remover ${s.title}`}
                      aria-busy={removingId === s.id}
                      disabled={removingId !== null}
                      onClick={() => void removeSong(s.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
            </div>
          ))}
        {!songs.length && (
          <p className="text-sm text-muted-foreground">
            Pesquisem e escolham as músicas de cada momento.
          </p>
        )}
      </div>
    </section>
  );
}
