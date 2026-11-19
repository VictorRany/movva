import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { ANAMNESE, type Field } from "@/lib/anamnese";
import { requireUser } from "@/lib/supabase/server";
import { saveAnamnese } from "../actions";

function Input({ f, v }: { f: Field; v: unknown }) {
  const val = (v as string) ?? "";
  if (f.type === "textarea") return <textarea name={f.key} required={f.required} rows={3} defaultValue={val} placeholder={f.placeholder} className="input" />;
  if (f.type === "select") return (
    <select name={f.key} required={f.required} defaultValue={val} className="input">
      <option value="" disabled>Selecione…</option>
      {f.options!.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
  if (f.type === "yesno" || f.type === "multi") {
    const opts = f.type === "yesno" ? ["Não", "Sim"] : f.options!;
    const sel = Array.isArray(v) ? v : [val];
    return (
      <div className="flex flex-wrap gap-2">
        {opts.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type={f.type === "yesno" ? "radio" : "checkbox"} name={f.key} value={o} required={f.required && f.type === "yesno"} defaultChecked={sel.includes(o)} className="peer sr-only" />
            <span className="block rounded-full border border-navy-3 px-4 py-2 text-sm peer-checked:border-gold peer-checked:bg-gold peer-checked:text-navy">{o}</span>
          </label>
        ))}
      </div>
    );
  }
  return <input name={f.key} type={f.type} step={f.type === "number" ? "0.1" : undefined} required={f.required} defaultValue={val} placeholder={f.placeholder} className="input" />;
}

export default async function Anamnese() {
  const { supabase, user, profile } = await requireUser();
  if (profile?.sub_status !== "active") redirect("/app/planos");
  const { data } = await supabase.from("anamneses").select("answers").eq("student_id", user.id).single();
  const a = (data?.answers ?? {}) as Record<string, unknown>;
  const sections = ANAMNESE;

  return (
    <main><Header />
      <form action={saveAnamnese} className="mx-auto max-w-2xl space-y-6 px-4 pb-16">
        <div>
          <p className="text-sm font-semibold tracking-widest text-gold">{data ? "ATUALIZAR" : "PASSO FINAL"}</p>
          <h1 className="text-3xl font-bold">Anamnese</h1>
          <p className="mt-1 text-muted">Leva uns 5 minutos. Quanto mais detalhes, mais individual fica o seu treino.</p>
        </div>
        {sections.map((s, i) => (
          <section key={s.title} className="card space-y-4">
            <div><h2 className="text-lg font-bold"><span className="text-gold">{i + 1}.</span> {s.title}</h2>
              {s.description && <p className="text-sm text-muted">{s.description}</p>}</div>
            {s.fields.map((f) => (
              <div key={f.key}><label className="label">{f.label}{f.required && <span className="text-gold"> *</span>}</label><Input f={f} v={a[f.key]} /></div>
            ))}
          </section>
        ))}
        <label className="card flex cursor-pointer gap-3 text-sm">
          <input type="checkbox" name="terms" required defaultChecked={!!data} className="mt-1 accent-[var(--color-gold)]" />
          <span>Declaro que as informações são verdadeiras e li e aceito os <a href="/termos" target="_blank" className="text-gold underline">Termos de Uso</a> e a <a href="/privacidade" target="_blank" className="text-gold underline">Política de Privacidade</a>. Estou ciente de que devo procurar liberação médica caso tenha alguma condição de saúde.</span>
        </label>
        <button className="btn w-full text-lg">{data ? "Salvar alterações" : "Enviar e começar "}</button>
      </form>
    </main>
  );
}
