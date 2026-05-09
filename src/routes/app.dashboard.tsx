import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  mockMetricasGerais, mockTicketsPorDia, mockEvolucaoCsat, mockCategorias, mockAnaliseIaGeral,
} from "@/lib/mock-data";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { RefreshCw, Sparkles, TicketIcon, Clock, Smile, Target, CheckCircle, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { syncMovideskTickets } from "@/lib/movidesk.functions";
import { analyzePeriod } from "@/lib/ai-analysis.functions";

export const Route = createFileRoute("/app/dashboard")({ component: Dashboard });

const COLORS = ["oklch(0.55 0.21 262)", "oklch(0.65 0.17 152)", "oklch(0.78 0.16 75)", "oklch(0.6 0.22 25)", "oklch(0.55 0.16 305)", "oklch(0.6 0.13 200)", "oklch(0.7 0.1 100)", "oklch(0.5 0.05 280)"];

function Dashboard() {
  const [periodo, setPeriodo] = useState("mes");
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncFn = useServerFn(syncMovideskTickets);
  const analyzeFn = useServerFn(analyzePeriod);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await syncFn({ data: { dias: 30 } });
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
            <Select defaultValue="todos">
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos atendentes</SelectItem>
                <SelectItem value="n1">Suporte N1</SelectItem>
                <SelectItem value="n2">Suporte N2</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={sync}><RefreshCw className="h-4 w-4 mr-2" />Sincronizar</Button>
            <Button onClick={analyze} disabled={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />{analyzing ? "Analisando..." : "Analisar com IA"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MetricCard label="Tickets abertos" value={mockMetricasGerais.ticketsAbertos} icon={<TicketIcon className="h-4 w-4" />} trend={4} />
        <MetricCard label="Resolvidos" value={mockMetricasGerais.ticketsResolvidos} icon={<CheckCircle className="h-4 w-4" />} trend={9} />
        <MetricCard label="TMA médio" value={mockMetricasGerais.tmaMedio} suffix="h" icon={<Clock className="h-4 w-4" />} trend={-12} />
        <MetricCard label="CSAT médio" value={mockMetricasGerais.csatMedio} suffix="%" icon={<Smile className="h-4 w-4" />} trend={2} />
        <MetricCard label="Resol. 1º contato" value={mockMetricasGerais.resolucaoPrimeiroContato} suffix="%" icon={<Target className="h-4 w-4" />} trend={5} />
        <MetricCard label="Dentro do SLA" value={mockMetricasGerais.dentroSLA} suffix="%" icon={<CheckCircle className="h-4 w-4" />} trend={1} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-1">Tickets por dia da semana</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuição da semana atual</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mockTicketsPorDia}>
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
          <p className="text-xs text-muted-foreground mb-4">Top categorias do período</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={mockCategorias} dataKey="count" nameKey="categoria" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {mockCategorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold mb-1">Evolução do CSAT — últimos 30 dias</h3>
        <p className="text-xs text-muted-foreground mb-4">Satisfação média diária</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={mockEvolucaoCsat}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="csat" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Categorias mais recorrentes</h3>
          <div className="space-y-2">
            {mockCategorias.map((c, i) => (
              <div key={c.categoria} className="flex items-center gap-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-sm flex-1 truncate">{c.categoria}</span>
                <span className="font-mono text-sm tabular-nums">{c.count}</span>
                <span className={`inline-flex items-center text-xs font-medium tabular-nums w-12 justify-end ${c.variacao >= 0 ? "text-success" : "text-destructive"}`}>
                  {c.variacao >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {Math.abs(c.variacao)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Insight da IA</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={analyze} disabled={analyzing}>Regenerar</Button>
          </div>
          <div className="prose prose-sm max-w-none text-sm text-foreground/90 whitespace-pre-line max-h-[260px] overflow-auto">
            {mockAnaliseIaGeral.split("\n\n").slice(0, 3).join("\n\n")}
          </div>
        </Card>
      </div>
    </div>
  );
}
