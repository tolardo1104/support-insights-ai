import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/atendentes/$id")({ component: AtendenteDetail });

type Atendente = { id: string; nome: string; equipe: string | null; email: string | null; criado_em: string | null };
type Ticket = {
  id: string; movidesk_ticket_id: string | null; assunto: string | null; categoria: string | null;
  status: string | null; criado_em: string | null; resolvido_em: string | null;
  tma_minutos: number | null; csat_nota: number | null; nps_nota: number | null;
  frt_minutos: number | null; tme_minutos: number | null; abandonado: boolean;
};
type AnaliseIA = { id: string; resultado: any; criado_em: string };

function corNota(n: number) {
  return n >= 8.5 ? "var(--success)" : n >= 7 ? "var(--warning)" : "var(--destructive)";
}

function AtendenteDetail() {
  const { id } = useParams({ from: "/app/atendentes/$id" });
  const navigate = useNavigate();
  const [atendente, setAtendente] = useState<Atendente | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: a }, { data: t }, { data: i }] = await Promise.all([
      supabase.from("atendentes").select("*").eq("id", id).maybeSingle(),
      supabase.from("tickets_cache").select("id,movidesk_ticket_id,assunto,categoria,status,criado_em,resolvido_em,tma_minutos,csat_nota,nps_nota,frt_minutos,tme_minutos,abandonado").eq("atendente_id", id).order("criado_em", { ascending: false }).limit(50),
      supabase.from("analises_ia").select("*").eq("atendente_id", id).order("criado_em", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (!a) {
      toast.error("Atendente não encontrado");
      navigate({ to: "/app/atendentes" });
      return;
    }
    setAtendente(a as any);
    setTickets((t ?? []) as any);
    setAnalise((i as any) ?? null);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  const metrics = useMemo(() => {
    const tmaArr = tickets.map((t) => t.tma_minutos).filter((v): v is number => v !== null);
    const csatArr = tickets.map((t) => t.csat_nota).filter((v): v is number => v !== null);
    const frtArr = tickets.map((t) => t.frt_minutos).filter((v): v is number => v !== null);
    const tmeArr = tickets.map((t) => t.tme_minutos).filter((v): v is number => v !== null);
    const resolvidos = tickets.filter((t) => t.resolvido_em).length;
    const abandonados = tickets.filter((t) => t.abandonado).length;

    const taxaAbandono = frtArr.length > 0 || tmeArr.length > 0
      ? (tickets.length ? Math.round((abandonados / tickets.length) * 100) : 0)
      : null;

    return {
      total: tickets.length,
      resolvidos,
      tma: tmaArr.length ? Math.round((tmaArr.reduce((a, b) => a + b, 0) / tmaArr.length / 60) * 10) / 10 : null,
      csat: csatArr.length ? Math.round((csatArr.reduce((a, b) => a + b, 0) / csatArr.length) * 10) / 10 : null,
      frt: frtArr.length ? Math.round(frtArr.reduce((a, b) => a + b, 0) / frtArr.length) : null,
      tme: tmeArr.length ? Math.round(tmeArr.reduce((a, b) => a + b, 0) / tmeArr.length) : null,
      abandono: taxaAbandono
    };
  }, [tickets]);

  const porSemana = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const t of tickets) {
      if (!t.criado_em) continue;
      const d = new Date(t.criado_em);
      const week = `${d.getFullYear()}-S${Math.ceil(((+d - +new Date(d.getFullYear(), 0, 1)) / 86400_000 + 1) / 7)}`;
      buckets.set(week, (buckets.get(week) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([semana, tickets]) => ({ semana, tickets })).slice(-8);
  }, [tickets]);

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!atendente) return null;

  const dimensoes: { nome: string; nota: number; ponto_forte?: string; ponto_melhoria?: string }[] =
    analise?.resultado?.dimensoes ?? [];
  const plano: { prioridade: number; titulo: string; descricao: string }[] =
    analise?.resultado?.plano_desenvolvimento ?? [];
  const classificacao = analise?.resultado?.classificacao ?? "Sem análise";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/app/atendentes"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-xl">
          {atendente.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{atendente.nome}</h1>
          <p className="text-sm text-muted-foreground">{atendente.equipe ?? "—"} · {atendente.email ?? "—"}</p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-3">{classificacao}</Badge>
      </div>

      <Tabs defaultValue="metricas">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="competencias">Competências (IA)</TabsTrigger>
          <TabsTrigger value="chamados">Análise de chamados</TabsTrigger>
          <TabsTrigger value="plano">Plano de desenvolvimento</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <MetricCard compact label="Tickets" value={metrics.total} />
            <MetricCard compact label="Resolvidos" value={metrics.resolvidos} />
            <div title={metrics.tma === null ? "Sincronize novamente para calcular esta métrica" : undefined}>
              <MetricCard compact label="TMA" value={metrics.tma === null ? "—" : metrics.tma} suffix={metrics.tma !== null ? "h" : ""} />
            </div>
            <div title={metrics.csat === null ? "Sincronize novamente para calcular esta métrica" : undefined}>
              <MetricCard compact label="CSAT" value={metrics.csat ?? "—"} />
            </div>
            <div title={metrics.frt === null ? "Sincronize novamente para calcular esta métrica" : undefined}>
              <MetricCard compact label="FRT" value={metrics.frt === null ? "—" : metrics.frt > 60 ? `${Math.round((metrics.frt / 60) * 10) / 10}h` : `${metrics.frt}min`} />
            </div>
            <div title={metrics.tme === null ? "Sincronize novamente para calcular esta métrica" : undefined}>
              <MetricCard compact label="TME" value={metrics.tme === null ? "—" : metrics.tme > 60 ? `${Math.round((metrics.tme / 60) * 10) / 10}h` : `${metrics.tme}min`} />
            </div>
            <div title={metrics.abandono === null ? "Sincronize novamente para calcular esta métrica" : undefined}>
              <MetricCard compact label="Abandono" value={metrics.abandono ?? "—"} suffix={metrics.abandono !== null ? "%" : ""} />
            </div>
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Tickets por semana</h3>
            {porSemana.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="tickets" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="competencias" className="space-y-4 mt-4">
          {dimensoes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">Nenhuma análise IA disponível para este atendente.</p>
              <Button onClick={() => toast.info("Gere uma análise em Análise IA")}><Sparkles className="h-4 w-4 mr-1" />Gerar análise agora</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dimensoes.map((d) => (
                <Card key={d.nome} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{d.nome}</h4>
                    <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: corNota(d.nota) }}>{d.nota.toFixed(1)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full" style={{ width: `${d.nota * 10}%`, background: corNota(d.nota) }} />
                  </div>
                  {d.ponto_forte && <p className="text-xs text-success mb-1"><strong>Forte:</strong> {d.ponto_forte}</p>}
                  {d.ponto_melhoria && <p className="text-xs text-muted-foreground"><strong>Melhorar:</strong> {d.ponto_melhoria}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chamados" className="space-y-3 mt-4">
          {tickets.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum chamado no período.</Card>
          ) : (
            tickets.slice(0, 20).map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">#{t.movidesk_ticket_id ?? t.id.slice(0, 8)}</span>
                      {t.categoria && <Badge variant="outline">{t.categoria}</Badge>}
                      {t.status && <Badge variant="outline">{t.status}</Badge>}
                    </div>
                    <h4 className="font-medium mt-1 truncate">{t.assunto ?? "—"}</h4>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0 space-y-1">
                    <div>TMA: <span className="font-mono bg-muted px-1 rounded">{t.tma_minutos != null ? `${Math.round(t.tma_minutos / 60 * 10) / 10}h` : "—"}</span></div>
                    {t.csat_nota != null && <div>CSAT: <span className="font-mono bg-primary/10 text-primary px-1 rounded font-semibold">{t.csat_nota}</span></div>}
                    {t.nps_nota != null && <div>NPS: <span className="font-mono bg-success/10 text-success px-1 rounded font-semibold">{t.nps_nota}</span></div>}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="plano" className="space-y-4 mt-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Plano de desenvolvimento gerado pela IA</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.info("Use Análise IA para gerar")}><Sparkles className="h-4 w-4 mr-1" />Gerar plano</Button>
                <Button size="sm" onClick={() => toast.success("Rascunho copiado")}><FileText className="h-4 w-4 mr-1" />Rascunhar feedback</Button>
              </div>
            </div>
            {plano.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum plano disponível ainda.</p>
            ) : (
              <div className="space-y-4">
                {plano.map((it, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm shrink-0">{it.prioridade}</div>
                    <div>
                      <h4 className="font-medium">{it.titulo}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{it.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
