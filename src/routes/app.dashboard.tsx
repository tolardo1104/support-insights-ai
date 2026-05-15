import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
} from "recharts";
import {
  RefreshCw, Sparkles, TicketIcon, Clock, Smile, Target,
  CheckCircle, Loader2, PhoneOff, Timer, PhoneCall, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncMovideskTickets } from "@/lib/movidesk.functions";
import { analyzePeriod } from "@/lib/ai-analysis.functions";
import { useTickets, useTicketsPrevious, type Ticket } from "@/lib/use-tickets-data";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, endOfMonth, subDays } from "date-fns";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

const COLORS = [
  "oklch(0.55 0.21 262)", "oklch(0.65 0.17 152)", "oklch(0.78 0.16 75)",
  "oklch(0.6 0.22 25)", "oklch(0.55 0.16 305)", "oklch(0.6 0.13 200)",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

type PeriodoTipo = "hoje" | "7d" | "30d" | "mes_atual" | "mes_anterior" | "trimestre" | "custom";

function Dashboard() {
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("mes_atual");
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncModal, setSyncModal] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [lastAnalise, setLastAnalise] = useState<string | null>(null);

  const syncFn = useServerFn(syncMovideskTickets);
  const analyzeFn = useServerFn(analyzePeriod);
  const { tickets, loading } = useTickets(from, to);
  const { tickets: ticketsPrev } = useTicketsPrevious(from, to);
  const [metas, setMetas] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analises_ia")
        .select("resultado, criado_em")
        .eq("tipo", "geral")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      const texto = (data?.resultado as any)?.texto;
      if (texto) setLastAnalise(texto);

      const { data: ms } = await supabase
        .from("metas")
        .select("metrica, valor_meta")
        .eq("ativo", true)
        .is("atendente_id", null);
      if (ms) {
        const map: Record<string, number> = {};
        for (const m of ms) map[m.metrica] = Number(m.valor_meta);
        setMetas(map);
      }
    })();
  }, []);

  function aplicarPeriodo(tipo: PeriodoTipo) {
    setPeriodoTipo(tipo);
    const hoje = new Date();
    if (tipo === "hoje") {
      setFrom(todayISO()); setTo(todayISO());
    } else if (tipo === "7d") {
      setFrom(subDays(hoje, 7).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "30d") {
      setFrom(subDays(hoje, 30).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "mes_atual") {
      setFrom(startOfMonth(hoje).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "mes_anterior") {
      const prev = subMonths(hoje, 1);
      setFrom(startOfMonth(prev).toISOString().slice(0, 10));
      setTo(endOfMonth(prev).toISOString().slice(0, 10));
    } else if (tipo === "trimestre") {
      setFrom(subDays(hoje, 90).toISOString().slice(0, 10)); setTo(todayISO());
    }
  }

  function calcMetricas(list: Ticket[]) {
    const abertos = list.filter((t) => !t.resolvido_em).length;
    const resolvidos = list.filter((t) => !!t.resolvido_em).length;
    const reabertos = list.filter((t) => t.reaberto).length;

    const tmas = list.map((t) => t.tma_minutos).filter((v): v is number => v !== null);
    const tmaMedio = tmas.length
      ? Math.round((tmas.reduce((a, b) => a + b, 0) / tmas.length / 60) * 10) / 10 : null;

    const csats = list.map((t) => t.csat_nota).filter((v): v is number => v !== null);
    const csatMedio = csats.length
      ? Math.round((csats.reduce((a, b) => a + b, 0) / csats.length) * 10) / 10 : null;

    // NPS: promotores (9-10) - detratores (0-6), em escala -100 a 100
    const npsRaw = list.map((t) => t.nps_nota).filter((v): v is number => v !== null);
    let npsScore: number | null = null;
    if (npsRaw.length) {
      const promotores = npsRaw.filter((v) => v >= 9).length;
      const detratores = npsRaw.filter((v) => v <= 6).length;
      npsScore = Math.round(((promotores - detratores) / npsRaw.length) * 100);
    }

    const fcr = list.length
      ? Math.round((resolvidos / Math.max(list.length, 1)) * 100) : 0;

    const tmes = list.map((t) => t.tme_minutos).filter((v): v is number => v !== null);
    const tmeMedio = tmes.length ? Math.round(tmes.reduce((a, b) => a + b, 0) / tmes.length) : null;

    const frts = list.map((t) => t.frt_minutos).filter((v): v is number => v !== null);
    const frtMedio = frts.length ? Math.round(frts.reduce((a, b) => a + b, 0) / frts.length) : null;

    const abandonados = list.filter((t) => t.abandonado).length;
    // Consideramos apenas se temRespostaAtendente como proxy para abandono. Se os tickets não têm esse campo atualizado, podem vir nulos para abondonado.
    // Como abandonado é booleano (true/false), podemos apenas contar.
    // Mas para ser seguro, se todos tickets tiverem frt_minutos nulo e tme_minutos nulo,
    // significa que é do banco antigo e não podemos calcular a taxa de abandono direito.
    // Vamos verificar se existe pelo menos um ticket não nulo pra essas métricas de tempo
    const taxaAbandono = frts.length > 0 || tmes.length > 0
      ? (list.length ? Math.round((abandonados / list.length) * 100) : 0)
      : null;

    return {
      abertos, resolvidos, reabertos, total: list.length,
      tmaMedio, csatMedio, npsScore, fcr,
      tmeMedio, frtMedio, taxaAbandono,
    };
  }

  const metricas = useMemo(() => calcMetricas(tickets), [tickets]);
  const metricasPrev = useMemo(() => calcMetricas(ticketsPrev), [ticketsPrev]);

  function trend(atual: number, anterior: number): number | null {
    if (!anterior || !isFinite(anterior)) return null;
    return Math.round(((atual - anterior) / anterior) * 100);
  }

  const fmtTempo = (m: number) => m > 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${m}min`;

  const ticketsPorDia = useMemo(() => {
    const buckets = new Map<string, number>();
    DIAS_SEMANA.forEach((d) => buckets.set(d, 0));
    for (const t of tickets) {
      if (!t.criado_em) continue;
      const d = DIAS_SEMANA[new Date(t.criado_em).getDay()];
      buckets.set(d, (buckets.get(d) ?? 0) + 1);
    }
    return DIAS_SEMANA.map((dia) => ({ dia, tickets: buckets.get(dia) ?? 0 }));
  }, [tickets]);

  const categorias = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tickets) {
      const c = t.categoria ?? "Sem categoria";
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([categoria, count]) => ({ categoria, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [tickets]);

  const csatEvolucao = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const t of tickets) {
      if (!t.criado_em || t.csat_nota == null) continue;
      const dia = t.criado_em.slice(0, 10);
      const b = buckets.get(dia) ?? { sum: 0, n: 0 };
      b.sum += Number(t.csat_nota); b.n += 1;
      buckets.set(dia, b);
    }
    
    const result = [];
    let curr = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");
    // Se o período for maior que 60 dias, agrupar de outra forma? Não, deixamos assim por enquanto
    while (curr <= end) {
      const dStr = curr.toISOString().slice(0, 10);
      const b = buckets.get(dStr);
      result.push({
        dia: dStr.slice(5, 10).split('-').reverse().join('/'), // DD/MM
        csat: b && b.n > 0 ? Math.round(b.sum / b.n) : null
      });
      curr.setDate(curr.getDate() + 1);
    }
    return result;
  }, [tickets, from, to]);

  const sync = async () => {
    setSyncing(true);
    setSyncModal(true);
    setSyncMsg("Conectando à Movidesk e importando tickets...");
    try {
      const r = await syncFn({ data: { dataInicio: from, dataFim: to } });
      setSyncMsg(r.message);
      r.ok ? toast.success(r.message) : toast.warning(r.message);
      await new Promise((res) => setTimeout(res, 8000));
    } catch (e: any) {
      const msg = e.message ?? "Erro ao sincronizar";
      setSyncMsg(msg);
      toast.error(msg);
      await new Promise((res) => setTimeout(res, 8000));
    } finally {
      setSyncing(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await analyzeFn({ data: { periodo: "mes", dataInicio: from, dataFim: to } });
      if (r.ok) {
        setLastAnalise(r.resultado);
        toast.success("Análise IA gerada e salva com sucesso");
      } else {
        toast.warning(r.resultado);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  const periodos: { key: PeriodoTipo; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "mes_atual", label: "Mês atual" },
    { key: "mes_anterior", label: "Mês anterior" },
    { key: "trimestre", label: "Trimestre" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral de toda a operação de suporte."
        actions={
          <>
            <Button variant="outline" onClick={sync} disabled={syncing}>
              {syncing
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
            <Button onClick={analyze} disabled={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />
              {analyzing ? "Analisando..." : "Analisar com IA"}
            </Button>
          </>
        }
      />

      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2">
            {periodos.map((p) => (
              <Button
                key={p.key}
                variant={periodoTipo === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => aplicarPeriodo(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPeriodoTipo("custom"); }}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPeriodoTipo("custom"); }}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* LINHA 1 — volume */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
        <MetricCard compact label="Tickets abertos" value={loading ? "—" : metricas.abertos}
          icon={<TicketIcon className="h-4 w-4" />}
          trend={trend(metricas.abertos, metricasPrev.abertos)}
          meta={metas.abertos} lowerIsBetter className="h-full" />
        <MetricCard compact label="Reabertos" value={loading ? "—" : metricas.reabertos}
          icon={<RotateCcw className="h-4 w-4" />}
          trend={trend(metricas.reabertos, metricasPrev.reabertos)}
          meta={metas.reabertos} lowerIsBetter className="h-full" />
        <MetricCard compact label="Resolvidos" value={loading ? "—" : metricas.resolvidos}
          icon={<CheckCircle className="h-4 w-4" />}
          trend={trend(metricas.resolvidos, metricasPrev.resolvidos)}
          meta={metas.resolvidos} className="h-full" />
        <MetricCard compact label="Total" value={loading ? "—" : metricas.total}
          icon={<TicketIcon className="h-4 w-4" />}
          trend={trend(metricas.total, metricasPrev.total)}
          meta={metas.volume} className="h-full" />
        <MetricCard compact label="TMA médio" value={loading ? "—" : metricas.tmaMedio} suffix="h"
          icon={<Clock className="h-4 w-4" />}
          trend={trend(metricas.tmaMedio, metricasPrev.tmaMedio)}
          meta={metas.tma} lowerIsBetter className="h-full" />
      </div>

      {/* LINHA 2 — qualidade e tempo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard compact label="CSAT médio" value={loading ? "—" : (metricas.csatMedio ?? "—")}
          icon={<Smile className="h-4 w-4" />}
          trend={metricas.csatMedio !== null && metricasPrev.csatMedio !== null ? trend(metricas.csatMedio, metricasPrev.csatMedio) : null}
          meta={metas.csat}
          title={metricas.csatMedio === null ? "Sincronize novamente para calcular esta métrica" : undefined}
          className="h-full"
        />
        <MetricCard compact label="FCR" value={loading ? "—" : metricas.fcr} suffix="%"
          icon={<Target className="h-4 w-4" />}
          trend={trend(metricas.fcr, metricasPrev.fcr)}
          meta={metas.fcr} className="h-full" />
        <MetricCard compact label="TME" value={loading ? "—" : (metricas.tmeMedio === null ? "—" : fmtTempo(metricas.tmeMedio))}
          icon={<Timer className="h-4 w-4" />}
          trend={metricas.tmeMedio !== null && metricasPrev.tmeMedio !== null ? trend(metricas.tmeMedio, metricasPrev.tmeMedio) : null}
          meta={metas.tme} lowerIsBetter
          title={metricas.tmeMedio === null ? "Sincronize novamente para calcular esta métrica" : undefined}
          className="h-full"
        />
        <MetricCard compact label="FRT" value={loading ? "—" : (metricas.frtMedio === null ? "—" : fmtTempo(metricas.frtMedio))}
          icon={<PhoneCall className="h-4 w-4" />}
          trend={metricas.frtMedio !== null && metricasPrev.frtMedio !== null ? trend(metricas.frtMedio, metricasPrev.frtMedio) : null}
          meta={metas.frt} lowerIsBetter
          title={metricas.frtMedio === null ? "Sincronize novamente para calcular esta métrica" : undefined}
          className="h-full"
        />
        <MetricCard compact label="Abandono" value={loading ? "—" : (metricas.taxaAbandono ?? "—")} suffix={metricas.taxaAbandono !== null ? "%" : ""}
          icon={<PhoneOff className="h-4 w-4" />}
          trend={metricas.taxaAbandono !== null && metricasPrev.taxaAbandono !== null ? trend(metricas.taxaAbandono, metricasPrev.taxaAbandono) : null}
          meta={metas.abandono} lowerIsBetter
          title={metricas.taxaAbandono === null ? "Sincronize novamente para calcular esta métrica" : undefined}
          className="h-full"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-1">Tickets por dia da semana</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição no período selecionado</p>
          {loading ? (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ticketsPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="tickets" fill="var(--primary)" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="tickets" position="top" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Distribuição por categoria</h3>
          <p className="text-xs text-muted-foreground mb-4">Top categorias</p>
          {loading ? (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">Carregando...</div>
          ) : categorias.length === 0 ? (
            <div className="h-[240px] grid place-items-center text-sm text-muted-foreground">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="count"
                  nameKey="categoria"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ categoria, percent }: any) => `${String(categoria).slice(0, 10)} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-1">Evolução do CSAT</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Satisfação média diária — nota vinda do campo csat_nota sincronizado da Movidesk
        </p>
        {loading ? (
          <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Carregando...</div>
        ) : csatEvolucao.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <PhoneOff className="h-5 w-5" />
            <p>Sem notas de satisfação no período.</p>
            <p className="text-xs">Verifique se a pesquisa de satisfação está ativa na Movidesk.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={csatEvolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="csat" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} connectNulls={true}>
                <LabelList dataKey="csat" position="top" style={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {lastAnalise && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Último insight da IA</h3>
            </div>
            <Button variant="outline" size="sm" onClick={analyze} disabled={analyzing}>
              {analyzing
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Regenerar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {lastAnalise}
          </p>
        </Card>
      )}

      <Dialog open={syncModal} onOpenChange={(o) => { if (!syncing) setSyncModal(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronização com Movidesk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              {syncing
                ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                : <CheckCircle className="h-5 w-5 text-success" />}
              <p className="text-sm font-medium">{syncMsg}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Período: {from} → {to}
            </p>
          </div>
          {!syncing && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSyncModal(false)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
