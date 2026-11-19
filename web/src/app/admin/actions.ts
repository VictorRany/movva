"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { assignPersonal } from "@/lib/assign";
import { notifyNewStudent } from "@/lib/email";
import { getPlan } from "@/lib/plans";
import { normalizeCode } from "@/lib/promo";
import { adminClient, requireAdmin } from "@/lib/supabase/server";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Cria a conta: com senha (admin entrega o login por WhatsApp) ou por convite no e-mail.
async function createAccount(email: string, password: string, meta: Record<string, string>): Promise<{ id: string } | { error: string }> {
  const db = adminClient();
  if (password) {
    if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres" };
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta });
    return error || !data.user ? { error: error?.message ?? "Falha ao criar conta" } : { id: data.user.id };
  }
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: meta, redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/definir-senha`,
  });
  return error || !data.user ? { error: error?.message ?? "Falha ao enviar convite" } : { id: data.user.id };
}
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

// ---------- cidades ----------
export async function addCity(form: FormData) {
  await requireAdmin();
  const name = str(form, "name").replace(/\s+/g, " ");
  const state = str(form, "state").toUpperCase();
  if (!name || !UFS.includes(state)) redirect("/admin/cidades?erro=Cidade ou UF inválida");
  const db = adminClient();
  const { data: dup } = await db.from("cities").select("id").eq("name", name).eq("state", state).maybeSingle();
  if (dup) redirect("/admin/cidades?erro=Essa cidade já está cadastrada");
  await db.from("cities").insert({ name, state, active: false });
  revalidatePath("/admin/cidades");
}

export async function toggleCity(form: FormData) {
  await requireAdmin();
  await adminClient().from("cities").update({ active: form.get("active") === "true" }).eq("id", str(form, "id"));
  revalidatePath("/admin/cidades");
}

// ---------- personais ----------
function personalFields(form: FormData) {
  const pct = Number(str(form, "commission_pct").replace(",", "."));
  const max = Number(str(form, "max_students"));
  if (!(pct >= 0 && pct <= 100)) throw new Error("Comissão deve estar entre 0 e 100");
  if (!(max >= 1)) throw new Error("Limite de alunos inválido");
  return {
    name: str(form, "name"), phone: str(form, "phone"), cpf: str(form, "cpf"), cref: str(form, "cref"), pix_key: str(form, "pix_key"),
    city_id: str(form, "city_id") || null, commission_pct: pct, max_students: max,
    accepts_online: form.get("accepts_online") === "on", accepts_presencial: form.get("accepts_presencial") === "on",
    contract_signed_at: str(form, "contract_signed_at") || null,
  };
}

export async function createPersonal(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const email = str(form, "email").toLowerCase();
  const fields = personalFields(form);
  const { data: exists } = await db.from("profiles").select("id, role").eq("email", email).maybeSingle();
  let id = exists?.id as string | undefined;
  if (exists && exists.role !== "aluno") redirect("/admin/personais?erro=Esse e-mail já é de um personal/admin");
  if (!id) {
    const created = await createAccount(email, str(form, "password"), { name: fields.name, phone: fields.phone });
    if ("error" in created) redirect(`/admin/personais?erro=${encodeURIComponent(created.error)}`);
    id = created.id;
  }
  await db.from("profiles").update({ ...fields, email, role: "personal", active: true }).eq("id", id);
  redirect(`/admin/personais/${id}?ok=${encodeURIComponent(str(form, "password") ? `Personal cadastrado. Login: ${email} (senha definida por você)` : `Personal cadastrado. Convite enviado para ${email}`)}`);
}

export async function updatePersonal(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  await adminClient().from("profiles").update({ ...personalFields(form), active: form.get("active") === "on" }).eq("id", id).eq("role", "personal");
  revalidatePath(`/admin/personais/${id}`);
  redirect(`/admin/personais/${id}?ok=Dados salvos`);
}

// ---------- alunos ----------
export async function reassignStudent(form: FormData) {
  await requireAdmin();
  // pagamentos futuros vão para o novo personal; os já registrados continuam com quem atendeu
  await setPersonal(str(form, "student_id"), str(form, "personal_id"));
  revalidatePath("/admin/alunos");
}

// ---------- financeiro ----------
export async function registerPayout(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const personalId = str(form, "personal_id");
  // usa exatamente os ids exibidos na tela: se entrar pagamento novo nesse meio tempo, ele fica para o próximo repasse
  const ids = str(form, "payment_ids").split(",").filter(Boolean);
  const { data: pend } = await db.from("payments").select("*").eq("personal_id", personalId).eq("status", "approved").is("payout_id", null);
  const items = (pend ?? []).filter((p) => ids.includes(p.id));
  if (!items.length) redirect("/admin/financeiro?erro=Nada a repassar");
  const amount = +items.reduce((t, p) => t + Number(p.personal_amount), 0).toFixed(2);
  const { data: payout } = await db.from("payouts").insert({ personal_id: personalId, amount, note: str(form, "note") || null }).select().single();
  for (const p of items) await db.from("payments").update({ payout_id: payout!.id }).eq("id", p.id).is("payout_id", null);
  revalidatePath("/admin/financeiro");
}

// ---------- cortesias (influenciadores) e gestão de alunos ----------
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const confirmUrl = () => `${SITE()}/auth/callback?next=/definir-senha`;

async function setPersonal(studentId: string, personalId: string) {
  const db = adminClient();
  if (personalId === "auto") {
    await db.from("profiles").update({ personal_id: null }).eq("id", studentId);
    return assignPersonal(studentId); // já envia o e-mail ao personal
  }
  const { data: p } = await db.from("profiles").select("id").eq("id", personalId).eq("role", "personal").maybeSingle();
  if (!p) throw new Error("Personal inválido");
  const { data: s } = await db.from("profiles").select("personal_id").eq("id", studentId).single();
  if (s?.personal_id === personalId) return personalId;
  await db.from("profiles").update({ personal_id: personalId, assigned_at: new Date().toISOString() }).eq("id", studentId);
  after(() => notifyNewStudent(studentId));
  return personalId;
}

export async function grantComp(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const email = str(form, "email").toLowerCase();
  const plan = getPlan(str(form, "plan"));
  if (!email.includes("@") || !plan) redirect("/admin/alunos/novo?erro=Preencha e-mail e plano");
  const { data: existing } = await db.from("profiles").select("*").eq("email", email).maybeSingle();
  if (existing && existing.role !== "aluno") redirect("/admin/alunos/novo?erro=Esse e-mail é de um personal/admin");
  if (existing?.sub_status === "active" && !existing.is_comp) {
    redirect(`/admin/alunos/novo?erro=${encodeURIComponent("Esse aluno já paga uma assinatura. Cancele a assinatura dele antes de liberar cortesia.")}`);
  }
  let id = existing?.id as string | undefined;
  const back = str(form, "back") || "/admin/alunos/novo";
  if (!id) {
    const created = await createAccount(email, str(form, "password"), { name: str(form, "name"), phone: str(form, "phone"), city_id: str(form, "city_id") });
    if ("error" in created) redirect(`${back}?erro=${encodeURIComponent(created.error)}`);
    id = created.id;
  }
  await db.from("profiles").update({
    email, name: str(form, "name") || existing?.name, phone: str(form, "phone") || existing?.phone, city_id: str(form, "city_id") || existing?.city_id || null,
    plan: plan.id, sub_status: "active", is_comp: true, comp_until: str(form, "comp_until") || null, comp_note: str(form, "comp_note") || null,
  }).eq("id", id);
  await setPersonal(id, str(form, "personal_id") || "auto");
  const code = normalizeCode(form.get("promo_code"));
  if (code) await upsertCode(id, code, Number(str(form, "discount_pct") || 0), Number(str(form, "bonus_months") || 1), Number(str(form, "signups_per_bonus") || 5));
  const how = existing ? "Cortesia liberada para a conta existente." : str(form, "password") ? `Conta criada. Login: ${email} (senha definida por você).` : `Cortesia liberada. Convite enviado para ${email}.`;
  redirect(`/admin/alunos/${id}?ok=${encodeURIComponent(how)}`);
}

export async function updateStudent(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const id = str(form, "id");
  const plan = getPlan(str(form, "plan"));
  const { data: cur } = await db.from("profiles").select("plan, sub_status").eq("id", id).single();
  // nunca deixa um aluno ativo sem plano
  const planId = plan?.id ?? (cur?.sub_status === "active" ? cur.plan ?? "online-completo" : null);
  await db.from("profiles").update({
    plan: planId, city_id: str(form, "city_id") || null,
    comp_until: str(form, "comp_until") || null, comp_note: str(form, "comp_note") || null,
  }).eq("id", id).eq("role", "aluno");
  const pid = str(form, "personal_id");
  if (pid) await setPersonal(id, pid);
  redirect(`/admin/alunos/${id}?ok=Dados salvos`);
}

export async function setStudentAccess(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const id = str(form, "id");
  const op = str(form, "op");
  const { data: s } = await db.from("profiles").select("*").eq("id", id).single();
  if (!s) redirect("/admin/alunos");
  if (op === "comp_on") {
    if (s.sub_status === "active" && !s.is_comp) redirect(`/admin/alunos/${id}?erro=Aluno pagante: cancele a assinatura antes`);
    await db.from("profiles").update({ is_comp: true, sub_status: "active", plan: s.plan ?? "online-completo" }).eq("id", id);
    if (!s.personal_id) await assignPersonal(id);
  }
  if (op === "comp_off") await db.from("profiles").update({ is_comp: false, sub_status: "inactive" }).eq("id", id).eq("is_comp", true);
  if (op === "block") await db.from("profiles").update({ sub_status: "inactive" }).eq("id", id);
  redirect(`/admin/alunos/${id}?ok=Acesso atualizado`);
}

// Reenvia acesso (aluno ou personal): e-mail com link para criar/redefinir a senha
export async function resendAccess(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const id = str(form, "id");
  const back = str(form, "back") || "/admin";
  const { data: p } = await db.from("profiles").select("email").eq("id", id).single();
  if (!p?.email) redirect(`${back}?erro=Sem e-mail cadastrado`);
  const { error } = await db.auth.resetPasswordForEmail(p.email, { redirectTo: confirmUrl() });
  redirect(`${back}?${error ? `erro=${encodeURIComponent(error.message)}` : `ok=${encodeURIComponent(`Link de acesso enviado para ${p.email}`)}`}`);
}

// Transfere todos os alunos ativos de um personal (ex.: ao desligar o personal)
export async function transferStudents(form: FormData) {
  await requireAdmin();
  const db = adminClient();
  const from = str(form, "from");
  const to = str(form, "to");
  const { data: list } = await db.from("profiles").select("id").eq("role", "aluno").eq("personal_id", from);
  for (const s of list ?? []) await setPersonal(s.id, to || "auto");
  redirect(`/admin/personais/${from}?ok=${encodeURIComponent(`${list?.length ?? 0} aluno(s) transferido(s)`)}`);
}

// ---------- códigos promocionais ----------
async function upsertCode(influencerId: string, code: string, discount: number, bonus: number, every = 5) {
  const db = adminClient();
  if (code.length < 3) redirect(`/admin/cupons?erro=Código muito curto`);
  const { data: taken } = await db.from("promo_codes").select("influencer_id").eq("code", code).maybeSingle();
  if (taken && taken.influencer_id !== influencerId) redirect(`/admin/cupons?erro=${encodeURIComponent(`O código ${code} já pertence a outra pessoa`)}`);
  await db.from("promo_codes").upsert({
    code, influencer_id: influencerId, discount_pct: Math.min(90, Math.max(0, discount)), bonus_months: Math.min(12, Math.max(0, bonus)), signups_per_bonus: Math.min(100, Math.max(1, every || 5)), active: true,
  }, { onConflict: "code" });
}

export async function saveCode(form: FormData) {
  await requireAdmin();
  const code = normalizeCode(form.get("code"));
  await upsertCode(str(form, "influencer_id"), code, Number(str(form, "discount_pct") || 0), Number(str(form, "bonus_months") || 1), Number(str(form, "signups_per_bonus") || 5));
  redirect(`${str(form, "back") || "/admin/cupons"}?ok=${encodeURIComponent(`Código ${code} salvo`)}`);
}

export async function toggleCode(form: FormData) {
  await requireAdmin();
  await adminClient().from("promo_codes").update({ active: form.get("active") === "true" }).eq("code", str(form, "code"));
  revalidatePath("/admin/cupons");
}
