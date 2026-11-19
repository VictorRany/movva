import Icon from "@/components/Icon";
import Header from "@/components/Header";
import { healthAlerts } from "@/lib/anamnese";
import { brl, getPlan } from "@/lib/plans";
import { requirePersonal } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "../login/actions";

const FILTERS = [
  ["todos", "Todos"], ["anamnese", "Aguardando anamnese"], ["sem-treino", "Montar treino"], ["sem-dieta", "Montar dieta"],
  ["checkin", "Check-in p/ responder"], ["chat", "Mensagens novas"], ["sumidos", "Sem treinar há 7 dias"],
] as const;

export default async function Personal({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "todos", q = "" } = await searchParams;
  const { supabase, user, profile } = await requirePersonal();
  if (profile?.role === "admin") redirect("/admin/alunos");
  const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: students }, { data: anamneses }, { data: workouts }, { data: diets }, { data: pending }, { data: unread }, { data: logs }, { data: payments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "aluno").eq("personal_id", user.id).eq("sub_status", "active").order("created_at", { ascending: false }),
    supabase.from("anamneses").select("student_id, answers"),
    supabase.from("workouts").select("student_id"),
    supabase.from("diets").select("student_id"),
    supabase.from("checkins").select("student_id").is("reply", null),
    supabase.from("messages").select("student_id").eq("from_personal", false).eq("read", false),
    supabase.from("workout_logs").select("student_id").gte("done_at", new Date(Date.now() - 7 * 864e5).toISOString()),
    supabase.from("payments").select("*").eq("personal_id", user.id).eq("status", "approved"),
  ]);
  const toReceive = (payments ?? []).filter((p) => !p.payout_id).reduce((t, p) => t + Number(p.personal_amount), 0);
  const last30 = (payments ?? []).filter((p) => p.paid_at >= since30).reduce((t, p) => t + Number(p.personal_amount), 0);
  const has = (arr: { student_id: string }[] | null, id: string) => !!arr?.some((x) => x.student_id === id);

  const rows = (students ?? []).map((s) => {
    const an = anamneses?.find((a) => a.student_id === s.id);
    return {
      ...s,
      planObj: getPlan(s.plan),
      anamnese: !an,
      alerts: healthAlerts(an?.answers).length,
      "sem-treino": !!an && !has(workouts, s.id),
      "sem-dieta": !!an && !!getPlan(s.plan)?.nutrition && !has(diets, s.id),
      checkin: has(pending, s.id),
      chat: has(unread, s.id),
      sumidos: has(workouts, s.id) && !has(logs, s.id),
    };
  });
  type R = (typeof rows)[number];
  const count = (k: string) => rows.filter((r) => r[k as keyof R]).length;
  const filtered = rows
    .filter((r) => f === "todos" || r[f as keyof R])
    .filter((r) => !q || r.name?.toLowerCase().includes(q.toLowerCase()));

  return (
    <main><Header right={<><a href="/personal/ganhos" className="btn-ghost gap-2"><Icon name="wallet" />Ganhos</a><form action={logout}><button className="btn-ghost">Sair</button></form></>} />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        <h1 className="mb-4 text-2xl font-bold">Olá, {profile?.name?.split(" ")[0]}!</h1>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[[rows.length, "alunos ativos"], [brl(toReceive), "a receber"], [count("sem-treino") + count("sem-dieta") + count("anamnese"), "planos a montar"], [count("checkin") + count("chat"), "para responder"]].map(([v, l]) => (
            <div key={String(l)} className="card p-4" title={l === "a receber" ? `Últimos 30 dias: ${brl(last30)}` : undefined}><p className="num text-3xl font-bold text-gold">{v}</p><p className="text-sm text-muted">{l}</p></div>
          ))}
        </div>
        <form className="mb-3"><input type="hidden" name="f" value={f} /><input name="q" defaultValue={q} placeholder="Buscar aluno pelo nome" className="input" /></form>
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {FILTERS.map(([k, l]) => (
            <a key={k} href={`?f=${k}`} className={`rounded-full px-4 py-2 ${f === k ? "bg-gold font-semibold text-navy" : "bg-navy-2"}`}>{l}{k !== "todos" && ` (${count(k)})`}</a>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((s) => (
            <a key={s.id} href={`/personal/aluno/${s.id}`} className="card block hover:border-gold">
              <div className="flex items-start justify-between">
                <p className="font-bold">{s.name}</p>
                <p className="text-xs text-muted">desde {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <p className="text-sm text-muted">{s.planObj?.name}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {s.is_comp && <span className="chip bg-gold text-navy"><Icon name="gift" size={12} />cortesia</span>}
                {s.alerts > 0 && <span className="chip bg-red-500/20 text-red-300"><Icon name="alert" size={12} />saúde</span>}
                {s.anamnese && <span className="rounded bg-navy-3 px-2 py-1">aguardando anamnese</span>}
                {s["sem-treino"] && <span className="rounded bg-gold/20 px-2 py-1 text-gold">montar treino</span>}
                {s["sem-dieta"] && <span className="rounded bg-gold/20 px-2 py-1 text-gold">montar dieta</span>}
                {s.checkin && <span className="rounded bg-sky-500/20 px-2 py-1 text-sky-300">check-in novo</span>}
                {s.chat && <span className="rounded bg-sky-500/20 px-2 py-1 text-sky-300">mensagem nova</span>}
                {s.sumidos && <span className="rounded bg-navy-3 px-2 py-1">sumido</span>}
              </div>
            </a>
          ))}
          {!filtered.length && <p className="text-muted">Nenhum aluno aqui. </p>}
        </div>
      </div>
    </main>
  );
}
