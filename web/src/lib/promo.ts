import { after } from "next/server";
import { sendEmail } from "@/lib/email";
import { adminClient } from "@/lib/supabase/server";

export const normalizeCode = (c: unknown) => String(c ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

export async function findCode(code: string) {
  if (!code) return null;
  const { data } = await adminClient().from("promo_codes").select("*").eq("code", normalizeCode(code)).eq("active", true).maybeSingle();
  return data;
}

const addMonths = (base: Date, n: number) => { const d = new Date(base); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
export const inMonths = (n: number) => addMonths(new Date(), n);

// Chamado no 1º pagamento aprovado de um aluno. A cada `signups_per_bonus` assinaturas pagas com o código,
// o influenciador ganha `bonus_months` meses grátis. Idempotente (cada aluno conta uma única vez).
export async function creditPromo(studentId: string) {
  const db = adminClient();
  const { data: s } = await db.from("profiles").select("*").eq("id", studentId).single();
  if (!s?.promo_code || s.promo_credited) return;
  const { data: code } = await db.from("promo_codes").select("*").eq("code", s.promo_code).maybeSingle();
  if (!code || code.influencer_id === studentId) return; // sem autoindicação
  // marca primeiro (com filtro) para nunca creditar duas vezes, mesmo com webhooks simultâneos
  await db.from("profiles").update({ promo_credited: true }).eq("id", studentId).eq("promo_credited", false);
  const { data: counted } = await db.from("profiles").select("id").eq("promo_code", code.code).eq("promo_credited", true);
  const total = counted?.length ?? 0;
  const every = Math.max(1, Number(code.signups_per_bonus ?? 5));
  if (total === 0 || total % every !== 0) return; // ainda não fechou o bloco de N assinaturas
  const { data: inf } = await db.from("profiles").select("*").eq("id", code.influencer_id).single();
  if (!inf) return;
  if (inf.sub_status === "active" && !inf.is_comp) return; // influenciador que já paga: não mexe na assinatura dele
  const today = new Date().toISOString().slice(0, 10);
  const base = inf.comp_until && inf.comp_until > today ? new Date(inf.comp_until + "T12:00") : new Date();
  const until = addMonths(base, code.bonus_months);
  await db.from("profiles").update({ is_comp: true, sub_status: "active", comp_until: until }).eq("id", inf.id);
  after(() => sendEmail(inf.email, "🎁 Você ganhou mais tempo grátis na Movva!", `<p>Seu código <b>${code.code}</b> chegou a <b>${total} assinaturas</b> e você ganhou +${code.bonus_months} mês grátis. Seu acesso foi estendido até <b>${new Date(until + "T12:00").toLocaleDateString("pt-BR")}</b>. Obrigado por divulgar! 💛</p>`));
}
