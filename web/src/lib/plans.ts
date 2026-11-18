// Edite nomes, preços e benefícios aqui.
// ATENÇÃO: o "id" de um plano não deve mudar depois que houver assinantes (fica gravado no histórico).
export type Plan = { id: string; name: string; price: number; tagline: string; features: string[]; nutrition: boolean; modality: "online" | "presencial"; highlight?: boolean };

export const PLANS: Plan[] = [
  {
    id: "online-treino",
    name: "Online Treino",
    price: 149.9,
    tagline: "Treino individual montado pra você",
    features: ["Treino 100% individual", "Vídeos de execução", "Ajuste mensal do treino", "Check-in semanal"],
    nutrition: false,
    modality: "online",
  },
  {
    id: "online-completo",
    name: "Online Treino + Nutrição",
    price: 249.9,
    tagline: "Acompanhamento completo",
    features: ["Tudo do Online Treino", "Orientação nutricional", "Ajustes a cada 15 dias", "Resposta prioritária"],
    nutrition: true,
    modality: "online",
    highlight: true,
  },
  {
    id: "presencial-sp",
    name: "Presencial SP",
    price: 599.9,
    tagline: "Personal ao seu lado em São Paulo",
    features: ["Aulas presenciais", "Avaliação física", "Treino e nutrição no app", "Acompanhamento diário"],
    nutrition: true,
    modality: "presencial",
  },
];

export const getPlan = (id?: string | null) => PLANS.find((p) => p.id === id);
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
