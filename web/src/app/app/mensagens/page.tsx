import Chat from "@/components/Chat";
import StudentShell from "@/components/StudentShell";
import { requireStudent } from "@/lib/student";
import { sendMessage } from "../actions";

export default async function Mensagens() {
  const { supabase, user, plan, personal } = await requireStudent();
  const { data: messages } = await supabase.from("messages").select("*").eq("student_id", user.id).order("created_at");
  await supabase.from("messages").update({ read: true }).eq("student_id", user.id).eq("from_personal", true).eq("read", false);
  return (
    <StudentShell nutrition={plan?.nutrition}>
      <h1 className="mb-1 text-2xl font-bold">Fale com {personal?.name?.split(" ")[0] ?? "seu personal"}</h1>
      <p className="mb-4 text-sm text-muted">Dúvidas de exercício, dieta ou rotina. Respostas em até 24h úteis.</p>
      <Chat messages={messages ?? []} mine="aluno" action={sendMessage} />
    </StudentShell>
  );
}
