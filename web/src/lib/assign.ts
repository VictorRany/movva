import { after } from "next/server";
import { notifyNewStudent } from "@/lib/email";
import { creditPromo } from "@/lib/promo";
import { getPlan } from "@/lib/plans";
import { adminClient } from "@/lib/supabase/server";

type Personal = { id: string; city_id: string | null; max_students: number | null; accepts_online: boolean; accepts_presencial: boolean; active: boolean };

// Personais aptos para um aluno, do menos ocupado para o mais ocupado.
export async function eligiblePersonals(planId: string | null, cityId: string | null) {
  const db = adminClient();
  const plan = getPlan(planId);
  const { data: personals } = await db.from("profiles").select("*").eq("role", "personal").eq("active", true);
  const { data: students } = await db.from("profiles").select("personal_id").eq("role", "aluno").eq("sub_status", "active");
  const load = (id: string) => (students ?? []).filter((s) => s.personal_id === id).length;
  return ((personals ?? []) as Personal[])
    .filter((p) => plan?.modality === "presencial" ? p.accepts_presencial && !!cityId && p.city_id === cityId : p.accepts_online)
    .map((p) => ({ ...p, load: load(p.id) }))
    .filter((p) => p.load < (p.max_students ?? 50))
    // online: prefere personal da mesma cidade do aluno, depois o menos ocupado
    .sort((a, b) => Number(b.city_id === cityId) - Number(a.city_id === cityId) || a.load - b.load);
}

// Atribui automaticamente se o aluno ainda não tem personal. Retorna o id ou null (vai para a fila do admin).
export async function assignPersonal(studentId: string) {
  const db = adminClient();
  const { data: s } = await db.from("profiles").select("*").eq("id", studentId).single();
  if (!s || s.personal_id) return s?.personal_id ?? null;
  const [best] = await eligiblePersonals(s.plan, s.city_id);
  if (!best) return null;
  await db.from("profiles").update({ personal_id: best.id, assigned_at: new Date().toISOString() }).eq("id", studentId).is("personal_id", null);
  after(() => notifyNewStudent(studentId));
  return best.id;
}

// Registra uma cobrança aprovada (idempotente pelo mp_payment_id). Comissão é congelada aqui.
export async function recordPayment(p: { mpPaymentId: string; studentId: string; amount: number; status: string; paidAt?: string }) {
  const db = adminClient();
  const { data: existing } = await db.from("payments").select("*").eq("mp_payment_id", p.mpPaymentId).maybeSingle();
  if (existing) {
    // só atualiza status (ex.: estorno). Nunca recalcula comissão de algo já registrado.
    if (existing.status !== p.status) await db.from("payments").update({ status: p.status }).eq("id", existing.id);
    return;
  }
  const { data: s } = await db.from("profiles").select("*").eq("id", p.studentId).single();
  const personalId = s?.personal_id ?? (await assignPersonal(p.studentId));
  const { data: personal } = personalId ? await db.from("profiles").select("commission_pct").eq("id", personalId).single() : { data: null };
  const pct = Number(personal?.commission_pct ?? 0);
  await db.from("payments").upsert({
    mp_payment_id: p.mpPaymentId, student_id: p.studentId, personal_id: personalId, plan: s?.plan,
    amount: p.amount, commission_pct: pct, personal_amount: +((p.amount * pct) / 100).toFixed(2),
    status: p.status, paid_at: p.paidAt ?? new Date().toISOString(),
  }, { onConflict: "mp_payment_id", ignoreDuplicates: true });
  if (p.status === "approved") await creditPromo(p.studentId);
}
