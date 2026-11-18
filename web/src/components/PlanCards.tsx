import { PLANS, brl } from "@/lib/plans";
import { subscribe } from "@/app/assinar/actions";

export default function PlanCards({ loggedIn, presencialOk = true }: { loggedIn: boolean; presencialOk?: boolean }) {
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
            <p className="my-4 text-3xl font-extrabold">{brl(p.price)}<span className="text-base font-normal text-muted">/mês</span></p>
            <ul className="mb-6 space-y-2 text-sm">{p.features.map((f) => <li key={f}>✓ {f}</li>)}</ul>
            {blocked ? (
              <p className="mt-auto rounded-xl bg-navy p-3 text-center text-sm text-muted">Ainda não temos personal presencial na sua cidade. Em breve!</p>
            ) : loggedIn ? (
              <form action={subscribe} className="mt-auto">
                <input type="hidden" name="plan" value={p.id} />
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
