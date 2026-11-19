import Icon from "@/components/Icon";
import StudentShell from "@/components/StudentShell";
import { requireStudent } from "@/lib/student";
import { markDone } from "./actions";

type Exercise = { name: string; sets?: string; rest?: string; video?: string };
type Workout = { id: string; title: string; notes: string | null; exercises: Exercise[]; position: number };

// "4x10" -> 4 séries; "60s" / "1min" -> segundos
const setsOf = (s?: string) => Number(s?.match(/^(\d+)\s*x/i)?.[1] ?? 3);
const restOf = (r?: string) => { const n = Number(r?.match(/\d+/)?.[0] ?? 60); return /min/i.test(r ?? "") ? n * 60 : n; };
const minutes = (w: Workout) => Math.max(10, Math.round(w.exercises.reduce((t, e) => t + setsOf(e.sets) * (40 + restOf(e.rest)), 0) / 60 / 5) * 5);
const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { bemvindo } = await searchParams;
  const { supabase, user, profile, plan, personal } = await requireStudent();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: ws }, { data: logs }] = await Promise.all([
    supabase.from("workouts").select("*").eq("student_id", user.id).order("position"),
    supabase.from("workout_logs").select("workout_id, done_at").eq("student_id", user.id).gte("done_at", since).order("done_at", { ascending: false }),
  ]);
  const workouts = (ws ?? []) as Workout[];
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = dayKey(new Date());
  const doneToday = logs?.find((l) => dayKey(new Date(l.done_at)) === today);

  // Treino de hoje: o que foi feito hoje, senão o próximo da sequência depois do último feito
  const last = logs?.[0];
  const lastIdx = last ? workouts.findIndex((w) => w.id === last.workout_id) : -1;
  const current = doneToday ? workouts.find((w) => w.id === doneToday.workout_id) : workouts[(lastIdx + 1) % Math.max(1, workouts.length)];
  const others = workouts.filter((w) => w.id !== current?.id);

  // faixa da semana (últimos 7 dias)
  const week = [...Array(7)].map((_, i) => { const d = new Date(Date.now() - (6 - i) * 864e5); return { d, done: !!logs?.some((l) => dayKey(new Date(l.done_at)) === dayKey(d)) }; });
  const weekCount = week.filter((x) => x.done).length;
  const first = profile?.name?.split(" ")[0];

  return (
    <StudentShell nutrition={plan?.nutrition}>
      <div className="space-y-6 pb-4">
        {bemvindo && (
          <div className="flex gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
            <Icon name="done" className="mt-0.5 text-gold" />
            <p>Anamnese recebida. {personal?.name?.split(" ")[0] ?? "Seu personal"} vai montar seu treino individual e você recebe aqui assim que estiver pronto.</p>
          </div>
        )}

        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{plan?.name}</p>
            <h1 className="mt-1">Bora, {first}</h1>
          </div>
          <div className="text-right">
            <p className="num text-3xl font-bold leading-none text-gold">{weekCount}<span className="text-lg text-muted">/7</span></p>
            <p className="text-[11px] uppercase tracking-wider text-muted">dias na semana</p>
          </div>
        </header>

        <div className="grid grid-cols-7 gap-1.5" aria-label="Treinos nos últimos 7 dias">
          {week.map(({ d, done }, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`grid h-9 w-full place-items-center rounded-lg text-xs font-semibold ${done ? "bg-gold text-navy" : i === 6 ? "border border-gold/50 text-cream" : "bg-navy-2 text-muted"}`}>
                {done ? <Icon name="check" size={16} /> : d.getDate()}
              </span>
              <span className="text-[10px] text-muted">{DAYS[d.getDay()]}</span>
            </div>
          ))}
        </div>

        {!current && !bemvindo && (
          <div className="panel flex gap-3">
            <Icon name="wait" className="mt-0.5 text-gold" />
            <p className="text-sm">{personal?.name?.split(" ")[0] ?? "Seu personal"} está montando seu treino individual. Ele aparece aqui assim que for publicado.</p>
          </div>
        )}

        {current && (
          <section className="overflow-hidden rounded-3xl bg-navy-2">
            <div className="relative border-b border-navy-3 p-5">
              <span className="absolute right-0 top-0 h-full w-24 -skew-x-12 bg-gold/10" aria-hidden />
              <p className="eyebrow">{doneToday ? "Feito hoje" : "Treino de hoje"}</p>
              <h2 className="mt-1 text-2xl">{current.title}</h2>
              <p className="mt-2 flex items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5"><Icon name="dumbbell" size={15} />{current.exercises.length} exercícios</span>
                <span className="flex items-center gap-1.5"><Icon name="clock" size={15} />~{minutes(current)} min</span>
              </p>
              {current.notes && <p className="mt-3 border-l-2 border-gold pl-3 text-sm">{current.notes}</p>}
            </div>
            <ol className="divide-y divide-navy-3">
              {current.exercises.map((e, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-4">
                  <span className="num w-7 text-3xl font-bold leading-none text-navy-3">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{e.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {e.sets && <span className="chip bg-gold/15 text-gold num text-sm">{e.sets}</span>}
                      {e.rest && <span className="chip bg-navy text-muted"><Icon name="clock" size={12} />{e.rest}</span>}
                    </div>
                  </div>
                  {e.video && (
                    <a href={e.video} target="_blank" rel="noreferrer" aria-label={`Ver execução de ${e.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy text-gold hover:bg-navy-3">
                      <Icon name="play" size={22} />
                    </a>
                  )}
                </li>
              ))}
            </ol>
            <div className="border-t border-navy-3 p-4">
              {doneToday ? (
                <p className="flex items-center justify-center gap-2 py-2 font-semibold text-gold"><Icon name="done" />Treino concluído. Bom trabalho!</p>
              ) : (
                <form action={markDone} className="space-y-2">
                  <input type="hidden" name="workout_id" value={current.id} />
                  <input name="note" placeholder="Anote cargas ou como foi (opcional)" className="input" />
                  <button className="btn w-full text-base">Concluí o treino</button>
                </form>
              )}
            </div>
          </section>
        )}

        {!!others.length && (
          <section>
            <h2 className="mb-2 text-base text-muted">Próximos treinos</h2>
            <div className="divide-y divide-navy-3 rounded-2xl bg-navy-2">
              {others.map((w) => (
                <details key={w.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{w.title}</p>
                      <p className="text-xs text-muted">{w.exercises.length} exercícios · ~{minutes(w)} min</p>
                    </div>
                    <Icon name="chevron" className="text-muted transition-transform group-open:rotate-90" />
                  </summary>
                  <ol className="space-y-2 px-4 pb-4 text-sm">
                    {w.exercises.map((e, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span>{i + 1}. {e.name}</span><span className="num shrink-0 text-muted">{e.sets}</span>
                      </li>
                    ))}
                  </ol>
                  {!doneToday && (
                    <form action={markDone} className="px-4 pb-4">
                      <input type="hidden" name="workout_id" value={w.id} />
                      <button className="btn-ghost w-full text-sm">Fiz este treino hoje</button>
                    </form>
                  )}
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </StudentShell>
  );
}
