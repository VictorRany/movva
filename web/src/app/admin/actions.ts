"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignPersonal } from "@/lib/assign";
import { adminClient, requireAdmin } from "@/lib/supabase/server";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
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
    // envia e-mail de convite: o personal clica e define a senha
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      data: { name: fields.name, phone: fields.phone },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-senha`,
    });
    if (error || !data.user) redirect(`/admin/personais?erro=${encodeURIComponent(error?.message ?? "Falha no convite")}`);
    id = data.user.id;
  }
  await db.from("profiles").update({ ...fields, email, role: "personal", active: true }).eq("id", id);
  redirect(`/admin/personais/${id}?ok=Personal cadastrado. Convite enviado para ${email}`);
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
  const db = adminClient();
  const studentId = str(form, "student_id");
  const personalId = str(form, "personal_id");
  if (personalId === "auto") {
    await db.from("profiles").update({ personal_id: null }).eq("id", studentId);
    await assignPersonal(studentId);
  } else {
    const { data: p } = await db.from("profiles").select("id").eq("id", personalId).eq("role", "personal").maybeSingle();
    if (!p) throw new Error("Personal inválido");
    // pagamentos futuros vão para o novo personal; os já registrados continuam com quem atendeu
    await db.from("profiles").update({ personal_id: personalId, assigned_at: new Date().toISOString() }).eq("id", studentId);
  }
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
