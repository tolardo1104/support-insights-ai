import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockAtendentes } from "@/lib/mock-data";
import { Trophy, Star, Settings2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ranking")({ component: RankingPage });

function RankingPage() {
  const [metric, setMetric] = useState("score");
  const [pesos, setPesos] = useState({ csat: 30, volume: 25, tma: 20, ia: 15, metas: 10 });
  const total = pesos.csat + pesos.volume + pesos.tma + pesos.ia + pesos.metas;

  const ordenado = [...mockAtendentes].sort((a, b) => {
    if (metric === "tma") return a.tma - b.tma;
    if (metric === "csat") return b.csat - a.csat;
    if (metric === "volume") return b.tickets - a.tickets;
    return b.score - a.score;
  }).map((a, i) => ({ ...a, pos: i + 1 }));

  const top3 = ordenado.slice(0, 3);
  const others = ordenado.slice(3);

  const stars = (score: number) => Math.max(1, Math.min(5, Math.round(score / 20)));
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Ranking"
        description="Pódio gamificado da equipe — atualizado mensalmente."
        actions={
          <>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Pontuação geral</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
                <SelectItem value="tma">TMA (menor)</SelectItem>
                <SelectItem value="csat">CSAT</SelectItem>
              </SelectContent>
            </Select>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline"><Settings2 className="h-4 w-4 mr-2" />Configurar pesos</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Pesos do score (soma deve ser 100%)</DialogTitle></DialogHeader>
                <div className="space-y-5 mt-2">
                  {([["csat", "CSAT"], ["volume", "Volume"], ["tma", "TMA"], ["ia", "Score IA"], ["metas", "Metas"]] as const).map(([k, l]) => (
                    <div key={k}>
                      <div className="flex justify-between text-sm mb-2"><span>{l}</span><span className="font-mono">{pesos[k]}%</span></div>
                      <Slider value={[pesos[k]]} onValueChange={([v]) => setPesos({ ...pesos, [k]: v })} min={0} max={100} step={5} />
                    </div>
                  ))}
                  <div className={`text-sm font-mono p-3 rounded-md ${total === 100 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    Total: {total}% {total !== 100 && "— ajuste para 100%"}
                  </div>
                  <Button className="w-full" disabled={total !== 100} onClick={() => toast.success("Pesos salvos")}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-8 items-end">
        {podiumOrder.map((a, idx) => {
          const realPos = a.pos;
          const heights = ["h-32", "h-44", "h-28"];
          const colors = ["from-zinc-300 to-zinc-100", "from-amber-300 to-yellow-200", "from-orange-300 to-amber-200"];
          const height = realPos === 1 ? heights[1] : realPos === 2 ? heights[0] : heights[2];
          const color = realPos === 1 ? colors[1] : realPos === 2 ? colors[0] : colors[2];
          return (
            <div key={a.id} className="flex flex-col items-center" style={{ animation: `slide-up 0.5s ease-out ${idx * 0.15}s both` }}>
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold mb-2">
                {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="text-center mb-2">
                <div className="font-medium text-sm">{a.nome}</div>
                <div className="text-xs text-muted-foreground font-mono">{a.score} pts</div>
              </div>
              <div className={`w-full ${height} rounded-t-lg bg-gradient-to-t ${color} grid place-items-center text-zinc-800 font-bold text-2xl shadow-md`}>
                <div className="flex flex-col items-center gap-1">
                  <Trophy className="h-6 w-6" />#{realPos}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <div className="divide-y">
          {others.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition">
              <span className="font-mono text-muted-foreground w-8 text-center">#{a.pos}</span>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
                {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{a.nome}</div>
                <div className="text-xs text-muted-foreground">{a.equipe}</div>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground tabular-nums">
                <span>{a.tickets} tickets</span>
                <span>{a.tma}h TMA</span>
                <span>{a.csat}% CSAT</span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < stars(a.score) ? "fill-warning text-warning" : "text-muted"}`} />
                ))}
              </div>
              <span className="font-mono font-semibold tabular-nums w-12 text-right">{a.score}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
