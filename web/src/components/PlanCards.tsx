import { PLANS, brl } from "@/lib/plans";
import { subscribe } from "@/app/assinar/actions";

export default function PlanCards({ loggedIn, presencialOk = true, promo }: { loggedIn: boolean; presencialOk?: boolean; promo?: { code: string; discount_pct: number } | null }) {
  const off = Number(promo?.discount_pct ?? 0);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((p) => {
        const blocked = loggedIn && p.modality === "presencial" && !presencialOk;
        return (
          <div key={p.id} className={`card flex flex-col ${p.highlight ? "border-gold" : ""}`}>
            {p.highlight && <span className="mb-2 w-fit rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">MAIS ESCOLHIDO</span>}
            <p className="text-xs font-semibold tracking-widest text-muted">{p.modality === "presencial" ? "PRESENCIAL" : "ONLINE"}</p>
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="text-sm text-muted">{p.tagline}</p>
            <p className="my-4 text-3xl font-extrabold">
              {off > 0 && <span className="mr-2 text-base font-normal text-muted line-through">{brl(p.price)}</span>}
              {brl(+(p.price * (1 - off / 100)).toFixed(2))}<span className="text-base font-normal text-muted">/mês</span></p>
            <ul className="mb-6 space-y-2 text-sm">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            {blocked ? (
              <p className="mt-auto rounded-xl bg-navy p-3 text-center text-sm text-muted">Ainda não temos personal presencial na sua cidade. Em breve!</p>
            ) : loggedIn ? (
              <form action={subscribe} className="mt-auto">
                <input type="hidden" name="plan" value={p.id} />
                <input name="promo" defaultValue={promo?.code ?? ""} placeholder="Código promocional (opcional)" className="input mb-2 py-2 text-sm uppercase" />
                <button className="btn w-full">Assinar</button>
              </form>
            ) : (
              <a href={`/login?plan=${p.id}`} className="btn mt-auto w-full">Quero esse plano</a>
            )}
          </div>
        );
      })}
    </div>
  );
}
