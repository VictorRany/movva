export default function WeightChart({ points }: { points: { date: string; weight: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-muted">Envie pelo menos 2 check-ins com peso para ver o gráfico.</p>;
  const W = 600, H = 180, P = 28;
  const ws = points.map((p) => p.weight);
  const min = Math.min(...ws) - 1, max = Math.max(...ws) + 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (w: number) => H - P - ((w - min) / (max - min)) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.weight)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução do peso">
      <path d={d} fill="none" stroke="var(--color-gold)" strokeWidth={3} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.weight)} r={5} fill="var(--color-gold)" />
          <text x={x(i)} y={y(p.weight) - 10} textAnchor="middle" fontSize={13} fill="var(--color-cream)">{p.weight}</text>
          <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--color-muted)">{new Date(p.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</text>
        </g>
      ))}
    </svg>
  );
}
