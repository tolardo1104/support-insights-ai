import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Zap, Globe, Cpu } from "lucide-react";

export const Route = createFileRoute("/app/configuracoes/ia")({ component: IAConfig });

const provedores = [
  { id: "claude", nome: "Anthropic Claude", icon: Sparkles, tag: "Melhor análise", modelos: ["claude-sonnet-4", "claude-opus-4"], help: "https://console.anthropic.com" },
  { id: "openai", nome: "OpenAI", icon: Cpu, tag: "Popular", modelos: ["gpt-4o", "gpt-4o-mini"], help: "https://platform.openai.com/api-keys" },
  { id: "gemini", nome: "Google Gemini", icon: Globe, tag: "Tem tier gratuito", modelos: ["gemini-2.0-flash", "gemini-1.5-pro"], help: "https://aistudio.google.com/apikey" },
  { id: "groq", nome: "Meta LLaMA via Groq", icon: Zap, tag: "Gratuito", modelos: ["llama-3.3-70b-versatile"], help: "https://console.groq.com/keys" },
];

const PROMPT_GERAL = `Você é um especialista em gestão de suporte ao cliente. Analise os dados abaixo referentes ao período e identifique: 1) Visão geral do desempenho 2) Padrões de problemas recorrentes por categoria 3) Atendentes que merecem destaque e os que precisam de atenção 4) Clientes com alto volume de chamados (risco de churn) 5) Oportunidades de melhoria de processo 6) Sugestões de conteúdo self-service para reduzir volume. Seja direto, use linguagem simples, com recomendações práticas e acionáveis. Responda em português do Brasil.`;
const PROMPT_ATEND = `Você é um especialista em qualidade de atendimento. Analise as conversas abaixo do atendente {NOME} e avalie de 0 a 10 cada dimensão: 1) Escuta ativa 2) Clareza 3) Conhecimento técnico 4) Empatia/tom 5) Agilidade 6) Seguimento. Para cada dimensão: nota (0-10), 1 ponto forte, 1 ponto de melhoria com exemplo real. Classificação final: Destaque / Regular / Atenção necessária. Retorne JSON com estrutura: {classificacao, dimensoes: [{nome, nota, ponto_forte, ponto_melhoria, exemplo}], resumo, plano_desenvolvimento: [{prioridade, titulo, descricao}]}.`;

function IAConfig() {
  const [provedor, setProvedor] = useState("gemini");
  const [modelo, setModelo] = useState("gemini-2.0-flash");
  const sel = provedores.find((p) => p.id === provedor)!;

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
            <Input type="password" placeholder="••••••••••••••••" />
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
            <Select defaultValue="manual">
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
            <Select defaultValue="20">
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
            <Select defaultValue="pt-BR">
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
            <Textarea defaultValue={PROMPT_GERAL} className="min-h-[140px] font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Prompt — Análise por atendente</Label>
            <Textarea defaultValue={PROMPT_ATEND} className="min-h-[160px] font-mono text-xs" />
          </div>
          <Button onClick={() => toast.success("Configurações de IA salvas")}>Salvar configurações</Button>
        </div>
      </Card>
    </div>
  );
}
