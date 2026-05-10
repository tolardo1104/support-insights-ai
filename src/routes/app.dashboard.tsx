import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { RefreshCw, Sparkles, TicketIcon, Clock, Smile, Target, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncMovideskTickets } from "@/lib/movidesk.functions";
import { analyzePeriod } from "@/lib/ai-analysis.functions";
import { useTickets } from "@/lib/use-tickets-data";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

const COLORS = ["oklch(0.55 0.21 262)", "oklch(0.65 0.17 152)", "oklch(0.78 0.16 75)", "oklch(0.6 0.22 25)", "oklch(0.55 0.16 305)", "oklch(0.6 0.13 200)", "oklch(0.7 0.1 100)", "oklch(0.5 0.05 280)"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Dashboard() {
  const [periodo, setPeriodo] = useState("mes");
  const dias = periodo === "semana" ? 7 : periodo === "trimestre" ? 90 : 30;
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncFn = useServerFn(syncMovideskTickets);
  const analyzeFn = useServerFn(analyzePeriod);
  const { tickets, loading } = useTickets(dias);

  const metricas = useMemo(() => {
    const abertos = tickets.filter((t) => !t.resolvido_em).length;
    const resolvidos = tickets.filter((t) => !!t.resolvido_em).length;
    const tmas = tickets.map((t) => t.tma_minutos).filter((v): v is number => v != null);
    const tmaMedio = tmas.length ? Math.round((tmas.reduce((a, b) => a + b, 0) / tmas.length / 60) * 10) / 10 : 0;
    const csats = tickets.map((t) => t.csat_nota).filter((v): v is number => v != null);
    const csatMedio = csats.length ? Math.round((csats.reduce((a, b) => a + b, 0) / csats.length)) : 0;
    return { abertos, resolvidos, tmaMedio, csatMedio };
  }, [tickets]);

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
      .slice(0, 8);
  }, [tickets]);

  const csatEvolucao = useMemo(() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const t of tickets) {
      if (!t.criado_em || t.csat_nota == null) continue;
      const dia = t.criado_em.slice(0, 10);
      const b = buckets.get(dia) ?? { sum: 0, n: 0 };
      b.sum += t.csat_nota; b.n += 1;
      buckets.set(dia, b);
    }
    return Array.from(buckets.entries())
      .sort()
      .map(([dia, b]) => ({ dia: dia.slice(5), csat: Math.round(b.sum / b.n) }));
  }, [tickets]);

  const sync = async () => {
    setSyncing(true);
    try {
      const fim = new Date();
      const inicio = new Date(Date.now() - dias * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const r = await syncFn({ data: { dataInicio: fmt(inicio), dataFim: fmt(fim) } });
      r.ok ? toast.success(r.message) : toast.warning(r.message);
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };
  const analyze = async () => {
    setAnalyzing(true);
    try {
      const r = await analyzeFn({ data: { periodo: periodo as any } });
      r.ok ? toast.success("Análise IA gerada") : toast.warning(r.resultado);
    } catch (e: any) { toast.error(e.message); }
    finally { setAnalyzing(false); }
  };

  const empty = !loading && tickets.length === 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Dashboard"
        description="Visão geral de toda a operação de suporte."
        actions={
          <>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mês</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
            <Button onClick={analyze} disabled={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />{analyzing ? "Analisando..." : "Analisar com IA"}
            </Button>
          </>
        }
      />

      {empty && (
        <Card className="p-6 mb-6 text-center text-sm text-muted-foreground">
          Nenhum ticket no período. Sincronize com a Movidesk em Configurações → Integração.
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Tickets abertos" value={metricas.abertos} icon={<TicketIcon className="h-4 w-4" />} />
        <MetricCard label="Resolvidos" value={metricas.resolvidos} icon={<CheckCircle className="h-4 w-4" />} />
        <MetricCard label="TMA médio" value={metricas.tmaMedio} suffix="h" icon={<Clock className="h-4 w-4" />} />
        <MetricCard label="CSAT médio" value={metricas.csatMedio} suffix="%" icon={<Smile className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-1">Tickets por dia da semana</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição no período</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ticketsPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="tickets" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-1">Distribuição por categoria</h3>
          <p className="text-xs text-muted-foreground mb-4">Top categorias</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categorias} dataKey="count" nameKey="categoria" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {categorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-1">Evolução do CSAT</h3>
        <p className="text-xs text-muted-foreground mb-4">Satisfação média diária</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={csatEvolucao}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="csat" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Categorias mais recorrentes</h3>
        <div className="space-y-2">
          {categorias.map((c, i) => (
            <div key={c.categoria} className="flex items-center gap-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-sm flex-1 truncate">{c.categoria}</span>
              <span className="font-mono text-sm tabular-nums">{c.count}</span>
            </div>
          ))}
          {categorias.length === 0 && <p className="text-sm text-muted-foreground">Sem dados.</p>}
        </div>
      </Card>
    </div>
  );
}
