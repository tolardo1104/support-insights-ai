import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/chatbot-prompt")({ component: ChatbotPrompt });

const VARS = ["{nome_assistente}", "{nome_cliente}", "{empresa_cliente}", "{numero_ticket}"];

function ChatbotPrompt() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [nomeAssistente, setNomeAssistente] = useState("Sofia");
  const [boasVindas, setBoasVindas] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid);
    const { data } = await (supabase as any).from("configuracoes_chatbot").select("prompt_sistema, nome_assistente, mensagem_boas_vindas").eq("organizacao_id", oid).maybeSingle();
    if (data) {
      setPrompt(data.prompt_sistema ?? "");
      setNomeAssistente(data.nome_assistente ?? "Sofia");
      setBoasVindas(data.mensagem_boas_vindas ?? "");
    }
    setLoading(false);
  })(); }, []);

  function inserirVar(v: string) {
    const ta = taRef.current; if (!ta) return;
    const start = ta.selectionStart ?? prompt.length;
    const end = ta.selectionEnd ?? prompt.length;
    setPrompt(prompt.slice(0, start) + v + prompt.slice(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length); }, 0);
  }

  async function salvar() {
    if (!orgId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("configuracoes_chatbot").update({ prompt_sistema: prompt, atualizado_em: new Date().toISOString() }).eq("organizacao_id", orgId);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Prompt salvo");
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const iniciais = (nomeAssistente || "S").slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Editor do prompt</h3>
        <div className="space-y-1">
          <Label>Prompt do sistema</Label>
          <Textarea ref={taRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[300px] font-mono text-sm" />
          <div className="text-xs text-muted-foreground">{prompt.length} caracteres</div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Variáveis disponíveis (clique para inserir):</Label>
          <div className="flex flex-wrap gap-2">
            {VARS.map((v) => (
              <Badge key={v} variant="secondary" className="cursor-pointer hover:bg-accent" onClick={() => inserirVar(v)}>{v}</Badge>
            ))}
          </div>
        </div>
        <Button onClick={salvar} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar prompt
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Preview do chat</h3>
        <div className="border rounded-lg overflow-hidden bg-background">
          <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">{iniciais}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{nomeAssistente}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-green-500" />Online</div>
            </div>
          </div>
          <div className="p-4 space-y-2 min-h-[300px] bg-muted/10">
            <div className="flex"><div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] text-sm">{boasVindas || "Olá! Como posso ajudar?"}</div></div>
            <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%] text-sm">Olá, preciso de ajuda</div></div>
            <div className="flex"><div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 max-w-[80%] text-sm">Claro! Para identificar seu cadastro, poderia me informar seu CPF ou CNPJ?</div></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
