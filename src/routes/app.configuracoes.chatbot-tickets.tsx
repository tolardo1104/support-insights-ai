import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/chatbot-tickets")({ component: ChatbotTickets });

function ChatbotTickets() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [m, setM] = useState<any>({
    categoria_padrao: "", servico_padrao: "", urgencia_padrao: "Normal", responsavel_bot: "Atendimento Bot",
    prompt_titulo: "", prompt_descricao: "", tags_bot: [], ticket_status_ia_resolve: "fechado",
  });

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid);
    const { data } = await (supabase as any).from("chatbot_mapeamento_tickets").select("*").eq("organizacao_id", oid).maybeSingle();
    if (data) setM(data);
    setLoading(false);
  })(); }, []);

  const up = (p: any) => setM((s: any) => ({ ...s, ...p }));

  async function salvar() {
    if (!orgId) return;
    setSaving(true);
    const payload = {
      ...m, organizacao_id: orgId,
      tags_bot: Array.isArray(m.tags_bot) ? m.tags_bot : String(m.tags_bot ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("chatbot_mapeamento_tickets").upsert(payload, { onConflict: "organizacao_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Mapeamento salvo");
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Campos padrão do ticket</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Categoria padrão</Label><Input value={m.categoria_padrao ?? ""} onChange={(e) => up({ categoria_padrao: e.target.value })} /></div>
          <div className="space-y-1"><Label>Serviço padrão</Label><Input value={m.servico_padrao ?? ""} onChange={(e) => up({ servico_padrao: e.target.value })} /></div>
          <div className="space-y-1"><Label>Urgência padrão</Label>
            <Select value={m.urgencia_padrao} onValueChange={(v) => up({ urgencia_padrao: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem><SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem><SelectItem value="Urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Responsável (nome do agente bot na Movidesk)</Label><Input value={m.responsavel_bot ?? ""} onChange={(e) => up({ responsavel_bot: e.target.value })} /></div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Prompts de geração automática</h3>
          <p className="text-sm text-muted-foreground">A IA usará estes prompts para gerar título e descrição do ticket automaticamente</p>
        </div>
        <div className="space-y-1"><Label>Prompt para gerar título do ticket</Label>
          <Textarea rows={3} value={m.prompt_titulo ?? ""} onChange={(e) => up({ prompt_titulo: e.target.value })} />
        </div>
        <div className="space-y-1"><Label>Prompt para gerar descrição do ticket</Label>
          <Textarea rows={4} value={m.prompt_descricao ?? ""} onChange={(e) => up({ prompt_descricao: e.target.value })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Tags e status</h3>
        <div className="space-y-1"><Label>Tags automáticas (separadas por vírgula)</Label>
          <Input
            value={Array.isArray(m.tags_bot) ? m.tags_bot.join(", ") : m.tags_bot ?? ""}
            onChange={(e) => up({ tags_bot: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </div>
        <div className="space-y-1"><Label>Status do ticket quando IA resolver</Label>
          <Select value={m.ticket_status_ia_resolve} onValueChange={(v) => up({ ticket_status_ia_resolve: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fechado">Resolvido (fechado automaticamente)</SelectItem>
              <SelectItem value="aberto">Em atendimento (aberto para revisão)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Button onClick={salvar} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar mapeamento
      </Button>
    </div>
  );
}
