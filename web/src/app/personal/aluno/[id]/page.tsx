import Chat from "@/components/Chat";
import Header from "@/components/Header";
import WeightChart from "@/components/WeightChart";
import { ANAMNESE, age, healthAlerts } from "@/lib/anamnese";
import { getPlan } from "@/lib/plans";
import { requirePersonal } from "@/lib/supabase/server";
import { deleteWorkout, replyCheckin, saveDiet, saveWorkout, sendPersonalMessage } from "../../actions";

type Exercise = { name: string; sets?: string; rest?: string; video?: string };
type Meal = { time: string; name: string; items: string };
const toText = (ex: Exercise[]) => ex.map((e) => [e.name, e.sets, e.rest, e.video].filter((v) => v).join(" | ")).join("\n");

function WorkoutForm({ studentId, w }: { studentId: string; w?: { id: string; title: string; notes: string | null; exercises: Exercise[]; position: number } }) {
  return (
    <form action={saveWorkout} className="space-y-3">
      <input type="hidden" name="student_id" value={studentId} />
      {w && <input type="hidden" name="id" value={w.id} />}
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <div><label className="label">Título</label><input name="title" defaultValue={w?.title} required placeholder="Treino A — Peito e tríceps" className="input" /></div>
        <div><label className="label">Ordem</label><input name="position" type="number" defaultValue={w?.position ?? 0} className="input" /></div>
      </div>
      <div><label className="label">Exercícios — um por linha: nome | séries | descanso | link do vídeo</label>
        <textarea name="exercises" required rows={6} defaultValue={w ? toText(w.exercises) : ""} placeholder={"Supino reto | 4x10 | 60s | https://youtu.be/...\nCrucifixo | 3x12 | 45s"} className="input font-mono text-sm" /></div>
      <div><label className="label">Observações para o aluno</label><input name="notes" defaultValue={w?.notes ?? ""} className="input" /></div>
      <button className="btn">{w ? "Salvar" : "Adicionar treino"}</button>
    </form>
  );
}

const TABS = [["treino", "Treino"], ["dieta", "Dieta"], ["anamnese", "Anamnese"], ["checkins", "Check-ins"], ["chat", "Chat"]] as const;

export default async function Student({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = "treino" } = await searchParams;
  const { supabase, user, profile } = await requirePersonal();
  const [{ data: s }, { data: an }, { data: workouts }, { data: diet }, { data: checkins }, { data: logs }, { data: messages }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("anamneses").select("*").eq("student_id", id).single(),
    supabase.from("workouts").select("*").eq("student_id", id).order("position"),
    supabase.from("diets").select("*").eq("student_id", id).single(),
    supabase.from("checkins").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    supabase.from("workout_logs").select("*, workouts(title)").eq("student_id", id).order("done_at", { ascending: false }).limit(15),
    supabase.from("messages").select("*").eq("student_id", id).order("created_at"),
  ]);
  if (!s || (profile?.role !== "admin" && s.personal_id !== user.id)) return <p className="p-8">Aluno não encontrado</p>;
  if (tab === "chat") await supabase.from("messages").update({ read: true }).eq("student_id", id).eq("from_personal", false).eq("read", false);

  const a = (an?.answers ?? {}) as Record<string, unknown>;
  const plan = getPlan(s.plan);
  const alerts = healthAlerts(a);
  const wa = s.phone ? `https://wa.me/55${String(s.phone).replace(/\D/g, "").replace(/^55/, "")}` : null;
  const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")) || "—";
  const weights = [
    ...(a.weight ? [{ date: an!.accepted_terms_at, weight: Number(a.weight) }] : []),
    ...[...(checkins ?? [])].reverse().filter((c) => c.weight).map((c) => ({ date: c.created_at, weight: Number(c.weight) })),
  ];
  const unreadChat = messages?.some((m) => !m.from_personal && !m.read);
  const pendingCheckins = checkins?.filter((c) => !c.reply).length ?? 0;

  return (
    <main><Header right={<a href={profile?.role === "admin" ? "/admin/alunos" : "/personal"} className="btn-ghost">← Alunos</a>} />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="text-muted">
            {plan?.name} · {age(a.birth as string) ? `${age(a.birth as string)} anos · ` : ""}{show(a.goal)} {wa && <a href={wa} target="_blank" className="ml-2 text-gold">WhatsApp ↗</a>}
          </p>
        </div>
        {alerts.length > 0 && (
          <div className="card mb-4 border-red-400 text-sm">
            <p className="font-bold text-red-300">⚠ Atenção à saúde — recomende liberação médica</p>
            <ul className="mt-1 list-disc pl-5">{alerts.map((l) => <li key={l}>{l} <b>Sim</b></li>)}</ul>
          </div>
        )}
        {!an && <div className="card mb-4">⏳ Este aluno ainda não preencheu a anamnese.</div>}

        <div className="mb-6 flex gap-2 overflow-x-auto text-sm">
          {TABS.filter(([k]) => k !== "dieta" || plan?.nutrition).map(([k, l]) => (
            <a key={k} href={`?tab=${k}`} className={`whitespace-nowrap rounded-full px-4 py-2 ${tab === k ? "bg-gold font-semibold text-navy" : "bg-navy-2"}`}>
              {l}{k === "checkins" && pendingCheckins ? ` (${pendingCheckins})` : ""}{k === "chat" && unreadChat ? " •" : ""}
            </a>
          ))}
        </div>

        {tab === "treino" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {an && (
                <div className="card grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  {[["Experiência", a.experience], ["Dias/semana", a.days_week], ["Tempo", a.session_time], ["Local", a.place]].map(([l, v]) => (
                    <div key={String(l)}><p className="text-muted">{String(l)}</p><p className="font-semibold">{show(v)}</p></div>
                  ))}
                  {!!a.injuries && <div className="col-span-full"><p className="text-muted">Lesões / dores</p><p className="font-semibold text-red-300">{show(a.injuries)}</p></div>}
                </div>
              )}
              {workouts?.map((w) => (
                <details key={w.id} className="card">
                  <summary className="cursor-pointer font-bold">{w.title} <span className="text-sm font-normal text-muted">({(w.exercises as Exercise[]).length} exercícios)</span></summary>
                  <div className="mt-4"><WorkoutForm studentId={id} w={w} /></div>
                  <form action={deleteWorkout} className="mt-2"><input type="hidden" name="id" value={w.id} /><input type="hidden" name="student_id" value={id} />
                    <button className="text-sm text-red-400">Excluir treino</button></form>
                </details>
              ))}
              <div className="card"><h2 className="mb-3 font-bold text-gold">+ Novo treino</h2><WorkoutForm studentId={id} /></div>
            </div>
            <aside className="card h-fit">
              <h2 className="mb-2 font-bold">Últimos treinos feitos</h2>
              {!logs?.length && <p className="text-sm text-muted">Nenhum ainda.</p>}
              {logs?.map((l) => (
                <p key={l.id} className="mb-1 text-sm"><span className="text-muted">{new Date(l.done_at).toLocaleDateString("pt-BR")}</span> {l.workouts?.title}{l.note && <span className="text-muted"> — “{l.note}”</span>}</p>
              ))}
            </aside>
          </div>
        )}

        {tab === "dieta" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <form action={saveDiet} className="card space-y-3">
              <input type="hidden" name="student_id" value={id} />
              <div><label className="label">Refeições — uma por linha: horário | refeição | alimentos</label>
                <textarea name="meals" required rows={10} className="input font-mono text-sm"
                  defaultValue={((diet?.meals ?? []) as Meal[]).map((m) => `${m.time} | ${m.name} | ${m.items}`).join("\n")}
                  placeholder={"07:00 | Café da manhã | 2 ovos, 1 pão integral, 1 fruta\n12:30 | Almoço | 120 g frango, 4 col. arroz, salada"} /></div>
              <div><label className="label">Orientações gerais</label><textarea name="notes" rows={2} defaultValue={diet?.notes ?? ""} className="input" placeholder="Água, suplementos, refeição livre…" /></div>
              <button className="btn">{diet ? "Atualizar dieta" : "Publicar dieta"}</button>
            </form>
            <aside className="card h-fit space-y-2 text-sm">
              <h2 className="font-bold">Da anamnese</h2>
              {[["Refeições/dia", a.meals_day], ["Água", a.water], ["Restrições", a.restrictions], ["Não come", a.food_dislikes], ["Suplementos", a.supplements], ["Dia típico", a.food_day]].map(([l, v]) => (
                <div key={String(l)}><p className="text-muted">{String(l)}</p><p>{show(v)}</p></div>
              ))}
            </aside>
          </div>
        )}

        {tab === "anamnese" && an && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Respondida em {new Date(an.updated_at).toLocaleDateString("pt-BR")} · termos aceitos em {new Date(an.accepted_terms_at).toLocaleDateString("pt-BR")}</p>
            {ANAMNESE.map((sec) => (
              <div key={sec.title} className="card">
                <h2 className="mb-3 font-bold text-gold">{sec.title}</h2>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  {sec.fields.map((f) => (
                    <div key={f.key}>
                      <dt className="text-muted">{f.label}</dt>
                      <dd className={f.alert && a[f.key] === "Sim" ? "font-bold text-red-300" : ""}>{show(a[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}

        {tab === "checkins" && (
          <div className="space-y-4">
            <div className="card"><h2 className="mb-2 font-bold">Peso</h2><WeightChart points={weights} /></div>
            {!checkins?.length && <p className="text-muted">Nenhum check-in ainda.</p>}
            {checkins?.map((c) => (
              <div key={c.id} className="card text-sm">
                <p className="text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")} {c.weight && `· ${c.weight} kg`} {c.energy && `· energia ${c.energy}/5`}</p>
                <p className="mt-1">{c.feedback}</p>
                {c.reply ? <p className="mt-2 border-l-2 border-gold pl-3">{c.reply}</p> : (
                  <form action={replyCheckin} className="mt-3 space-y-2">
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="student_id" value={id} />
                    <textarea name="reply" required rows={2} className="input" placeholder="Responder…" />
                    <button className="btn py-2 text-sm">Responder</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "chat" && <Chat messages={messages ?? []} mine="personal" action={sendPersonalMessage} hidden={{ student_id: id }} />}
      </div>
    </main>
  );
}
