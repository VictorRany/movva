import Header from "@/components/Header";

export const metadata = { title: "Privacidade | Movva" };

export default function Privacidade() {
  return (
    <main><Header />
      <article className="mx-auto max-w-2xl space-y-4 px-4 pb-16 text-sm leading-relaxed">
        <h1 className="text-2xl font-bold">Política de Privacidade</h1>
        <p className="rounded-xl bg-gold/10 p-3 text-gold">⚠ Modelo inicial — revise com um advogado antes do lançamento.</p>
        <p>Em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018):</p>
        <h2 className="font-bold">Dados que coletamos</h2>
        <p>Nome, e-mail, WhatsApp, respostas da anamnese (incluindo dados de saúde, que são dados sensíveis), registros de treino, check-ins e mensagens. Os dados de pagamento são processados diretamente pelo Mercado Pago; não armazenamos dados de cartão.</p>
        <h2 className="font-bold">Para que usamos</h2>
        <p>Exclusivamente para montar e acompanhar seu treino e plano alimentar, com seu consentimento expresso dado ao aceitar estes termos na anamnese.</p>
        <h2 className="font-bold">Quem tem acesso</h2>
        <p>Apenas você e os profissionais da Movva responsáveis pelo seu acompanhamento. Não vendemos nem compartilhamos seus dados.</p>
        <h2 className="font-bold">Seus direitos</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo chat do app.</p>
      </article>
    </main>
  );
}
