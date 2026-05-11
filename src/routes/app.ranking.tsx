import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Settings2, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { calculateRanking } from "@/lib/ranking.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/ranking")({ component: RankingPage });

type Row = {
  id: string;
  nome: string;
  equipe: string | null;
  posicao: number;
  score_total: number;
  score_csat: number;
  score_volume: number;
  score_tma: number;
  score_ia: number;
  score_metas: number;
  tickets: number;
  tma: number;
  csat: number;
};

function RankingPage() {
  const [metric, setMetric] = useState("score");
  const [pesos, setPesos] = useState({ csat: 30, volume: 25, tma: 20, ia: 15, metas: 10 });
  const [recalc, setRecalc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const calcFn = useServerFn(calculateRanking);
  const total = pesos.csat + pesos.volume + pesos.tma + pesos.ia + pesos.metas;

  const carregar = async () => {
    setLoading(true);
    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    const periodo = inicioMes.toISOString().slice(0, 10);

    const { data: scores } = await supabase
      .from("ranking_scores").select("*").eq("periodo_mes", periodo).order("posicao", { ascending: true });

    const { data: atend } = await supabase.from("atendentes").select("id,nome,equipe");
    const mapA = new Map((atend ?? []).map((a) => [a.id, a]));

    const { data: tickets } = await supabase
      .from("tickets_cache").select("atendente_id,tma_minutos,csat_nota").gte("criado_em", inicioMes.toISOString());
    const stats: Record<string, { n: number; tmaSum: number; tmaN: number; csatSum: number; csatN: number }> = {};
    for (const t of tickets ?? []) {
      if (!t.atendente_id) continue;
      const s = (stats[t.atendente_id] ||= { n: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0 });
      s.n++;
      if (t.tma_minutos) { s.tmaSum += t.tma_minutos; s.tmaN++; }
      if (t.csat_nota) { s.csatSum += t.csat_nota; s.csatN++; }
    }

    const r: Row[] = (scores ?? []).map((s: any) => {
      const a = mapA.get(s.atendente_id);
      const st = stats[s.atendente_id];
      return {
        id: s.atendente_id,
        nome: a?.nome ?? "—",
        equipe: a?.equipe ?? null,
        posicao: s.posicao ?? 0,
        score_total: Number(s.score_total ?? 0),
        score_csat: Number(s.score_csat ?? 0),
        score_volume: Number(s.score_volume ?? 0),
        score_tma: Number(s.score_tma ?? 0),
        score_ia: Number(s.score_ia ?? 0),
        score_metas: Number(s.score_metas ?? 0),
        tickets: st?.n ?? 0,
        tma: st?.tmaN ? +(st.tmaSum / st.tmaN / 60).toFixed(1) : 0,
        csat: st?.csatN ? Math.round(st.csatSum / st.csatN) : 0,
      };
    });
    setRows(r);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const recalcular = async () => {
    setRecalc(true);
    try {
      const r = await calcFn({});
      r.ok ? toast.success(r.message) : toast.warning(r.message);
      await carregar();
    } catch (e: any) { toast.error(e.message); }
    finally { setRecalc(false); }
  };

  const ordenado = [...rows].sort((a, b) => {
    if (metric === "tma") return a.tma - b.tma;
    if (metric === "csat") return b.csat - a.csat;
    if (metric === "volume") return b.tickets - a.tickets;
    return b.score_total - a.score_total;
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
            <Button variant="outline" onClick={recalcular} disabled={recalc}>
              {recalc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Recalcular
            </Button>
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

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4"><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
          <Skeleton className="h-64" />
        </div>
      ) : ordenado.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Sem ranking calculado</h3>
          <p className="text-sm text-muted-foreground mb-4">Sincronize tickets da Movidesk e clique em "Recalcular" para gerar o ranking do mês.</p>
          <Button onClick={recalcular} disabled={recalc}>
            {recalc ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Calcular agora
          </Button>
        </Card>
      ) : (
        <>
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
                    <div className="text-xs text-muted-foreground font-mono">{a.score_total.toFixed(1)} pts</div>
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

          {others.length > 0 && (
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
                      <div className="text-xs text-muted-foreground">{a.equipe ?? "—"}</div>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs font-mono text-muted-foreground tabular-nums">
                      <span>{a.tickets} tickets</span>
                      <span>{a.tma}h TMA</span>
                      <span>{a.csat}% CSAT</span>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < stars(a.score_total) ? "fill-warning text-warning" : "text-muted"}`} />
                      ))}
                    </div>
                    <span className="font-mono font-semibold tabular-nums w-12 text-right">{a.score_total.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
