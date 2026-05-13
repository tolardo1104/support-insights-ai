import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Zap, Globe, Cpu, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/ia")({ component: IAConfig });

const provedores = [
  { id: "claude", nome: "Anthropic Claude", icon: Sparkles, tag: "Melhor análise", modelos: ["claude-3-5-sonnet-latest", "claude-3-opus-latest"], help: "https://console.anthropic.com" },
  { id: "openai", nome: "OpenAI", icon: Cpu, tag: "Popular", modelos: ["gpt-4o", "gpt-4o-mini"], help: "https://platform.openai.com/api-keys" },
  { id: "gemini", nome: "Google Gemini", icon: Globe, tag: "Tem tier gratuito", modelos: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"], help: "https://aistudio.google.com/apikey" },
  { id: "groq", nome: "Meta LLaMA via Groq", icon: Zap, tag: "Gratuito", modelos: ["llama-3.3-70b-versatile"], help: "https://console.groq.com/keys" },
];

const PROMPT_GERAL = `Você é um especialista em gestão de suporte ao cliente. Analise os dados abaixo referentes ao período e identifique: 1) Visão geral do desempenho 2) Padrões de problemas recorrentes por categoria 3) Atendentes que merecem destaque e os que precisam de atenção 4) Clientes com alto volume de chamados (risco de churn) 5) Oportunidades de melhoria de processo 6) Sugestões de conteúdo self-service para reduzir volume. Seja direto, use linguagem simples, com recomendações práticas e acionáveis. Responda em português do Brasil.`;
const PROMPT_ATEND = `Você é um especialista em qualidade de atendimento. Analise as conversas abaixo do atendente {NOME} e avalie de 0 a 10 cada dimensão: 1) Escuta ativa 2) Clareza 3) Conhecimento técnico 4) Empatia/tom 5) Agilidade 6) Seguimento. Para cada dimensão: nota (0-10), 1 ponto forte, 1 ponto de melhoria com exemplo real. Classificação final: Destaque / Regular / Atenção necessária. Retorne JSON com estrutura: {classificacao, dimensoes: [{nome, nota, ponto_forte, ponto_melhoria, exemplo}], resumo, plano_desenvolvimento: [{prioridade, titulo, descricao}]}.`;

function IAConfig() {
  const [provedor, setProvedor] = useState("gemini");
  const [modelo, setModelo] = useState("gemini-2.0-flash");
  const [apiKey, setApiKey] = useState("");
  const [analiseAuto, setAnaliseAuto] = useState("manual");
  const [ticketsPorAnalise, setTicketsPorAnalise] = useState("20");
  const [idioma, setIdioma] = useState("pt-BR");
  const [promptGeral, setPromptGeral] = useState(PROMPT_GERAL);
  const [promptAtendente, setPromptAtendente] = useState(PROMPT_ATEND);
  const [saving, setSaving] = useState(false);

  const sel = provedores.find((p) => p.id === provedor) || provedores[2];

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("ia_provedor, ia_modelo, ia_api_key, ia_analise_automatica, ia_tickets_analisados, ia_idioma, ia_prompt_analise_geral, ia_prompt_analise_atendente")
        .maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (data) {
        if (data.ia_provedor) setProvedor(data.ia_provedor);
        if (data.ia_modelo) setModelo(data.ia_modelo);
        if (data.ia_api_key) setApiKey(data.ia_api_key);
        if (data.ia_analise_automatica) setAnaliseAuto(data.ia_analise_automatica);
        if (data.ia_tickets_analisados !== null) setTicketsPorAnalise(String(data.ia_tickets_analisados));
        else if (data.ia_tickets_analisados === null) setTicketsPorAnalise("all");
        if (data.ia_idioma) setIdioma(data.ia_idioma);
        if (data.ia_prompt_analise_geral) setPromptGeral(data.ia_prompt_analise_geral);
        if (data.ia_prompt_analise_atendente) setPromptAtendente(data.ia_prompt_analise_atendente);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return toast.error("Sessão expirada"); }
    const { data: prof, error: pErr } = await supabase
      .from("profiles").select("organizacao_id").eq("id", user.id).single();
    if (pErr || !prof?.organizacao_id) { setSaving(false); return toast.error(pErr?.message ?? "Organização não encontrada"); }

    const { error } = await supabase.from("configuracoes").update({
      ia_provedor: provedor,
      ia_modelo: modelo,
      ia_api_key: apiKey,
      ia_analise_automatica: analiseAuto,
      ia_tickets_analisados: ticketsPorAnalise === "all" ? null : Number(ticketsPorAnalise),
      ia_idioma: idioma,
      ia_prompt_analise_geral: promptGeral,
      ia_prompt_analise_atendente: promptAtendente,
    }).eq("organizacao_id", prof.organizacao_id);

    setSaving(false);
    error ? toast.error(error.message) : toast.success("Configurações de IA salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Provedor de IA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {provedores.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProvedor(p.id); setModelo(p.modelos[0]); }}
              className={cn(
                "text-left border rounded-lg p-4 transition",
                provedor === p.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between">
                <p.icon className="h-5 w-5 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.tag}</span>
              </div>
              <div className="font-medium mt-2">{p.nome}</div>
              <div className="text-xs text-muted-foreground font-mono mt-1">{p.modelos.join(" · ")}</div>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>API Key</Label>
              <a href={sel.help} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">onde obter esta chave</a>
            </div>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••••••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={modelo} onValueChange={setModelo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {sel.modelos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Configurações de uso</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Análise automática</Label>
            <Select value={analiseAuto} onValueChange={setAnaliseAuto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="sync">A cada sync</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tickets por análise</Label>
            <Select value={ticketsPorAnalise} onValueChange={setTicketsPorAnalise}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 tickets</SelectItem>
                <SelectItem value="20">20 tickets</SelectItem>
                <SelectItem value="50">50 tickets</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select value={idioma} onValueChange={setIdioma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (BR)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Prompts</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt — Análise geral do período</Label>
            <Textarea value={promptGeral} onChange={(e) => setPromptGeral(e.target.value)} className="min-h-[140px] font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Prompt — Análise por atendente</Label>
            <Textarea value={promptAtendente} onChange={(e) => setPromptAtendente(e.target.value)} className="min-h-[160px] font-mono text-xs" />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar configurações
          </Button>
        </div>
      </Card>
    </div>
  );
}
