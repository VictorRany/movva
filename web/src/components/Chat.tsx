type Msg = { id: string; from_personal: boolean; body: string; created_at: string };

export default function Chat({ messages, mine, action, hidden }: {
  messages: Msg[]; mine: "personal" | "aluno"; action: (f: FormData) => Promise<void>; hidden?: Record<string, string>;
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
        {!messages.length && <p className="text-sm text-muted">Nenhuma mensagem ainda.</p>}
        {messages.map((m) => {
          const isMine = (mine === "personal") === m.from_personal;
          return (
            <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMine ? "self-end bg-gold text-navy" : "self-start bg-navy-3"}`}>
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-[10px] ${isMine ? "text-navy/60" : "text-muted"}`}>{new Date(m.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
            </div>
          );
        })}
      </div>
      <form action={action} className="flex gap-2">
        {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="body" required placeholder="Escreva uma mensagem…" className="input" autoComplete="off" />
        <button className="btn shrink-0">Enviar</button>
      </form>
    </div>
  );
}
