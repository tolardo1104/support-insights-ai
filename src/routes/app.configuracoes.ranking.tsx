import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/configuracoes/ranking")({ component: RankingConfig });

function RankingConfig() {
  const [pesos, setPesos] = useState({ csat: 30, volume: 25, tma: 20, ia: 15, metas: 10 });
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  const items: { k: keyof typeof pesos; l: string; d: string }[] = [
    { k: "csat", l: "CSAT", d: "Satisfação dos clientes" },
    { k: "volume", l: "Volume de tickets", d: "Quantidade resolvida no período" },
    { k: "tma", l: "TMA", d: "Tempo médio de atendimento (menor = melhor)" },
    { k: "ia", l: "Score IA", d: "Avaliação qualitativa pela IA" },
    { k: "metas", l: "Metas atingidas", d: "Cumprimento de metas individuais" },
  ];
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-1">Pesos do score do ranking</h3>
      <p className="text-sm text-muted-foreground mb-6">Defina o peso de cada métrica. A soma deve ser exatamente 100%.</p>
      <div className="space-y-6">
        {items.map(({ k, l, d }) => (
          <div key={k}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="font-medium text-sm">{l}</div>
                <div className="text-xs text-muted-foreground">{d}</div>
              </div>
              <span className="font-mono text-lg font-semibold tabular-nums">{pesos[k]}%</span>
            </div>
            <Slider value={[pesos[k]]} onValueChange={([v]) => setPesos({ ...pesos, [k]: v })} min={0} max={100} step={5} />
          </div>
        ))}
      </div>
      <div className={`mt-6 p-3 rounded-md text-sm font-mono ${total === 100 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        Total: {total}% {total !== 100 && `— ajuste para 100% (atual: ${total > 100 ? "excedeu" : "faltam"} ${Math.abs(100 - total)}%)`}
      </div>
      <Button className="mt-4" disabled={total !== 100} onClick={() => toast.success("Pesos salvos")}>Salvar pesos</Button>
    </Card>
  );
}
