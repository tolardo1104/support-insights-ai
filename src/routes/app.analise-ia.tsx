import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, FileText, RefreshCw, Users, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { analyzePeriod, analyzeAtendente } from "@/lib/ai-analysis.functions";
import { useAtendentes } from "@/lib/use-tickets-data";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, subDays, subMonths, endOfMonth } from "date-fns";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export const Route = createFileRoute("/app/analise-ia")({ component: AnaliseIaPage });

function todayISO() { return new Date().toISOString().slice(0, 10); }
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type PeriodoTipo = "mes_atual" | "7d" | "30d" | "mes_anterior" | "trimestre" | "custom";

function AnaliseIaPage() {
  const [tab, setTab] = useState("geral");

  // FILTROS DE PERÍODO
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("mes_atual");
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());

  // ANÁLISE GERAL
  const [resultadoGeral, setResultadoGeral] = useState<string | null>(null);
  const [loadingGeral, setLoadingGeral] = useState(false);
  const [historicoGeral, setHistoricoGeral] = useState<any[]>([]);

  // ANÁLISE POR ATENDENTE
  const [atendenteSel, setAtendenteSel] = useState<string>("");
  const [resultadoAtendente, setResultadoAtendente] = useState<string | null>(null);
  const [loadingAtendente, setLoadingAtendente] = useState(false);
  const [feedbackPos, setFeedbackPos] = useState<string | null>(null);
  const [feedbackNeg, setFeedbackNeg] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // ANÁLISE ESTRATÉGICA (separada)
  const [resultadoEstrategico, setResultadoEstrategico] = useState<string | null>(null);
  const [loadingEstrategico, setLoadingEstrategico] = useState(false);

  const atendentes = useAtendentes();
  const analyzeFn = useServerFn(analyzePeriod);
  const analyzeAtFn = useServerFn(analyzeAtendente);

  function aplicarPeriodo(tipo: PeriodoTipo) {
    setPeriodoTipo(tipo);
    const hoje = new Date();
    if (tipo === "mes_atual") {
      setFrom(startOfMonth(hoje).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "7d") {
      setFrom(subDays(hoje, 7).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "30d") {
      setFrom(subDays(hoje, 30).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "mes_anterior") {
      const prev = subMonths(hoje, 1);
      setFrom(startOfMonth(prev).toISOString().slice(0, 10));
      setTo(endOfMonth(prev).toISOString().slice(0, 10));
    } else if (tipo === "trimestre") {
      setFrom(subDays(hoje, 90).toISOString().slice(0, 10)); setTo(todayISO());
    }
  }

  // Carregar última análise geral e histórico ao montar
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analises_ia")
        .select("id, resultado, criado_em, ia_provedor, ia_modelo, tipo")
        .eq("tipo", "geral")
        .order("criado_em", { ascending: false })
        .limit(10);
      if (data && data.length > 0) {
        setResultadoGeral(data[0].resultado?.texto ?? null);
        setHistoricoGeral(data);
      }
    })();
  }, []);

  // Análise geral — SOBRESCREVE a mais recente (upsert por tipo+período)
  const execGeral = async () => {
    setLoadingGeral(true);
    try {
      const r = await analyzeFn({ data: { periodo: "mes", dataInicio: from, dataFim: to } });
      if (r.ok) {
        setResultadoGeral(r.resultado);
        toast.success("Análise gerada e salva");
        // Recarregar histórico
        const { data } = await supabase
          .from("analises_ia")
          .select("id, resultado, criado_em, ia_provedor, ia_modelo, tipo")
          .eq("tipo", "geral")
          .order("criado_em", { ascending: false })
          .limit(10);
        if (data) setHistoricoGeral(data);
      } else {
        toast.warning(r.resultado);
      }
    } catch (e: any) { toast.error(e.message ?? "Falha ao gerar análise"); }
    finally { setLoadingGeral(false); }
  };

  // Análise por atendente
  const execAtendente = async () => {
    if (!atendenteSel) return toast.error("Selecione um atendente");
    setLoadingAtendente(true);
    setFeedbackPos(null);
    setFeedbackNeg(null);
    try {
      const r = await analyzeAtFn({ data: { atendenteId: atendenteSel } });
      if (r.ok) {
        setResultadoAtendente(r.resultado);
        toast.success("Análise do atendente gerada");
      } else {
        toast.warning(r.resultado);
      }
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
    finally { setLoadingAtendente(false); }
  };

  // Gerar feedback positivo e negativo separados
  const gerarFeedback = async () => {
    if (!resultadoAtendente) return toast.error("Gere a análise primeiro");
    const nomeAtendente = atendentes.find((a) => a.id === atendenteSel)?.nome ?? "Atendente";
    setLoadingFeedback(true);
    try {
      // Prompt para feedback positivo
      const rPos = await analyzeFn({
        data: {
          periodo: "mes",
          dataInicio: from,
          dataFim: to,
          promptOverride: `Com base na análise abaixo do atendente ${nomeAtendente}, escreva um feedback positivo motivador para ser usado em reunião de 1:1. Destaque os pontos fortes, conquistas e comportamentos que devem ser reconhecidos. Seja específico, use exemplos da análise, e mantenha um tom encorajador e profissional. Máximo 200 palavras.\n\nANÁLISE:\n${resultadoAtendente}`,
        },
      });
      if (rPos.ok) setFeedbackPos(rPos.resultado);

      // Prompt para feedback construtivo/negativo
      const rNeg = await analyzeFn({
        data: {
          periodo: "mes",
          dataInicio: from,
          dataFim: to,
          promptOverride: `Com base na análise abaixo do atendente ${nomeAtendente}, escreva um feedback construtivo para ser usado em reunião de 1:1. Aborde os pontos de melhoria de forma empática e objetiva, com sugestões práticas de desenvolvimento. Evite linguagem negativa — foque em oportunidades de crescimento. Máximo 200 palavras.\n\nANÁLISE:\n${resultadoAtendente}`,
        },
      });
      if (rNeg.ok) setFeedbackNeg(rNeg.resultado);

      toast.success("Feedbacks gerados com sucesso");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingFeedback(false); }
  };

  // Análise estratégica (sugestões para próximo trimestre)
  const execEstrategico = async () => {
    setLoadingEstrategico(true);
    try {
      const r = await analyzeFn({
        data: {
          periodo: "trimestre",
          dataInicio: from,
          dataFim: to,
          promptOverride: `Você é um consultor estratégico de operações de suporte. Com base nos dados do período, faça uma análise estratégica contendo:
1. MÉTRICAS SUGERIDAS: quais indicadores deveriam ser monitorados com base nos dados disponíveis
2. BENCHMARKS: onde a operação se compara com padrões do mercado (estime com base nos dados)
3. METAS SUGERIDAS PARA O PRÓXIMO TRIMESTRE: com valores específicos para cada métrica
4. INICIATIVAS PRIORITÁRIAS: top 3 ações que mais impactariam o desempenho
5. RISCOS IDENTIFICADOS: o que pode piorar se não for endereçado
Seja direto, use números e seja acionável.`,
        },
      });
      if (r.ok) {
        setResultadoEstrategico(r.resultado);
        toast.success("Análise estratégica gerada");
      } else {
        toast.warning(r.resultado);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingEstrategico(false); }
  };

  const periodos: { key: PeriodoTipo; label: string }[] = [
    { key: "mes_atual", label: "Mês atual" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "mes_anterior", label: "Mês anterior" },
    { key: "trimestre", label: "Trimestre" },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Central de Análise IA"
        description="Gere insights, avalie atendentes e planeje o próximo trimestre."
      />

      {/* FILTRO DE PERÍODO — global para todas as abas */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {periodos.map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={periodoTipo === p.key ? "default" : "outline"}
                onClick={() => aplicarPeriodo(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2 ml-auto flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">De</label>
              <Input
                type="date" value={from}
                onChange={(e) => { setFrom(e.target.value); setPeriodoTipo("custom"); }}
                className="w-[155px]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Até</label>
              <Input
                type="date" value={to}
                onChange={(e) => { setTo(e.target.value); setPeriodoTipo("custom"); }}
                className="w-[155px]"
              />
            </div>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="geral">
            <Sparkles className="h-4 w-4 mr-2" />Análise geral
          </TabsTrigger>
          <TabsTrigger value="atendentes">
            <Users className="h-4 w-4 mr-2" />Por atendente
          </TabsTrigger>
          <TabsTrigger value="estrategica">
            <TrendingUp className="h-4 w-4 mr-2" />Análise estratégica
          </TabsTrigger>
        </TabsList>

        {/* ABA ANÁLISE GERAL */}
        <TabsContent value="geral">
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise do período
              </h3>
              <Button onClick={execGeral} disabled={loadingGeral}>
                {loadingGeral
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <RefreshCw className="h-4 w-4 mr-2" />}
                {loadingGeral ? "Analisando..." : resultadoGeral ? "Reanalisar" : "Executar análise"}
              </Button>
            </div>

            {resultadoGeral ? (
              <div className="prose prose-sm max-w-none whitespace-pre-line text-sm border rounded-md p-5 bg-muted/20 leading-relaxed">
                {resultadoGeral}
              </div>
            ) : (
              <div className="border rounded-md p-10 text-center text-sm text-muted-foreground bg-muted/10">
                <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>Nenhuma análise gerada ainda para o período selecionado.</p>
                <p className="text-xs mt-1">Clique em "Executar análise" para começar.</p>
              </div>
            )}
          </Card>

          {/* HISTÓRICO */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Histórico de análises</h3>
            {historicoGeral.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma análise salva ainda.</p>
            ) : (
              <div className="space-y-2">
                {historicoGeral.map((h, i) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/30 transition cursor-pointer"
                    onClick={() => setResultadoGeral(h.resultado?.texto)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          Análise geral
                          {i === 0 && <Badge variant="secondary" className="text-xs">Mais recente</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(h.criado_em), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.ia_provedor && <Badge variant="outline">{h.ia_provedor}</Badge>}
                      <Button variant="ghost" size="sm">Abrir</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ABA POR ATENDENTE */}
        <TabsContent value="atendentes">
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Análise individual do atendente
            </h3>
            <div className="flex flex-wrap gap-3 mb-6">
              <Select value={atendenteSel} onValueChange={setAtendenteSel}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Selecione o atendente..." />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={execAtendente} disabled={loadingAtendente || !atendenteSel}>
                {loadingAtendente
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-2" />}
                {loadingAtendente ? "Analisando..." : "Analisar atendente"}
              </Button>
            </div>

            {resultadoAtendente ? (
              <>
                <div className="prose prose-sm max-w-none whitespace-pre-line text-sm border rounded-md p-5 bg-muted/20 leading-relaxed mb-4">
                  {resultadoAtendente}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={gerarFeedback}
                    disabled={loadingFeedback}
                  >
                    {loadingFeedback
                      ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      : <FileText className="h-4 w-4 mr-2" />}
                    Gerar feedbacks para 1:1
                  </Button>
                </div>

                {/* FEEDBACKS GERADOS */}
                {(feedbackPos || feedbackNeg) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {feedbackPos && (
                      <div className="border border-success/30 rounded-md p-4 bg-success/5">
                        <h4 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                          ✅ Feedback positivo
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {feedbackPos}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => navigator.clipboard.writeText(feedbackPos)}
                        >
                          Copiar
                        </Button>
                      </div>
                    )}
                    {feedbackNeg && (
                      <div className="border border-warning/30 rounded-md p-4 bg-warning/5">
                        <h4 className="text-sm font-semibold text-warning-foreground mb-2 flex items-center gap-2">
                          📈 Feedback construtivo
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                          {feedbackNeg}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => navigator.clipboard.writeText(feedbackNeg ?? "")}
                        >
                          Copiar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-md p-10 text-center text-sm text-muted-foreground bg-muted/10">
                <Users className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>Selecione um atendente e clique em "Analisar".</p>
                <p className="text-xs mt-1">A IA avaliará competências, comunicação e gerará feedbacks.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ABA ANÁLISE ESTRATÉGICA */}
        <TabsContent value="estrategica">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Análise estratégica
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Visão de alto nível com sugestão de métricas e metas para o próximo trimestre.
                </p>
              </div>
              <Button onClick={execEstrategico} disabled={loadingEstrategico}>
                {loadingEstrategico
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <TrendingUp className="h-4 w-4 mr-2" />}
                {loadingEstrategico ? "Analisando..." : "Gerar análise estratégica"}
              </Button>
            </div>

            {resultadoEstrategico ? (
              <div className="prose prose-sm max-w-none whitespace-pre-line text-sm border rounded-md p-5 bg-muted/20 leading-relaxed">
                {resultadoEstrategico}
              </div>
            ) : (
              <div className="border rounded-md p-10 text-center text-sm text-muted-foreground bg-muted/10">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Planejamento do próximo trimestre</p>
                <p className="text-xs mt-1">
                  A IA analisa os dados do período, sugere métricas para monitorar,
                  propõe metas com valores específicos e identifica as principais iniciativas.
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
