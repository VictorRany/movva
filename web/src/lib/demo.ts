// Modo demonstração: ativo quando o Supabase ainda não foi configurado.
// Simula o banco em memória para navegar pelas telas. Reinicia quando o servidor reinicia.
export const IS_DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("exemplo");

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const uid = () => crypto.randomUUID();

const personal = (id: string, name: string, city: string, extra: Row = {}) => ({
  id, name, email: `${id}@movva.com`, role: "personal", city_id: city, phone: "11900000000", cpf: "000.000.000-00", cref: "000000-G/SP",
  pix_key: `${id}@pix.com`, commission_pct: 70, max_students: 50, accepts_online: true, accepts_presencial: true,
  active: true, contract_signed_at: ago(60).slice(0, 10), sub_status: "inactive", created_at: ago(60), ...extra,
});
const aluno = (id: string, name: string, plan: string | null, status: string, personalId: string | null, days: number, city = "sp") => ({
  id, name, email: `${id}@email.com`, role: "aluno", plan, sub_status: status, personal_id: personalId, city_id: city, phone: "11988887777",
  mp_preapproval_id: plan ? `pre-${id}` : null, assigned_at: personalId ? ago(days) : null, created_at: ago(days),
});
const pay = (n: number, student: string, personalId: string, plan: string, amount: number, days: number, payoutId: string | null = null) => ({
  id: uid(), mp_payment_id: `mp-${n}`, student_id: student, personal_id: personalId, plan, amount, commission_pct: 70,
  personal_amount: +(amount * 0.7).toFixed(2), status: "approved", paid_at: ago(days), payout_id: payoutId,
});

const g = globalThis as unknown as { __movvaDb3?: Record<string, Row[]> };
const db: Record<string, Row[]> = (g.__movvaDb3 ??= {
  cities: [
    { id: "sp", name: "São Paulo", state: "SP", active: true, created_at: ago(90) },
    { id: "cps", name: "Campinas", state: "SP", active: false, created_at: ago(10) },
    { id: "rj", name: "Rio de Janeiro", state: "RJ", active: false, created_at: ago(5) },
  ],
  profiles: [
    { id: "admin-1", name: "Admin Movva", role: "admin", sub_status: "inactive", created_at: ago(90) },
    personal("personal-1", "Lucas Personal", "sp"),
    personal("personal-2", "Marina Coach", "sp", { commission_pct: 65, max_students: 30, accepts_presencial: false, contract_signed_at: null, created_at: ago(2) }),
    aluno("aluno-1", "Ana Souza", "online-completo", "active", "personal-1", 40),
    aluno("aluno-2", "Bruno Lima", "online-treino", "active", "personal-1", 1, "rj"),
    aluno("aluno-3", "Carla Mendes", "presencial-sp", "active", "personal-1", 45),
    aluno("aluno-4", "Duda Rocha", null, "inactive", null, 0),
    aluno("aluno-5", "Eduardo Prado", "online-treino", "active", "personal-2", 20),
    aluno("aluno-6", "Fernanda Luz", "presencial-sp", "active", null, 0, "rj"),
    { ...aluno("influ-1", "Gabi Fit (influenciadora)", "online-completo", "active", "personal-1", 15), is_comp: true, comp_until: new Date(Date.now() + 75 * 864e5).toISOString().slice(0, 10), comp_note: "@gabifit — 3 stories/mês", mp_preapproval_id: null },
  ],
  promo_codes: [{ code: "GABI", influencer_id: "influ-1", discount_pct: 10, bonus_months: 1, signups_per_bonus: 5, active: true, created_at: ago(15) }],
  payouts: [{ id: "po-1", personal_id: "personal-1", amount: 594.86, note: "Pix ref. mês anterior", paid_at: ago(5) }],
  payments: [
    pay(1, "aluno-1", "personal-1", "online-completo", 249.9, 40, "po-1"),
    pay(2, "aluno-3", "personal-1", "presencial-sp", 599.9, 45, "po-1"),
    pay(3, "aluno-1", "personal-1", "online-completo", 249.9, 10),
    pay(4, "aluno-3", "personal-1", "presencial-sp", 599.9, 15),
    pay(5, "aluno-2", "personal-1", "online-treino", 149.9, 1),
    pay(6, "aluno-5", "personal-2", "online-treino", 149.9, 20),
  ],
  workouts: [
    { id: "w1", student_id: "aluno-1", title: "Treino A — Peito e tríceps", notes: "Foque na cadência: 2s descendo.", position: 0, created_at: ago(10),
      exercises: [
        { name: "Supino reto com halteres", sets: "4x10", rest: "60s", video: "https://youtube.com" },
        { name: "Crucifixo inclinado", sets: "3x12", rest: "45s" },
        { name: "Tríceps corda", sets: "4x12", rest: "45s", video: "https://youtube.com" },
        { name: "Flexão de braço", sets: "3x até a falha", rest: "60s" },
      ] },
    { id: "w2", student_id: "aluno-1", title: "Treino B — Costas e bíceps", notes: null, position: 1, created_at: ago(10),
      exercises: [{ name: "Puxada frontal", sets: "4x10", rest: "60s" }, { name: "Remada curvada", sets: "4x10", rest: "60s" }, { name: "Rosca direta", sets: "3x12", rest: "45s" }] },
    { id: "w3", student_id: "aluno-1", title: "Treino C — Pernas", notes: "Aqueça 10 min na bike.", position: 2, created_at: ago(10),
      exercises: [{ name: "Agachamento livre", sets: "4x8", rest: "90s", video: "https://youtube.com" }, { name: "Leg press", sets: "4x12", rest: "60s" }, { name: "Cadeira extensora", sets: "3x15", rest: "45s" }] },
    { id: "w4", student_id: "aluno-3", title: "Treino Full Body", notes: null, position: 0, created_at: ago(30), exercises: [{ name: "Levantamento terra", sets: "4x6", rest: "120s" }] },
  ],
  workout_logs: [
    { id: uid(), student_id: "aluno-1", workout_id: "w1", note: "Subi a carga no supino!", done_at: ago(1) },
    { id: uid(), student_id: "aluno-1", workout_id: "w2", note: null, done_at: ago(3) },
  ],
  checkins: [
    { id: "c1", student_id: "aluno-1", weight: 65.1, energy: 4, feedback: "Semana boa, só senti um pouco o ombro no supino.", reply: null, created_at: ago(1) },
    { id: "c2", student_id: "aluno-1", weight: 65.6, energy: 3, feedback: "Dieta difícil no fim de semana.", reply: "Normal! Foca em bater a proteína, que já ajuda muito.", created_at: ago(8) },
    { id: "c3", student_id: "aluno-3", weight: 72, energy: 5, feedback: "Energia lá em cima!", reply: null, created_at: ago(2) },
  ],
  anamneses: [
    { student_id: "aluno-1", accepted_terms_at: ago(20), updated_at: ago(20), answers: {
      birth: "1996-04-12", sex: "Feminino", height: "165", weight: "66", profession: "Advogada",
      goal: "Emagrecimento", goal_detail: "Quero perder uns 5 kg e definir glúteos e abdômen até o verão.", body_focus: ["Glúteos", "Abdômen"],
      experience: "Iniciante (menos de 6 meses)", days_week: "4", session_time: "1 hora", place: "Academia", other_sports: "Pilates 1x/semana",
      likes: "Gosto de treino de perna, não gosto de esteira.", heart: "Não", chest_pain: "Não", dizziness: "Não", pressure: "Não", bone: "Sim",
      pregnant: "Não", injuries: "Dor no joelho direito ao agachar fundo.", conditions: "", medications: "Anticoncepcional",
      sleep: "5 a 6h", stress: "Alto", work_activity: "Sentado(a) a maior parte do tempo", alcohol: "Socialmente", smoke: "Não",
      meals_day: "3", water: "1 a 2 L", restrictions: "Intolerância à lactose", food_day: "Café: pão com ovo. Almoço: arroz, feijão, frango. Jantar: lanche.", food_dislikes: "Fígado", supplements: "Whey",
    } },
    { student_id: "aluno-3", accepted_terms_at: ago(40), updated_at: ago(40), answers: {
      birth: "1988-09-30", sex: "Feminino", height: "170", weight: "73", goal: "Ganho de massa muscular", goal_detail: "Ganhar força.",
      experience: "Avançado (mais de 2 anos)", days_week: "5", session_time: "1 hora", place: "Academia", heart: "Não", chest_pain: "Não",
      dizziness: "Não", pressure: "Não", bone: "Não", pregnant: "Não", sleep: "7 a 8h", stress: "Médio", meals_day: "5 ou mais", water: "2 a 3 L", food_day: "Dieta organizada.",
    } },
    { student_id: "aluno-5", accepted_terms_at: ago(19), updated_at: ago(19), answers: { birth: "1990-01-01", sex: "Masculino", weight: "88", goal: "Emagrecimento", heart: "Não", chest_pain: "Não", dizziness: "Não", pressure: "Sim", bone: "Não" } },
  ],
  diets: [
    { student_id: "aluno-1", updated_at: ago(10), notes: "Beba 2,5 L de água por dia. Sem lactose em todas as refeições.", meals: [
      { time: "07:00", name: "Café da manhã", items: "2 ovos mexidos, 1 fatia de pão integral, 1 fruta" },
      { time: "10:00", name: "Lanche", items: "1 iogurte sem lactose + 20 g de castanhas" },
      { time: "12:30", name: "Almoço", items: "120 g de frango, 4 col. de arroz, feijão, salada à vontade" },
      { time: "16:00", name: "Pré-treino", items: "1 banana + 1 scoop de whey isolado" },
      { time: "20:00", name: "Jantar", items: "120 g de peixe ou carne magra, legumes, 1 batata-doce média" },
    ] },
  ],
  messages: [
    { id: uid(), student_id: "aluno-1", from_personal: true, body: "Oi Ana! Seu treino novo já está no app. Qualquer dúvida me chama aqui ", read: true, created_at: ago(10) },
    { id: uid(), student_id: "aluno-1", from_personal: false, body: "Obrigada! No agachamento posso diminuir a amplitude por causa do joelho?", read: false, created_at: ago(0.2) },
  ],
});

type Result = { data: unknown; error: null; count?: number };

class Query implements PromiseLike<Result> {
  private filters: ((r: Row) => boolean)[] = [];
  private sort?: [string, boolean];
  private max?: number;
  private one = false;
  private head = false;
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload?: Row;
  private conflict = "student_id";
  private joins = false;
  constructor(private table: string) {}
  select(cols = "*", opts?: { count?: string; head?: boolean }) { if (this.op !== "select") return this; this.joins = cols.includes("workouts("); this.head = !!opts?.head; return this; }
  insert(row: Row) { this.op = "insert"; this.payload = row; return this; }
  update(row: Row) { this.op = "update"; this.payload = row; return this; }
  delete() { this.op = "delete"; return this; }
  upsert(row: Row, o?: { onConflict?: string; ignoreDuplicates?: boolean }) { this.op = "upsert"; this.payload = row; if (o?.onConflict) this.conflict = o.onConflict; return this; }
  eq(k: string, v: unknown) { this.filters.push((r) => r[k] === v); return this; }
  neq(k: string, v: unknown) { this.filters.push((r) => r[k] !== v); return this; }
  is(k: string, v: unknown) { this.filters.push((r) => (r[k] ?? null) === v); return this; }
  in(k: string, v: unknown[]) { this.filters.push((r) => v.includes(r[k])); return this; }
  gte(k: string, v: string) { this.filters.push((r) => r[k] >= v); return this; }
  order(k: string, o?: { ascending?: boolean }) { this.sort = [k, o?.ascending !== false]; return this; }
  limit(n: number) { this.max = n; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  private run(): Result {
    const rows = db[this.table];
    const now = new Date().toISOString();
    if (this.op === "insert") {
      const row: Row = { id: uid(), created_at: now, ...this.payload };
      if (this.table === "workout_logs") row.done_at ??= now;
      rows.push(row);
      return { data: row, error: null };
    }
    if (this.op === "upsert") {
      const found = rows.find((r) => r[this.conflict] === this.payload![this.conflict]);
      if (found) Object.assign(found, this.payload); else rows.push({ id: uid(), created_at: now, ...this.payload });
      return { data: null, error: null };
    }
    const match = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") { match.forEach((r) => Object.assign(r, this.payload)); return { data: null, error: null }; }
    if (this.op === "delete") { db[this.table] = rows.filter((r) => !match.includes(r)); return { data: null, error: null }; }
    let out = [...match];
    if (this.sort) { const [k, asc] = this.sort; out.sort((a, b) => (a[k] > b[k] ? 1 : -1) * (asc ? 1 : -1)); }
    if (this.max) out = out.slice(0, this.max);
    if (this.joins) out = out.map((r) => ({ ...r, workouts: db.workouts.find((w) => w.id === r.workout_id) }));
    if (this.head) return { data: null, error: null, count: out.length };
    return { data: this.one ? out[0] ?? null : out, error: null, count: out.length };
  }
  then<T1, T2>(ok?: (v: Result) => T1 | PromiseLike<T1>, fail?: (e: unknown) => T2 | PromiseLike<T2>) {
    return Promise.resolve(this.run()).then(ok, fail);
  }
}

export const demoClient = (userId: string | null) => ({
  from: (t: string) => new Query(t),
  auth: {
    getUser: async () => ({ data: { user: userId ? { id: userId, email: `${userId}@demo.movva` } : null } }),
    signOut: async () => ({}),
    resetPasswordForEmail: async (email: string) => { console.log(`[email simulado] link de acesso para ${email}`); return { error: null }; },
    admin: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      generateLink: async (_: Row) => ({ data: null, error: null }),
      inviteUserByEmail: async (email: string, o: { data: Row }) => {
        const id = uid();
        db.profiles.push({ id, email, role: "aluno", sub_status: "inactive", created_at: new Date().toISOString(), name: o.data.name, phone: o.data.phone });
        return { data: { user: { id } }, error: null };
      },
    },
  },
});
