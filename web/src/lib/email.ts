import nodemailer from "nodemailer";
import { adminClient } from "@/lib/supabase/server";

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function layout(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0f1a2e;font-family:Arial,sans-serif;color:#f2efe8">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table width="100%" style="max-width:520px;background:#16243d;border-radius:16px;border:1px solid #22334f" cellpadding="0" cellspacing="0">
  <tr><td style="padding:28px">
    <p style="margin:0 0 18px;font-weight:bold;letter-spacing:2px;color:#f5c518">MOVVA</p>
    <h1 style="margin:0 0 14px;font-size:20px;color:#f2efe8">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#d6dae3">${body}</div>
    ${cta ? `<p style="margin:26px 0 0"><a href="${cta.href}" style="display:inline-block;background:#f5c518;color:#0f1a2e;font-weight:bold;text-decoration:none;padding:13px 22px;border-radius:12px">${cta.label}</a></p>` : ""}
  </td></tr></table>
  <p style="font-size:12px;color:#9aa6ba;margin-top:16px">Você recebe este aviso porque tem conta na Movva. Para desligar, acesse seu perfil no app.</p>
  </td></tr></table></body></html>`;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Envio por SMTP (e-mail da Hostinger, GoDaddy, Google Workspace…). Sem SMTP configurado, só registra no log.
//   Hostinger: SMTP_HOST=smtp.hostinger.com      SMTP_PORT=465
//   GoDaddy:   SMTP_HOST=smtpout.secureserver.net SMTP_PORT=465
let transport: nodemailer.Transporter | null = null;
function smtp() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transport;
}

export async function sendEmail(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  const t = smtp();
  if (!t) { console.log(`[email simulado] para ${to}: ${subject}`); return; }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM ?? `Movva <${process.env.SMTP_USER}>`, to, subject, html });
  } catch (e) {
    console.error("[email] falhou", e); // e-mail nunca derruba a ação do usuário
  }
}

async function people(studentId: string) {
  const db = adminClient();
  const { data: student } = await db.from("profiles").select("*").eq("id", studentId).single();
  const { data: personal } = student?.personal_id ? await db.from("profiles").select("*").eq("id", student.personal_id).single() : { data: null };
  return { db, student, personal };
}
const first = (n?: string | null) => (n ?? "").split(" ")[0] || "Olá";
const wants = (p?: { email_notifications?: boolean } | null) => p?.email_notifications !== false;

// ---------- avisos ----------

// Mensagem nova no chat. Para não lotar a caixa de entrada: só avisa se a mensagem anterior
// do mesmo remetente foi há mais de 10 minutos (conversa em andamento não gera vários e-mails).
export async function notifyMessage(studentId: string, fromPersonal: boolean, body: string) {
  const { db, student, personal } = await people(studentId);
  const { data: recent } = await db.from("messages").select("created_at").eq("student_id", studentId).eq("from_personal", fromPersonal)
    .gte("created_at", new Date(Date.now() - 10 * 60e3).toISOString());
  if ((recent?.length ?? 0) > 1) return;
  const preview = esc(body.length > 400 ? body.slice(0, 400) + "…" : body);
  if (fromPersonal) {
    if (!wants(student)) return;
    await sendEmail(student?.email, `💬 ${first(personal?.name)} respondeu sua mensagem`, layout(
      `${first(student?.name)}, você tem uma nova mensagem`,
      `<p><b>${esc(personal?.name ?? "Seu personal")}</b> escreveu:</p><blockquote style="margin:0;padding:12px 16px;border-left:3px solid #f5c518;background:#0f1a2e;border-radius:8px">${preview}</blockquote>`,
      { label: "Abrir conversa", href: `${SITE()}/app/mensagens` }));
  } else {
    if (!wants(personal)) return;
    await sendEmail(personal?.email, `💬 Nova mensagem de ${student?.name}`, layout(
      `${student?.name} mandou uma mensagem`,
      `<blockquote style="margin:0;padding:12px 16px;border-left:3px solid #f5c518;background:#0f1a2e;border-radius:8px">${preview}</blockquote>
       <p style="margin-top:16px">Clique no botão para responder pelo painel. <b>Não responda este e-mail</b> — a resposta precisa ser pelo app para ficar no histórico do aluno.</p>`,
      { label: "Responder agora", href: `${SITE()}/personal/aluno/${studentId}?tab=chat` }));
  }
}

export async function notifyCheckin(studentId: string) {
  const { student, personal } = await people(studentId);
  if (!wants(personal)) return;
  await sendEmail(personal?.email, `📋 Check-in semanal de ${student?.name}`, layout(
    `${student?.name} enviou o check-in da semana`, `<p>Veja peso, energia e o relato da semana e deixe seu retorno.</p>`,
    { label: "Ver e responder", href: `${SITE()}/personal/aluno/${studentId}?tab=checkins` }));
}

export async function notifyCheckinReply(studentId: string) {
  const { student, personal } = await people(studentId);
  if (!wants(student)) return;
  await sendEmail(student?.email, `✅ ${first(personal?.name)} respondeu seu check-in`, layout(
    `Seu check-in foi respondido`, `<p>${esc(personal?.name ?? "Seu personal")} deixou um retorno sobre a sua semana.</p>`,
    { label: "Ver resposta", href: `${SITE()}/app/evolucao` }));
}

export async function notifyPlanReady(studentId: string, what: "treino" | "dieta") {
  const { student, personal } = await people(studentId);
  if (!wants(student)) return;
  await sendEmail(student?.email, what === "treino" ? "🏋️ Seu treino está pronto!" : "🥗 Seu plano alimentar está pronto!", layout(
    `${first(student?.name)}, ${what === "treino" ? "seu treino novo chegou" : "sua dieta chegou"}!`,
    `<p>${esc(personal?.name ?? "Seu personal")} acabou de publicar ${what === "treino" ? "seu treino individual" : "seu plano alimentar"} no app.</p>`,
    { label: what === "treino" ? "Ver meu treino" : "Ver minha dieta", href: `${SITE()}/app${what === "dieta" ? "/dieta" : ""}` }));
}

export async function notifyNewStudent(studentId: string) {
  const { student, personal } = await people(studentId);
  if (!personal || !wants(personal)) return;
  await sendEmail(personal.email, `🎉 Novo aluno: ${student?.name}${student?.is_comp ? " (cortesia)" : ""}`, layout(
    `Você tem um novo aluno!`,
    `<p><b>${esc(student?.name ?? "")}</b> foi atribuído a você${student?.is_comp ? " como <b>acesso cortesia</b> (parceria/influenciador)" : ""}.</p>
     <p>Assim que ele preencher a anamnese, monte o treino individual. Prazo: até 3 dias úteis.</p>`,
    { label: "Ver aluno", href: `${SITE()}/personal/aluno/${studentId}` }));
}

export async function notifyAnamneseDone(studentId: string) {
  const { student, personal } = await people(studentId);
  if (!personal || !wants(personal)) return;
  await sendEmail(personal.email, `📝 ${student?.name} preencheu a anamnese — hora de montar o treino`, layout(
    `Anamnese recebida`, `<p><b>${esc(student?.name ?? "")}</b> respondeu o questionário. Confira objetivos, rotina e alertas de saúde e monte o treino.</p>`,
    { label: "Ver anamnese", href: `${SITE()}/personal/aluno/${studentId}?tab=anamnese` }));
}
