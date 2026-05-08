import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockAtendentes, mockDimensoesIA, mockTicketsAnalisados } from "@/lib/mock-data";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowLeft, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/atendentes/$id")({ component: AtendenteDetail });

function AtendenteDetail() {
  const { id } = useParams({ from: "/app/atendentes/$id" });
  const a = mockAtendentes.find((x) => x.id === id) ?? mockAtendentes[0];

  const evolucao = Array.from({ length: 6 }, (_, i) => ({
    mes: ["Dez", "Jan", "Fev", "Mar", "Abr", "Mai"][i],
    csat: Math.round(80 + Math.random() * 15),
    tma: +(2 + Math.random() * 3).toFixed(1),
  }));

  const corNota = (n: number) => n >= 8.5 ? "var(--success)" : n >= 7 ? "var(--warning)" : "var(--destructive)";
  const status = a.status === "destaque" ? "Destaque" : a.status === "regular" ? "Regular" : "Atenção necessária";

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/app/atendentes"><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Link>
      </Button>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-xl">
          {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{a.nome}</h1>
          <p className="text-sm text-muted-foreground">{a.equipe} · {a.email}</p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-3">{status}</Badge>
      </div>

      <Tabs defaultValue="metricas">
        <TabsList>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="competencias">Competências (IA)</TabsTrigger>
          <TabsTrigger value="chamados">Análise de chamados</TabsTrigger>
          <TabsTrigger value="plano">Plano de desenvolvimento</TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard label="Tickets" value={a.tickets} />
            <MetricCard label="TMA" value={a.tma} suffix="h" />
            <MetricCard label="CSAT" value={a.csat} suffix="%" />
            <MetricCard label="Resol. 1º contato" value={72} suffix="%" />
            <MetricCard label="1ª resposta" value={0.6} suffix="h" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Evolução mensal — CSAT vs TMA</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="csat" stroke="var(--primary)" strokeWidth={2} />
                <Line type="monotone" dataKey="tma" stroke="var(--chart-3)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Progresso vs metas individuais</h3>
            <div className="space-y-3">
              {[
                { l: "Tickets / mês", v: a.tickets, m: 130 },
                { l: "TMA máx", v: 100 - Math.min(100, (a.tma / 4) * 100), m: 100, label: `${a.tma}h / meta 4h` },
                { l: "CSAT mínimo", v: a.csat, m: 90 },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.l}</span><span className="font-mono">{m.label ?? `${Math.round(m.v)} / ${m.m}`}</span>
                  </div>
                  <Progress value={Math.min(100, (m.v / m.m) * 100)} />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="competencias" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockDimensoesIA.map((d) => (
              <Card key={d.nome} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{d.nome}</h4>
                  <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color: corNota(d.nota) }}>{d.nota.toFixed(1)}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${d.nota * 10}%`, background: corNota(d.nota) }} />
                </div>
                <p className="text-xs text-success mb-1"><strong>Forte:</strong> {d.ponto_forte}</p>
                <p className="text-xs text-muted-foreground"><strong>Melhorar:</strong> {d.ponto_melhoria}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chamados" className="space-y-3 mt-4">
          {mockTicketsAnalisados.map((t) => {
            const cor = t.badge === "Bem resolvido" ? "bg-success/15 text-success border-success/30"
              : t.badge === "TMA alto" ? "bg-warning/15 text-warning-foreground border-warning/30"
              : t.badge === "Escalação evitável" ? "bg-destructive/15 text-destructive border-destructive/30"
              : "bg-muted text-muted-foreground";
            return (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                      <Badge variant="outline">{t.categoria}</Badge>
                      <Badge variant="outline">{t.status}</Badge>
                    </div>
                    <h4 className="font-medium mt-1">{t.assunto}</h4>
                  </div>
                  <Badge variant="outline" className={cor}>{t.badge}</Badge>
                </div>
                <p className="text-sm text-muted-foreground italic mb-2">"{t.trecho}"</p>
                <div className="flex gap-2 items-start text-sm bg-muted/30 p-3 rounded-md">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{t.comentario}</span>
                </div>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="plano" className="space-y-4 mt-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Plano de desenvolvimento gerado pela IA</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("Plano regenerado")}><Sparkles className="h-4 w-4 mr-1" />Gerar plano</Button>
                <Button size="sm" onClick={() => toast.success("Rascunho copiado")}><FileText className="h-4 w-4 mr-1" />Rascunhar feedback</Button>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { p: 1, t: "Aprofundar conhecimento técnico de integrações API", d: "Treinamento de 4h sobre fluxos REST, autenticação OAuth e troubleshooting de erros 5xx. Reduz escalações e TMA em chamados de integração." },
                { p: 2, t: "Estruturar follow-up de casos resolvidos", d: "Implementar checklist de encerramento e mensagem de validação 24h após fechamento. Aumenta CSAT e identifica reaberturas." },
                { p: 3, t: "Otimizar diagnóstico inicial em horários de pico", d: "Sessão de coaching focada em perguntas de escopo nos primeiros 5 minutos. Reduz TMA fora do horário comercial." },
              ].map((it) => (
                <div key={it.p} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm shrink-0">{it.p}</div>
                  <div>
                    <h4 className="font-medium">{it.t}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{it.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-sm mb-2 text-success">O que manter</h4>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Tom acolhedor e clareza nas respostas (CSAT consistentemente acima de 90% em pagamentos)</li>
                <li>Resolução ágil em chamados N1 padrão</li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
