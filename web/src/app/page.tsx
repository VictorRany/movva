import Header from "@/components/Header";
import PlanCards from "@/components/PlanCards";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main>
      <Header right={<a href={user ? "/app" : "/login"} className="btn-ghost">{user ? "Meu treino" : "Entrar"}</a>} />
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <p className="mb-3 text-sm font-semibold tracking-widest text-gold">PRESENCIAL EM SP · ONLINE TODO O BRASIL</p>
        <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">Seu personal trainer,<br />presencial ou online.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">Treino 100% individual + nutrição, com acompanhamento real de um profissional. Nada de planilha genérica.</p>
        <a href="#planos" className="btn mt-8">Escolher meu plano</a>
      </section>
      <section className="mx-auto grid max-w-5xl gap-4 px-4 md:grid-cols-3">
        {[
          ["1. Escolha o plano", "Assine em 1 minuto com Pix ou cartão."],
          ["2. Conte seus objetivos", "Seu personal monta o treino só pra você."],
          ["3. Treine e evolua", "Treino no app, check-in semanal e ajustes."],
        ].map(([t, d]) => (
          <div key={t} className="card"><h3 className="font-bold text-gold">{t}</h3><p className="mt-1 text-muted">{d}</p></div>
        ))}
      </section>
      <section id="planos" className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold">Planos</h2>
        <PlanCards loggedIn={!!user} />
        <p className="mt-6 text-center text-sm text-muted">Assinatura mensal. Cancele quando quiser.</p>
      </section>
      <footer className="space-x-4 py-10 text-center text-sm text-muted"><span>© Movva · @movvabr_</span><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a></footer>
    </main>
  );
}
