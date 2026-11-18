import Header from "@/components/Header";

export const metadata = { title: "Termos de Uso | Movva" };

export default function Termos() {
  return (
    <main><Header />
      <article className="mx-auto max-w-2xl space-y-4 px-4 pb-16 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold">Termos de Uso</h1>
        <p className="rounded-xl bg-gold/10 p-3 text-gold">⚠ Modelo inicial — revise com um advogado antes do lançamento.</p>
        <h2 className="font-bold">1. O serviço</h2>
        <p>A Movva oferece consultoria de treinamento físico e orientação nutricional, presencial ou online, mediante assinatura mensal. Os treinos são elaborados individualmente por profissional de Educação Física com registro no CREF.</p>
        <h2 className="font-bold">2. Saúde e responsabilidade</h2>
        <p>O aluno declara que as informações da anamnese são verdadeiras e se compromete a buscar avaliação médica antes de iniciar ou sempre que houver qualquer condição de saúde. O aluno deve interromper o exercício e procurar atendimento caso sinta dor, tontura ou mal-estar.</p>
        <h2 className="font-bold">3. Assinatura e cancelamento</h2>
        <p>A cobrança é mensal e recorrente via Mercado Pago. O cancelamento pode ser feito a qualquer momento pelo app, interrompendo as próximas cobranças. Conforme o Código de Defesa do Consumidor, compras online podem ser canceladas em até 7 dias com reembolso integral.</p>
        <h2 className="font-bold">4. Uso do conteúdo</h2>
        <p>Treinos, dietas e materiais são de uso pessoal e intransferível, sendo proibida sua revenda ou distribuição.</p>
        <h2 className="font-bold">5. Atendimento</h2>
        <p>As mensagens são respondidas em até 24h úteis. Para dúvidas, fale com a gente pelo chat do app ou pelo Instagram @movvabr_.</p>
      </article>
    </main>
  );
}
