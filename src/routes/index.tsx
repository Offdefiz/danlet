import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { ArrowRight, Check, CheckCheck, ChevronRight, Clock3, Compass, Heart, Home, Map, Sparkles, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import weddingImage from "@/assets/beach-wedding.jpg";
import argentinaImage from "@/assets/argentina.jpg";
import thailandImage from "@/assets/thailand.jpg";
import apartmentImage from "@/assets/apartment.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duet — Nosso plano, lado a lado" },
      { name: "description", content: "Um espaço para Daniel e Letícia sonharem juntos, combinarem ideias e acompanharem seus planos de vida." },
      { property: "og:title", content: "Duet — Nosso plano, lado a lado" },
      { property: "og:description", content: "Sonhos compartilhados, próximos passos e metas construídas a dois." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DuetApp,
});

type Tab = "dashboard" | "dream" | "matrix";
type Period = "Curto Prazo" | "Médio Prazo" | "Longo Prazo";
type Goal = { id: number; title: string; description: string; period: Period; category: string; approvals: number };

const initialTasks = [
  { id: 1, title: "Levantar as pendências financeiras", subtitle: "O primeiro passo para o nome limpo", done: false },
  { id: 2, title: "Focar nos estudos para a OAB", subtitle: "Um dia de cada vez", done: false },
  { id: 3, title: "Começar o nosso Fundo Futuro", subtitle: "Todo sonho começa pequeno", done: true },
];

const initialGoals: Goal[] = [
  { id: 1, title: "Limpar o nome", description: "Reorganizar as finanças para abrir caminho aos nossos planos.", period: "Curto Prazo", category: "FINANÇAS", approvals: 0 },
  { id: 2, title: "Conquistar a carteira da OAB", description: "Formatura, aprovação e o começo de uma nova fase.", period: "Curto Prazo", category: "CARREIRA", approvals: 1 },
  { id: 3, title: "Abrir o escritório de advocacia", description: "Começar enxuto, construir autoridade e crescer com propósito.", period: "Médio Prazo", category: "CARREIRA", approvals: 0 },
  { id: 4, title: "Casamento na praia", description: "Celebrar o nosso sim com os pés na areia.", period: "Médio Prazo", category: "NÓS DOIS", approvals: 0 },
  { id: 5, title: "Conhecer a Argentina", description: "Nosso primeiro carimbo no passaporte juntos.", period: "Médio Prazo", category: "VIAGEM", approvals: 0 },
  { id: 6, title: "Comprar nosso apartamento", description: "Um lugar para chamar de nosso, no nosso tempo.", period: "Médio Prazo", category: "NOSSO LAR", approvals: 0 },
  { id: 7, title: "Viajar para a Tailândia", description: "Uma viagem dos sonhos para celebrar o caminho percorrido.", period: "Longo Prazo", category: "VIAGEM", approvals: 0 },
];

const dreams = [
  { id: 101, title: "Conhecer a Argentina", description: "Uma viagem a dois, vinhos, Buenos Aires e o primeiro carimbo no passaporte.", category: "VIAGEM A DOIS", image: argentinaImage, period: "Médio Prazo" as Period, match: true },
  { id: 102, title: "Nosso primeiro apartamento", description: "Um cantinho só nosso, com espaço para todos os planos que vêm pela frente.", category: "NOSSO LAR", image: apartmentImage, period: "Médio Prazo" as Period, match: true },
  { id: 103, title: "Viajar para a Tailândia", description: "Pôr os pés na areia do outro lado do mundo. Que tal um dia?", category: "AVENTURA", image: thailandImage, period: "Longo Prazo" as Period, match: false },
  { id: 104, title: "Casamento na praia", description: "Uma celebração íntima, o mar de testemunha e a vida inteira pela frente.", category: "NÓS DOIS", image: weddingImage, period: "Médio Prazo" as Period, match: true },
];

const periods: Period[] = ["Curto Prazo", "Médio Prazo", "Longo Prazo"];
const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "dream", label: "Dream Match", icon: Heart },
  { id: "matrix", label: "Matriz", icon: Map },
];

function DuetApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [period, setPeriod] = useState<Period>("Curto Prazo");
  const [tasks, setTasks] = useState(initialTasks);
  const [goals, setGoals] = useState(initialGoals);
  const [dreamIndex, setDreamIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const currentDream = dreams[dreamIndex];
  const daysToWedding = Math.max(0, Math.ceil((new Date("2029-02-01T12:00:00").getTime() - Date.now()) / 86400000));

  function respondToDream(liked: boolean) {
    if (!currentDream) return;
    setDirection(liked ? 1 : -1);
    if (liked) {
      if (!goals.some((goal) => goal.title.toLowerCase() === currentDream.title.toLowerCase() || (currentDream.id === 102 && goal.id === 6))) {
        setGoals((existing) => [...existing, { id: currentDream.id, title: currentDream.title, description: currentDream.description, period: currentDream.period, category: currentDream.category, approvals: 0 }]);
      }
      toast.success(currentDream.match ? "Match! A Letícia também quer isso! Adicionado às metas oficiais." : "Boa! Sua ideia foi adicionada às metas oficiais.");
    }
    setDreamIndex((index) => index + 1);
  }

  function approveGoal(id: number) {
    const goal = goals.find((item) => item.id === id);
    if (!goal || goal.approvals >= 2) return;
    setGoals((existing) => existing.map((item) => item.id === id ? { ...item, approvals: item.approvals + 1 } : item));
    if (goal.approvals === 1) {
      toast.success("Meta concluída! Vocês fizeram acontecer juntos.");
      if (!reduceMotion) {
        void confetti({ particleCount: 110, spread: 75, origin: { y: 0.62 }, colors: ["#E9BD65", "#45C998", "#FFFFFF"] });
      }
    } else {
      toast("Primeira assinatura feita. Aguardando parceiro!");
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background pb-36">
      <header className="app-shell flex h-20 items-center justify-between border-b border-border sm:h-24">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Heart size={19} fill="currentColor" strokeWidth={1.5} /></span>
          <span className="text-2xl font-bold tracking-normal">duet<span className="text-primary">.</span></span>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-card px-2 py-1.5 pr-3 text-xs font-medium text-muted-foreground sm:text-sm">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">D</span>
          <span className="-ml-3 flex size-7 items-center justify-center rounded-full border-2 border-background bg-success/20 text-xs font-bold text-success">L</span>
          <span>Daniel & Letícia</span>
        </div>
      </header>

      <main className="app-shell pt-7 sm:pt-10" aria-live="polite">
        {tab === "dashboard" && <Dashboard tasks={tasks} onTaskToggle={(id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))} onNavigate={setTab} daysToWedding={daysToWedding} />}
        {tab === "dream" && <DreamMatch dream={currentDream} index={dreamIndex} direction={direction} onRespond={respondToDream} onRestart={() => setDreamIndex(0)} reducedMotion={Boolean(reduceMotion)} />}
        {tab === "matrix" && <Matrix goals={goals} period={period} onPeriodChange={setPeriod} onApprove={approveGoal} />}
      </main>

      <nav aria-label="Navegação principal" className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 items-center justify-around rounded-2xl border border-border bg-popover/95 p-1.5 shadow-2xl backdrop-blur-2xl sm:bottom-7">
        {navItems.map(({ id, label, icon: Icon }) => (
          <Button key={id} type="button" variant="ghost" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`h-[58px] min-w-0 flex-1 flex-col gap-1 rounded-xl px-1 text-[10px] font-semibold sm:text-xs ${tab === id ? "bg-primary/12 text-primary hover:bg-primary/15 hover:text-primary" : "text-muted-foreground"}`}>
            <Icon className="!size-[19px]" strokeWidth={tab === id ? 2.5 : 1.8} />{label}
          </Button>
        ))}
      </nav>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-3"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h2 className="text-xl font-bold sm:text-2xl">{title}</h2></div>{action}</div>;
}

function Dashboard({ tasks, onTaskToggle, onNavigate, daysToWedding }: { tasks: typeof initialTasks; onTaskToggle: (id: number) => void; onNavigate: (tab: Tab) => void; daysToWedding: number }) {
  return <div className="space-y-8 sm:space-y-10">
    <div><p className="mb-1 text-sm text-muted-foreground">O nosso espaço, no nosso tempo ✦</p><h1 className="text-3xl font-bold sm:text-4xl">Olá, casal! <span className="text-primary">♡</span></h1></div>

    <div className="relative isolate min-h-[278px] overflow-hidden rounded-2xl sm:min-h-[340px]">
      <img src={weddingImage} alt="Casal caminhando para uma cerimônia à beira-mar" width={1536} height={1024} className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/90 via-background/55 to-transparent" />
      <div className="flex min-h-[278px] max-w-[470px] flex-col justify-end p-6 sm:min-h-[340px] sm:p-10">
        <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-background/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur-md"><Sparkles size={13} /> NOSSO FUTURO, JUNTOS</div>
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">Os melhores planos<br />são feitos a dois.</h2>
        <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-foreground/80">Cada pequeno passo aproxima a gente da vida que sonhamos viver.</p>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
      <div className="glass-panel flex min-h-[190px] items-center justify-between gap-4 rounded-2xl p-5 sm:p-7">
        <div className="min-w-0"><div className="mb-4 flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Target size={19} /></div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">NOSSO PROGRESSO</p><h3 className="mt-2 text-xl font-bold sm:text-2xl">Um ano de conquistas</h3><p className="mt-2 max-w-[240px] text-sm text-muted-foreground">50% dos objetivos do ano concluídos.</p></div>
        <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full sm:size-36" style={{ background: "conic-gradient(var(--primary) 0% 50%, var(--secondary) 50% 100%)" }}><div className="flex size-[82%] flex-col items-center justify-center rounded-full bg-background"><span className="text-2xl font-bold text-primary sm:text-3xl">50%</span><span className="text-[10px] text-muted-foreground">do ano</span></div></div>
      </div>
      <div className="glass-panel flex min-h-[190px] flex-col justify-between rounded-2xl p-5 sm:p-7"><div className="flex items-start justify-between"><div className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success"><Clock3 size={19} /></div><span className="rounded-full bg-success/10 px-3 py-1 text-[10px] font-semibold text-success">CONTAGEM REGRESSIVA</span></div><div><p className="mt-4 text-sm text-muted-foreground">Até o casamento na praia</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-4xl font-bold text-foreground sm:text-5xl">{daysToWedding}</strong><span className="text-base text-muted-foreground">dias</span></div><p className="mt-1 text-xs text-muted-foreground">Data estimada: fevereiro de 2029</p></div></div>
    </div>

    <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
      <section><SectionHeading eyebrow="MÃO NA MASSA" title="Próximos passos" action={<span className="text-xs text-muted-foreground">{tasks.filter((task) => task.done).length}/{tasks.length} feitos</span>} />
        <div className="space-y-2.5">{tasks.map((task) => <div key={task.id} className="glass-panel flex items-center gap-4 rounded-2xl p-4 sm:p-5"><Button type="button" variant="glass" size="icon" aria-label={`${task.done ? "Desmarcar" : "Concluir"} ${task.title}`} onClick={() => onTaskToggle(task.id)} className={`!size-8 shrink-0 rounded-lg p-0 ${task.done ? "!border-success !bg-success !text-success-foreground" : ""}`}>{task.done && <Check size={17} />}</Button><div className="min-w-0"><p className={`text-sm font-semibold sm:text-base ${task.done ? "text-muted-foreground line-through" : ""}`}>{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.subtitle}</p></div><ChevronRight size={17} className="ml-auto shrink-0 text-subtle" /></div>)}</div>
      </section>
      <section><SectionHeading eyebrow="PRÓXIMA DESCOBERTA" title="E se a gente..." /><div className="glass-panel flex h-[195px] flex-col justify-between rounded-2xl p-5 sm:p-6"><div><span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Compass size={19} /></span><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Tem ideias esperando por um sim de vocês dois.</p></div><Button variant="gold" onClick={() => onNavigate("dream")} className="h-10 w-fit rounded-xl px-4">Descobrir ideias <ArrowRight size={16} /></Button></div></section>
    </div>
  </div>;
}

function DreamMatch({ dream, index, direction, onRespond, onRestart, reducedMotion }: { dream: typeof dreams[number] | undefined; index: number; direction: number; onRespond: (liked: boolean) => void; onRestart: () => void; reducedMotion: boolean }) {
  return <div className="mx-auto max-w-[590px]"><div className="mb-8 text-center"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">IDEIAS QUE VIRAM HISTÓRIAS</p><h1 className="text-3xl font-bold sm:text-4xl">Dream Match <span className="text-primary">♡</span></h1><p className="mt-2 text-sm text-muted-foreground">O próximo sonho de vocês pode estar aqui.</p></div>
    {dream ? <><div className="mb-4 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>IDEIA {index + 1} DE {dreams.length}</span><span>{Math.round((index / dreams.length) * 100)}% EXPLORADO</span></div><div className="progress-track mb-5 h-1.5 rounded-full"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(index / dreams.length) * 100}%` }} /></div>
      <AnimatePresence mode="wait" custom={direction}><motion.div key={dream.id} custom={direction} initial={reducedMotion ? false : { opacity: 0, x: direction * 75, rotate: direction * 3, scale: 0.95 }} animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }} exit={reducedMotion ? {} : { opacity: 0, x: direction * 100, rotate: direction * 5, scale: 0.95 }} transition={{ duration: reducedMotion ? 0 : 0.32, ease: "easeOut" }} className="relative isolate h-[420px] overflow-hidden rounded-2xl sm:h-[490px]"><img src={dream.image} alt={dream.title} width={1024} height={1536} className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><span className="mb-3 inline-flex rounded-full border border-foreground/30 bg-background/25 px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-foreground backdrop-blur-md">{dream.category}</span><h2 className="text-3xl font-bold leading-tight sm:text-4xl">{dream.title}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-foreground/85">{dream.description}</p></div></motion.div></AnimatePresence>
      <div className="mt-7 flex items-center justify-center gap-10"><div className="flex flex-col items-center gap-2"><Button variant="reject" size="circle" aria-label="Descartar ideia" onClick={() => onRespond(false)}><X /></Button><span className="text-xs text-muted-foreground">Agora não</span></div><div className="flex flex-col items-center gap-2"><Button variant="success" size="circle" aria-label="Quero esta ideia" onClick={() => onRespond(true)} className="!size-[72px] shadow-[0_8px_30px_var(--glow-gold)]"><Heart fill="currentColor" /></Button><span className="text-xs text-muted-foreground">Quero!</span></div></div>
    </> : <div className="glass-panel flex min-h-[410px] flex-col items-center justify-center rounded-2xl p-8 text-center"><span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary"><Heart size={30} /></span><h2 className="text-2xl font-bold">As ideias de hoje acabaram.</h2><p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">Todo grande plano começa com uma conversa. Voltem quando quiserem sonhar mais um pouco.</p><Button variant="gold" onClick={onRestart} className="mt-7 rounded-xl">Ver ideias novamente <ArrowRight size={16} /></Button></div>}
  </div>;
}

function Matrix({ goals, period, onPeriodChange, onApprove }: { goals: Goal[]; period: Period; onPeriodChange: (period: Period) => void; onApprove: (id: number) => void }) {
  const filtered = goals.filter((goal) => goal.period === period);
  return <div className="mx-auto max-w-[900px]"><div className="mb-8"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">NOSSO MAPA DO FUTURO</p><h1 className="text-3xl font-bold sm:text-4xl">Matriz de metas <span className="text-primary">✦</span></h1><p className="mt-2 text-sm text-muted-foreground">Sonhos grandes. Passos possíveis. Sempre juntos.</p></div>
    <div className="mb-7 flex w-full gap-1 rounded-2xl border border-border bg-secondary/65 p-1.5 sm:w-fit" role="tablist" aria-label="Prazo das metas">{periods.map((item) => <Button key={item} type="button" role="tab" aria-selected={period === item} variant="ghost" onClick={() => onPeriodChange(item)} className={`h-10 min-w-0 flex-1 rounded-xl px-2 text-xs font-semibold sm:flex-none sm:px-5 sm:text-sm ${period === item ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground"}`}>{item}</Button>)}</div>
    <div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">{filtered.length} {filtered.length === 1 ? "META" : "METAS"} NO HORIZONTE</span><span className="text-xs text-muted-foreground">{period === "Curto Prazo" ? "Até 2027" : period === "Médio Prazo" ? "2028 — 2031" : "2032 em diante"}</span></div>
    <div className="grid gap-3 sm:grid-cols-2">{filtered.map((goal, index) => <motion.article key={goal.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="glass-panel flex min-h-[213px] flex-col justify-between rounded-2xl p-5 sm:p-6"><div><div className="mb-4 flex items-start justify-between"><span className="rounded-md bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.13em] text-primary">{goal.category}</span><span className={`flex size-8 items-center justify-center rounded-full ${goal.approvals === 2 ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>{goal.approvals === 2 ? <CheckCheck size={17} /> : <Target size={16} />}</span></div><h2 className="text-lg font-bold">{goal.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{goal.description}</p></div><div className="mt-5 border-t border-border pt-4"><Button type="button" onClick={() => onApprove(goal.id)} disabled={goal.approvals === 2} variant={goal.approvals === 0 ? "glass" : goal.approvals === 1 ? "gold" : "success"} className="h-10 w-full rounded-xl text-xs font-semibold sm:text-sm">{goal.approvals === 2 ? <><CheckCheck size={17} /> Meta concluída!</> : goal.approvals === 1 ? <><Check size={16} /> Aguardando parceiro · confirmar</> : <><Check size={16} /> Assinar esta meta</>}</Button><p className="mt-2 text-center text-[11px] text-muted-foreground">{goal.approvals === 0 ? "0 de 2 assinaturas" : goal.approvals === 1 ? "1 de 2 assinaturas" : "2 de 2 assinaturas"}</p></div></motion.article>)}</div>
  </div>;
}