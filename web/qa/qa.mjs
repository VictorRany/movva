// QA ponta a ponta do Movva em produção. Cria usuários de teste e apaga tudo no final.
import { chromium, devices } from "playwright";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const BASE = process.env.BASE ?? "https://movva-nine.vercel.app";
const URL_SB = process.env.SB_URL, ANON = process.env.SB_ANON, SR = process.env.SB_SR;
const admin = createClient(URL_SB, SR, { auth: { persistSession: false } });
const ts = Date.now().toString(36);
const PW = "Qa!" + ts + "x9";
const mail = (who) => `qa-${who}-${ts}@teste.movva.app`;
const SHOTS = process.env.SHOTS ?? "shots";
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const created = [];
async function step(name, fn) {
  const t0 = Date.now();
  try { const info = await fn(); results.push({ ok: true, name, info: info ?? "", ms: Date.now() - t0 }); console.log("✅", name, info ?? ""); }
  catch (e) { results.push({ ok: false, name, info: String(e.message ?? e).split("\n")[0].slice(0, 220), ms: Date.now() - t0 }); console.log("❌", name, String(e.message ?? e).split("\n")[0]); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

async function makeUser(who, patch) {
  const { data, error } = await admin.auth.admin.createUser({ email: mail(who), password: PW, email_confirm: true, user_metadata: { name: `QA ${who}` } });
  if (error) throw error;
  created.push(data.user.id);
  if (patch) { const { error: e2 } = await admin.from("profiles").update(patch).eq("id", data.user.id); if (e2) throw e2; }
  return data.user.id;
}
async function login(page, who) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', mail(who));
  await page.fill('input[name="password"]', PW);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}
async function noOverflow(page, label) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  if (sw > iw + 1) throw new Error(`${label}: rolagem horizontal (${sw}px > ${iw}px)`);
}

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"] };
let cityId, adminId, p1Id, p2Id, studentId;

try {
  // ---------- preparação ----------
  await step("Setup: cidade São Paulo ativa", async () => {
    const { data } = await admin.from("cities").select("id").eq("name", "São Paulo").eq("state", "SP").maybeSingle();
    if (data) { cityId = data.id; await admin.from("cities").update({ active: true }).eq("id", cityId); return "já existia"; }
    const { data: c, error } = await admin.from("cities").insert({ name: "São Paulo", state: "SP", active: true }).select().single();
    if (error) throw error; cityId = c.id; return "criada";
  });
  await step("Setup: admin, 2 personais (SP)", async () => {
    adminId = await makeUser("admin", { role: "admin" });
    const pers = { role: "personal", city_id: cityId, commission_pct: 70, max_students: 50, accepts_online: true, accepts_presencial: true, active: true, contract_signed_at: "2026-11-19", pix_key: "qa@pix", cref: "000-G/SP", cpf: "000" };
    p1Id = await makeUser("personal1", { ...pers, name: "QA Personal Um" });
    p2Id = await makeUser("personal2", { ...pers, name: "QA Personal Dois" });
  });

  const ctxS = await browser.newContext(phone); const s = await ctxS.newPage();
  const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const a = await ctxA.newPage();
  const ctxP = await browser.newContext({ ...devices["iPad (gen 7)"] }); const p = await ctxP.newPage();

  // ---------- jornada do aluno ----------
  await step("Landing (celular): planos visíveis e sem rolagem lateral", async () => {
    await s.goto(BASE); await s.getByText("Planos", { exact: true }).waitFor();
    expect(await s.getByText("Quero esse plano").count() >= 3, "faltam botões de plano");
    await noOverflow(s, "landing"); await s.screenshot({ path: `${SHOTS}/01-landing-celular.png`, fullPage: true });
  });
  await step("Cadastro de aluno (celular) com cidade", async () => {
    await s.goto(`${BASE}/login`);
    await s.getByText("Não tem conta? Cadastre-se").click();
    await s.fill('input[name="name"]', "QA Aluna Teste");
    await s.fill('input[name="phone"]', "11999990000");
    await s.selectOption('select[name="city_id"]', cityId);
    await s.fill('input[name="email"]', mail("aluna")); await s.fill('input[name="password"]', PW);
    await s.getByRole("button", { name: "Criar conta" }).click();
    await s.waitForURL(/\/app\/planos/, { timeout: 20000 });
    const { data } = await admin.from("profiles").select("*").eq("email", mail("aluna")).single();
    studentId = data.id; created.push(studentId);
    expect(data.city_id === cityId, "cidade não gravada"); expect(data.role === "aluno", "papel errado");
    await noOverflow(s, "planos"); await s.screenshot({ path: `${SHOTS}/02-planos-celular.png`, fullPage: true });
    return "foi para /app/planos";
  });
  await step("Assinar sem Mercado Pago configurado mostra aviso (sem erro)", async () => {
    await s.getByRole("button", { name: "Assinar" }).first().click();
    await s.getByText("finalizando a ativação dos pagamentos").waitFor({ timeout: 15000 });
  });
  await step("Aluno sem plano não acessa o app nem o admin", async () => {
    await s.goto(`${BASE}/app/evolucao`); expect(s.url().includes("/app/planos"), "deveria voltar p/ planos: " + s.url());
    await s.goto(`${BASE}/admin`); expect(!s.url().includes("/admin"), "aluno entrou no admin!");
    await s.goto(`${BASE}/personal`); expect(!new URL(s.url()).pathname.startsWith("/personal"), "aluno entrou no painel do personal!");
  });

  // ---------- admin libera cortesia ----------
  await step("Admin: login e visão geral", async () => {
    await login(a, "admin"); expect(a.url().includes("/admin"), "admin não caiu no /admin: " + a.url());
    await a.getByText("Visão geral").waitFor(); await a.screenshot({ path: `${SHOTS}/03-admin-desktop.png`, fullPage: true });
  });
  await step("Admin: tornar a aluna cortesia e definir o personal", async () => {
    await a.goto(`${BASE}/admin/alunos/${studentId}`);
    await a.getByRole("button", { name: "🎁 Tornar cortesia" }).click(); await a.getByText("Acesso atualizado").waitFor();
    await a.selectOption('select[name="personal_id"]', p1Id);
    await a.fill('input[name="comp_until"]', "2027-02-19");
    await a.getByRole("button", { name: "Salvar", exact: true }).click(); await a.getByText("Dados salvos").waitFor();
    const { data } = await admin.from("profiles").select("*").eq("id", studentId).single();
    expect(data.is_comp && data.sub_status === "active", "cortesia não ativou");
    expect(data.personal_id === p1Id, "personal não atribuído"); expect(!!data.plan, "PLANO FICOU VAZIO depois de salvar"); expect(data.comp_until === "2027-02-19", "validade não gravada");
  });
  await step("Admin: criar código promocional para a influenciadora", async () => {
    await a.goto(`${BASE}/admin/cupons`);
    const code = ("QA" + ts).toUpperCase().slice(0, 14);
    await a.fill('form input[name="code"]', code);
    await a.selectOption('select[name="influencer_id"]', studentId);
    await a.fill('input[name="signups_per_bonus"]', "5");
    await a.getByRole("button", { name: "Salvar código" }).click(); await a.getByText(`Código ${code} salvo`).waitFor();
    const r = await fetch(`${BASE}/c/${code}`, { redirect: "manual" });
    expect(r.status >= 300 && r.status < 400 && (r.headers.get("location") ?? "").includes(`cupom=${code}`), "link /c/ não redireciona com cupom");
    return code;
  });
  await step("Admin: telas Alunos, Personais, Cidades, Financeiro abrem", async () => {
    for (const path of ["/admin/alunos?f=cortesias", "/admin/personais", `/admin/personais/${p1Id}`, "/admin/cidades", "/admin/financeiro", "/admin/alunos/novo"]) {
      const r = await a.goto(BASE + path); expect(r.ok(), `${path} -> ${r.status()}`);
      expect(!(await a.getByText("Application error").count()), `${path} quebrou`);
    }
    expect(await a.goto(`${BASE}/admin/alunos?f=cortesias`).then(() => a.getByText("QA Aluna Teste").count()) > 0, "aluna não aparece em Cortesias");
  });

  // ---------- anamnese ----------
  await step("Aluna: é levada à anamnese e preenche tudo (celular)", async () => {
    await s.goto(`${BASE}/app`); await s.waitForURL(/\/app\/anamnese/);
    for (const sel of await s.locator("select[required]").all()) { const opts = await sel.locator("option:not([disabled])").all(); await sel.selectOption({ index: 1 }); void opts; }
    const radios = await s.locator('input[type="radio"][value="Não"]').all();
    for (const r of radios) await r.check({ force: true });
    for (const inp of await s.locator('input[required]:not([type="radio"]):not([type="checkbox"]), textarea[required]').all()) {
      const t = await inp.getAttribute("type");
      await inp.fill(t === "date" ? "1995-05-10" : t === "number" ? "65" : "Resposta de teste do QA");
    }
    await s.locator('input[name="terms"]').check();
    await s.screenshot({ path: `${SHOTS}/04-anamnese-celular.png`, fullPage: true }); await noOverflow(s, "anamnese");
    await s.getByRole("button", { name: /Enviar e começar/ }).click();
    await s.waitForURL(/bemvindo=1/, { timeout: 20000 });
    const { data } = await admin.from("anamneses").select("answers").eq("student_id", studentId).single();
    expect(data?.answers?.heart === "Não", "anamnese não gravou");
  });

  // ---------- personal ----------
  await step("Personal (tablet): vê a aluna com selo cortesia e 'montar treino'", async () => {
    await login(p, "personal1"); expect(p.url().includes("/personal"), "personal não caiu no /personal");
    await p.getByText("QA Aluna Teste").waitFor();
    expect(await p.getByText("🎁 cortesia").count() > 0, "sem selo de cortesia");
    expect(await p.getByText("montar treino").count() > 0, "sem pendência montar treino");
    await noOverflow(p, "painel personal"); await p.screenshot({ path: `${SHOTS}/05-personal-tablet.png`, fullPage: true });
  });
  await step("Personal: publica treino individual", async () => {
    await p.goto(`${BASE}/personal/aluno/${studentId}?tab=treino`);
    const form = p.locator("form", { has: p.getByRole("button", { name: "Adicionar treino" }) });
    await form.locator('input[name="title"]').fill("Treino A QA");
    await form.locator('textarea[name="exercises"]').fill("Agachamento | 4x10 | 60s | https://youtu.be/x\nSupino | 3x12 | 45s");
    await form.getByRole("button", { name: "Adicionar treino" }).click();
    await p.getByText("Treino A QA").first().waitFor();
    const { data } = await admin.from("workouts").select("exercises").eq("student_id", studentId);
    expect(data?.length === 1 && data[0].exercises.length === 2, "treino não salvou certo");
  });
  await step("Personal: manda mensagem no chat", async () => {
    await p.goto(`${BASE}/personal/aluno/${studentId}?tab=chat`);
    await p.fill('input[name="body"]', "Oi! Treino publicado, qualquer dúvida me chama.");
    await p.getByRole("button", { name: "Enviar" }).click();
    await p.getByText("Treino publicado, qualquer dúvida").waitFor();
  });

  // ---------- aluna usa o app ----------
  await step("Aluna: vê o treino e marca como concluído", async () => {
    await s.goto(`${BASE}/app`); await s.getByText("Treino A QA").first().waitFor();
    await s.fill('input[name="note"]', "Fiz com 20kg");
    await s.getByRole("button", { name: "Concluí o treino" }).click(); await s.getByText("Treino concluído").waitFor();
    await noOverflow(s, "treino"); await s.screenshot({ path: `${SHOTS}/06-treino-celular.png`, fullPage: true });
  });
  await step("Aluna: lê a mensagem e responde", async () => {
    await s.goto(`${BASE}/app/mensagens`); await s.getByText("Treino publicado, qualquer dúvida").waitFor();
    await s.fill('input[name="body"]', "Obrigada! Posso trocar o supino por flexão?");
    await s.getByRole("button", { name: "Enviar" }).click(); await s.getByText("Posso trocar o supino").waitFor();
    await noOverflow(s, "chat"); await s.screenshot({ path: `${SHOTS}/07-chat-celular.png`, fullPage: true });
  });
  await step("Aluna: envia check-in semanal", async () => {
    await s.goto(`${BASE}/app/evolucao`);
    await s.fill('input[name="weight"]', "64.5"); await s.fill('input[name="energy"]', "4");
    await s.fill('textarea[name="feedback"]', "Semana boa, dor leve no ombro.");
    await s.getByRole("button", { name: "Enviar ao personal" }).click(); await s.getByText("Aguardando resposta do personal").waitFor();
    expect(await s.getByText("Check-in da semana enviado").count() > 0, "não bloqueou 2º check-in na semana");
    await s.screenshot({ path: `${SHOTS}/08-evolucao-celular.png`, fullPage: true });
  });
  await step("Personal: vê mensagem nova e responde o check-in", async () => {
    await p.goto(`${BASE}/personal?f=chat`); await p.getByText("QA Aluna Teste").waitFor();
    await p.goto(`${BASE}/personal/aluno/${studentId}?tab=checkins`);
    await p.fill('textarea[name="reply"]', "Reduza a carga do supino e me avise.");
    await p.getByRole("button", { name: "Responder" }).click(); await p.getByText("Reduza a carga do supino").waitFor();
  });
  await step("Aluna: vê a resposta do check-in e o perfil com personal", async () => {
    await s.goto(`${BASE}/app/evolucao`); await s.getByText("Reduza a carga do supino").waitFor();
    await s.goto(`${BASE}/app/perfil`); await s.getByText("QA Personal Um").waitFor(); expect(await s.getByRole("link", { name: /Dieta/ }).count() > 0, "aba Dieta sumiu (plano vazio?)");
  });

  // ---------- segurança (regras do banco) ----------
  await step("Segurança: aluna NÃO consegue se dar plano/papel nem ver outros", async () => {
    const c = createClient(URL_SB, ANON, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: mail("aluna"), password: PW });
    const up = await c.from("profiles").update({ role: "admin", sub_status: "active", is_comp: true }).eq("id", studentId);
    const { data: me } = await admin.from("profiles").select("role").eq("id", studentId).single();
    expect(me.role === "aluno", "ALUNA VIROU ADMIN!"); void up;
    const { data: others } = await c.from("profiles").select("id");
    expect(others.every((o) => o.id === studentId || o.id === p1Id), "aluna enxerga perfis de outras pessoas");
    const { data: pays } = await c.from("payments").select("id"); expect((pays ?? []).length === 0, "aluna vê pagamentos");
    const ins = await c.from("messages").insert({ student_id: studentId, from_personal: true, body: "fake" });
    expect(ins.error, "aluna conseguiu mandar mensagem como personal");
    return `${others.length} perfis visíveis (ela + personal)`;
  });
  await step("Segurança: outro personal NÃO vê dados da aluna", async () => {
    const c = createClient(URL_SB, ANON, { auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: mail("personal2"), password: PW });
    const [an, wk, msg, prof] = await Promise.all([
      c.from("anamneses").select("student_id").eq("student_id", studentId),
      c.from("workouts").select("id").eq("student_id", studentId),
      c.from("messages").select("id").eq("student_id", studentId),
      c.from("profiles").select("id").eq("id", studentId),
    ]);
    expect(!an.data?.length && !wk.data?.length && !msg.data?.length && !prof.data?.length, "personal 2 enxerga dados da aluna do personal 1!");
    const w = await c.from("workouts").insert({ student_id: studentId, title: "invasão", exercises: [] });
    expect(w.error, "personal 2 conseguiu criar treino para aluna de outro");
  });
  await step("Segurança: visitante anônimo não lê nada sensível", async () => {
    const c = createClient(URL_SB, ANON, { auth: { persistSession: false } });
    for (const t of ["profiles", "anamneses", "messages", "payments", "workouts", "checkins"]) {
      const { data } = await c.from(t).select("*").limit(1); expect(!data?.length, `anônimo lê ${t}`);
    }
    const { data: cities } = await c.from("cities").select("*"); expect(cities?.length, "cidades deveriam ser públicas");
  });
  await step("Segurança: webhook recusa chamada sem assinatura", async () => {
    const r = await fetch(`${BASE}/api/mp/webhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "subscription_preapproval", data: { id: "123" } }) });
    expect(r.status === 401 || r.status === 500, `status ${r.status}`); return `status ${r.status}`;
  });

  // ---------- responsividade ----------
  await step("Responsivo: páginas sem rolagem lateral em 360px, 768px e 1280px", async () => {
    const sizes = [[360, 740], [768, 1024], [1280, 800]];
    const bad = [];
    for (const [w, h] of sizes) {
      for (const [ctx, paths] of [[ctxS, ["/app", "/app/evolucao", "/app/mensagens", "/app/perfil", "/termos"]], [ctxP, ["/personal", `/personal/aluno/${studentId}?tab=anamnese`, "/personal/ganhos"]], [ctxA, ["/admin", "/admin/alunos", "/admin/financeiro", "/admin/cupons", `/admin/alunos/${studentId}`]]]) {
        const pg = await ctx.newPage(); await pg.setViewportSize({ width: w, height: h });
        for (const path of paths) {
          await pg.goto(BASE + path);
          const { sw, iw } = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
          if (sw > iw + 1) bad.push(`${path}@${w}px (${sw})`);
        }
        if (w === 360) await pg.screenshot({ path: `${SHOTS}/09-${paths[0].replace(/\W/g, "")}-360.png`, fullPage: true });
        await pg.close();
      }
    }
    expect(!bad.length, "rolagem lateral em: " + bad.join(", "));
  });
  await step("PWA: manifesto e ícones disponíveis", async () => {
    const m = await (await fetch(`${BASE}/manifest.webmanifest`)).json();
    expect(m.icons?.length >= 3 && m.display === "standalone", "manifesto incompleto");
    for (const i of m.icons) { const r = await fetch(BASE + i.src); expect(r.ok, `ícone ${i.src} ${r.status}`); }
  });
} finally {
  // ---------- limpeza ----------
  await step("Limpeza: apagar usuários de teste", async () => {
    await admin.from("promo_codes").delete().in("influencer_id", created);
    for (const id of created) await admin.from("profiles").update({ personal_id: null }).eq("personal_id", id);
    let n = 0; for (const id of [...new Set(created)]) { const { error } = await admin.auth.admin.deleteUser(id); if (!error) n++; else console.log("del", error.message); }
    return `${n} removidos`;
  });
  await browser.close();
  fs.writeFileSync("results.json", JSON.stringify(results, null, 2));
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== ${results.length - fail}/${results.length} passaram ===`);
}
