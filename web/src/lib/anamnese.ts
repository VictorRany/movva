// Questionário de anamnese. Edite perguntas aqui: o formulário e a visualização do personal se ajustam sozinhos.
export type Field = {
  key: string; label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "multi" | "yesno";
  options?: string[]; required?: boolean; placeholder?: string; alert?: boolean; // alert: "Sim" gera alerta de saúde
};
export type Section = { title: string; description?: string; fields: Field[] };

export const ANAMNESE: Section[] = [
  { title: "Sobre você", fields: [
    { key: "birth", label: "Data de nascimento", type: "date", required: true },
    { key: "sex", label: "Sexo", type: "select", options: ["Feminino", "Masculino", "Prefiro não dizer"], required: true },
    { key: "height", label: "Altura (cm)", type: "number", required: true, placeholder: "165" },
    { key: "weight", label: "Peso atual (kg)", type: "number", required: true, placeholder: "62.5" },
    { key: "profession", label: "Profissão", type: "text" },
  ] },
  { title: "Seu objetivo", fields: [
    { key: "goal", label: "Objetivo principal", type: "select", required: true,
      options: ["Emagrecimento", "Ganho de massa muscular", "Definição", "Condicionamento físico", "Saúde e qualidade de vida", "Performance esportiva"] },
    { key: "goal_detail", label: "Conte com suas palavras o que você quer alcançar", type: "textarea", required: true, placeholder: "Ex.: perder 6 kg até o verão e ganhar mais disposição" },
    { key: "body_focus", label: "Regiões que quer priorizar", type: "multi", options: ["Glúteos", "Pernas", "Abdômen", "Braços", "Costas", "Peito", "Corpo todo"] },
  ] },
  { title: "Rotina de treino", fields: [
    { key: "experience", label: "Experiência com musculação", type: "select", required: true,
      options: ["Nunca treinei", "Iniciante (menos de 6 meses)", "Intermediário (6 meses a 2 anos)", "Avançado (mais de 2 anos)"] },
    { key: "days_week", label: "Quantos dias por semana pode treinar?", type: "select", required: true, options: ["2", "3", "4", "5", "6"] },
    { key: "session_time", label: "Tempo disponível por treino", type: "select", required: true, options: ["30 min", "45 min", "1 hora", "1h30 ou mais"] },
    { key: "place", label: "Onde vai treinar?", type: "select", required: true, options: ["Academia", "Em casa", "Academia do condomínio", "Ao ar livre"] },
    { key: "equipment", label: "Se for em casa/condomínio: quais equipamentos tem?", type: "textarea", placeholder: "Ex.: halteres de 2 a 10 kg, elástico, banco" },
    { key: "other_sports", label: "Pratica outra atividade? (corrida, luta, esporte…)", type: "text" },
    { key: "likes", label: "Exercícios que gosta / não gosta", type: "textarea" },
  ] },
  { title: "Saúde", description: "Essas respostas são confidenciais e garantem um treino seguro.", fields: [
    { key: "heart", label: "Algum médico já disse que você tem problema no coração?", type: "yesno", required: true, alert: true },
    { key: "chest_pain", label: "Sente dor no peito ao fazer atividade física?", type: "yesno", required: true, alert: true },
    { key: "dizziness", label: "Já desmaiou ou perdeu o equilíbrio por tontura?", type: "yesno", required: true, alert: true },
    { key: "pressure", label: "Tem pressão alta ou toma remédio para pressão?", type: "yesno", required: true, alert: true },
    { key: "bone", label: "Tem problema ósseo ou articular que piora com exercício?", type: "yesno", required: true, alert: true },
    { key: "pregnant", label: "Está grávida ou no pós-parto?", type: "select", options: ["Não", "Sim", "Não se aplica"], required: true },
    { key: "injuries", label: "Lesões, dores ou cirurgias (atuais ou antigas)", type: "textarea", placeholder: "Ex.: condromalácia no joelho direito, cirurgia no ombro em 2022" },
    { key: "conditions", label: "Condições de saúde (diabetes, tireoide, asma, ansiedade…)", type: "textarea" },
    { key: "medications", label: "Medicamentos de uso contínuo", type: "textarea" },
  ] },
  { title: "Estilo de vida", fields: [
    { key: "sleep", label: "Quantas horas dorme por noite?", type: "select", required: true, options: ["Menos de 5h", "5 a 6h", "7 a 8h", "Mais de 8h"] },
    { key: "stress", label: "Nível de estresse", type: "select", required: true, options: ["Baixo", "Médio", "Alto"] },
    { key: "work_activity", label: "No trabalho você fica…", type: "select", options: ["Sentado(a) a maior parte do tempo", "Em pé / se movimentando", "Fazendo esforço físico"] },
    { key: "alcohol", label: "Consumo de álcool", type: "select", options: ["Não bebo", "Socialmente", "Toda semana", "Quase todo dia"] },
    { key: "smoke", label: "Fuma?", type: "yesno" },
  ] },
  { title: "Alimentação", fields: [
    { key: "meals_day", label: "Quantas refeições faz por dia?", type: "select", required: true, options: ["1 a 2", "3", "4", "5 ou mais"] },
    { key: "water", label: "Quanto de água bebe por dia?", type: "select", required: true, options: ["Menos de 1 L", "1 a 2 L", "2 a 3 L", "Mais de 3 L"] },
    { key: "restrictions", label: "Alergias, intolerâncias ou restrições (vegetariano, sem lactose…)", type: "textarea" },
    { key: "food_day", label: "Descreva um dia normal da sua alimentação", type: "textarea", required: true, placeholder: "Café: … Almoço: … Jantar: …" },
    { key: "food_dislikes", label: "Alimentos que não come de jeito nenhum", type: "textarea" },
    { key: "supplements", label: "Usa suplementos? Quais?", type: "text" },
  ] },
];

export const healthAlerts = (a: Record<string, unknown> | null | undefined) =>
  !a ? [] : ANAMNESE.flatMap((s) => s.fields).filter((f) => f.alert && a[f.key] === "Sim").map((f) => f.label);

export const age = (birth?: string) => birth ? Math.floor((Date.now() - new Date(birth).getTime()) / 3.15576e10) : null;
