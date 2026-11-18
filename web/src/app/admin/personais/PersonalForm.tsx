type City = { id: string; name: string; state: string; active: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PersonalForm({ p, cities, action, isNew }: { p?: any; cities: City[]; action: (f: FormData) => Promise<void>; isNew?: boolean }) {
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div><label className="label">Nome completo *</label><input name="name" required defaultValue={p?.name} className="input" /></div>
      {isNew ? <div><label className="label">E-mail (recebe o convite) *</label><input name="email" type="email" required className="input" /></div>
        : <div><label className="label">E-mail</label><input disabled value={p?.email ?? ""} className="input opacity-60" /></div>}
      <div><label className="label">WhatsApp *</label><input name="phone" required defaultValue={p?.phone} className="input" /></div>
      <div><label className="label">CPF / CNPJ *</label><input name="cpf" required defaultValue={p?.cpf} className="input" /></div>
      <div><label className="label">CREF *</label><input name="cref" required defaultValue={p?.cref} placeholder="000000-G/SP" className="input" /></div>
      <div><label className="label">Chave Pix *</label><input name="pix_key" required defaultValue={p?.pix_key} className="input" /></div>
      <div><label className="label">Cidade base</label>
        <select name="city_id" defaultValue={p?.city_id ?? ""} className="input">
          <option value="">— só online —</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}/{c.state}{!c.active && " (inativa)"}</option>)}
        </select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Comissão (%) *</label><input name="commission_pct" type="number" step="0.01" min={0} max={100} required defaultValue={p?.commission_pct ?? 70} className="input" /></div>
        <div><label className="label">Máx. alunos *</label><input name="max_students" type="number" min={1} required defaultValue={p?.max_students ?? 50} className="input" /></div>
      </div>
      <div><label className="label">Contrato assinado em</label><input name="contract_signed_at" type="date" defaultValue={p?.contract_signed_at ?? ""} className="input" /></div>
      <div className="flex flex-wrap items-end gap-4 pb-3 text-sm">
        <label className="flex gap-2"><input type="checkbox" name="accepts_online" defaultChecked={p?.accepts_online ?? true} /> Atende online</label>
        <label className="flex gap-2"><input type="checkbox" name="accepts_presencial" defaultChecked={p?.accepts_presencial ?? true} /> Atende presencial</label>
        {!isNew && <label className="flex gap-2"><input type="checkbox" name="active" defaultChecked={p?.active} /> Ativo (recebe alunos)</label>}
      </div>
      <button className="btn md:col-span-2">{isNew ? "Cadastrar e enviar convite" : "Salvar alterações"}</button>
    </form>
  );
}
