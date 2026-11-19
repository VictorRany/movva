import { cookies } from "next/headers";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import PlanCards from "@/components/PlanCards";
import { findCode } from "@/lib/promo";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  ["Escolha o plano", "Assinatura mensal no Pix ou cartão. Sem fidelidade."],
  ["Conte sua rotina", "Anamnese com objetivo, horários, lesões e alimentação."],
  ["Receba seu treino", "Montado à mão pelo seu personal em até 3 dias úteis."],
  ["Evolua com ajuste", "Check-in toda semana e chat direto com quem te acompanha."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ cupom?: string }> }) {
  const { cupom } = await searchParams;
  const promo = await findCode(cupom ?? (await cookies()).get("promo")?.value ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="overflow-hidden">
      <Header right={<a href={user ? "/app" : "/login"} className="btn-ghost">{user ? "Meu treino" : "Entrar"}</a>} />

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:pt-16">
        <span className="pointer-events-none absolute -right-24 top-0 hidden sm:block h-[120%] w-64 -skew-x-[20deg] bg-gold/90 sm:-right-10 sm:w-80" aria-hidden />
        <span className="pointer-events-none absolute -right-4 top-0 hidden sm:block h-[120%] w-10 -skew-x-[20deg] bg-cream/90 sm:right-80" aria-hidden />
        <div className="relative max-w-2xl">
          <p className="eyebrow">Presencial em SP · Online em todo o Brasil</p>
          <h1 className="mt-4 text-6xl leading-[0.9] sm:text-8xl">Seu personal.<br /><span className="text-gold">Do seu jeito.</span></h1>
          <p className="mt-6 max-w-lg text-lg text-muted">Treino montado à mão para o seu corpo, sua rotina e seu objetivo. Nutrição e acompanhamento de verdade, com um profissional que responde.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#planos" className="btn text-base">Ver planos</a>
            <a href="#como-funciona" className="btn-ghost text-base">Como funciona</a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-navy-3 pt-6">
            {[["100%", "individual"], ["3 dias", "para o 1º treino"], ["24h", "para responder"]].map(([v, l]) => (
              <div key={l}><dt className="num text-3xl font-bold text-cream">{v}</dt><dd className="text-xs uppercase tracking-wider text-muted">{l}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-navy-3 bg-navy-2/60">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-3xl sm:text-4xl">Como funciona</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="num text-5xl font-bold leading-none text-gold">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="mt-1 text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-3xl sm:text-4xl">Planos</h2>
          <p className="flex items-center gap-2 text-sm text-muted"><Icon name="calendar" size={16} />Mensal, cancele quando quiser</p>
        </div>
        {promo && (
          <p className="mb-6 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm">
            <Icon name="ticket" className="text-gold" />Código <b>{promo.code}</b> ativado{Number(promo.discount_pct) > 0 ? `: ${Number(promo.discount_pct)}% de desconto` : ""}. Ele é aplicado quando você assinar.
          </p>
        )}
        <PlanCards loggedIn={!!user} promo={promo} />
      </section>

      <footer className="border-t border-navy-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
          <span>© Movva · @movvabr_</span>
          <nav className="flex gap-5"><a href="/termos" className="hover:text-cream">Termos</a><a href="/privacidade" className="hover:text-cream">Privacidade</a></nav>
        </div>
      </footer>
    </main>
  );
}
