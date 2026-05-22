import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/chatbot")({ component: ChatbotConfig });

const DIAS = [
  { v: "seg", l: "Seg" }, { v: "ter", l: "Ter" }, { v: "qua", l: "Qua" },
  { v: "qui", l: "Qui" }, { v: "sex", l: "Sex" }, { v: "sab", l: "Sáb" }, { v: "dom", l: "Dom" },
];
const FONTES = [
  { v: "arquivos", l: "Arquivos (base de conhecimento)" },
  { v: "faq", l: "FAQ rápido" },
  { v: "url", l: "URL externa" },
];

function ChatbotConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<any>({
    ativo: false,
    nome_assistente: "Sofia",
    mensagem_boas_vindas: "",
    mensagem_transbordo: "",
    mensagem_fora_horario: "",
    mensagem_cliente_nao_encontrado: "",
    max_tentativas: 3,
    transbordo_palavra_chave: true,
    palavras_urgencia: [] as string[],
    horario_inicio: "08:00",
    horario_fim: "18:00",
    dias_semana: [] as string[],
    acao_fora_horario: "ticket",
    fontes_conhecimento: [] as string[],
    url_conhecimento: "",
  });

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id;
    if (!oid) return;
    setOrgId(oid);
    const { data } = await (supabase as any).from("configuracoes_chatbot").select("*").eq("organizacao_id", oid).maybeSingle();
    if (data) setCfg({ ...data, horario_inicio: (data.horario_inicio ?? "08:00").slice(0,5), horario_fim: (data.horario_fim ?? "18:00").slice(0,5) });
    setLoading(false);
  })(); }, []);

  const update = (patch: any) => setCfg((c: any) => ({ ...c, ...patch }));
  const togDia = (d: string) => update({ dias_semana: cfg.dias_semana.includes(d) ? cfg.dias_semana.filter((x: string) => x !== d) : [...cfg.dias_semana, d] });
  const togFonte = (f: string) => update({ fontes_conhecimento: cfg.fontes_conhecimento.includes(f) ? cfg.fontes_conhecimento.filter((x: string) => x !== f) : [...cfg.fontes_conhecimento, f] });

  async function salvar() {
    if (!orgId) return;
    setSaving(true);
    const payload = {
      ...cfg,
      organizacao_id: orgId,
      palavras_urgencia: Array.isArray(cfg.palavras_urgencia) ? cfg.palavras_urgencia : String(cfg.palavras_urgencia ?? "").split("\n").map((s: string) => s.trim()).filter(Boolean),
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await (supabase as any).from("configuracoes_chatbot").upsert(payload, { onConflict: "organizacao_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas");
  }

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">Status e identidade</h3>
            <Badge className={cfg.ativo ? "bg-green-500/15 text-green-600" : "bg-muted text-muted-foreground"}>{cfg.ativo ? "Ativo" : "Inativo"}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ativo">Chatbot ativo</Label>
            <Switch id="ativo" checked={cfg.ativo} onCheckedChange={(v) => update({ ativo: v })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Nome do assistente</Label>
          <Input value={cfg.nome_assistente ?? ""} onChange={(e) => update({ nome_assistente: e.target.value })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Fontes de conhecimento</h3>
        <div className="space-y-2">
          {FONTES.map((f) => (
            <label key={f.v} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={cfg.fontes_conhecimento?.includes(f.v)} onCheckedChange={() => togFonte(f.v)} />
              <span className="text-sm">{f.l}</span>
            </label>
          ))}
        </div>
        {cfg.fontes_conhecimento?.includes("url") && (
          <div className="space-y-1">
            <Label>URL da base de conhecimento</Label>
            <Input value={cfg.url_conhecimento ?? ""} onChange={(e) => update({ url_conhecimento: e.target.value })} placeholder="https://..." />
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Mensagens</h3>
        <div className="space-y-1"><Label>Mensagem de boas-vindas</Label>
          <Input value={cfg.mensagem_boas_vindas ?? ""} onChange={(e) => update({ mensagem_boas_vindas: e.target.value })} />
        </div>
        <div className="space-y-1"><Label>Mensagem ao transferir para humano</Label>
          <Input value={cfg.mensagem_transbordo ?? ""} onChange={(e) => update({ mensagem_transbordo: e.target.value })} />
        </div>
        <div className="space-y-1"><Label>Mensagem fora do horário</Label>
          <Textarea value={cfg.mensagem_fora_horario ?? ""} onChange={(e) => update({ mensagem_fora_horario: e.target.value })} />
        </div>
        <div className="space-y-1"><Label>Mensagem quando cliente não encontrado</Label>
          <Input value={cfg.mensagem_cliente_nao_encontrado ?? ""} onChange={(e) => update({ mensagem_cliente_nao_encontrado: e.target.value })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Regras de transbordo</h3>
        <div className="space-y-1"><Label>Máximo de tentativas antes do transbordo</Label>
          <Input type="number" min={1} max={10} value={cfg.max_tentativas ?? 3} onChange={(e) => update({ max_tentativas: Number(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Transbordar imediatamente se cliente pedir atendente</Label>
          <Switch checked={cfg.transbordo_palavra_chave} onCheckedChange={(v) => update({ transbordo_palavra_chave: v })} />
        </div>
        {cfg.transbordo_palavra_chave && (
          <div className="space-y-1"><Label>Palavras que acionam transbordo imediato (uma por linha)</Label>
            <Textarea
              rows={5}
              value={(cfg.palavras_urgencia ?? []).join("\n")}
              onChange={(e) => update({ palavras_urgencia: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">Horário de atendimento humano</h3>
        <div className="flex flex-wrap gap-3">
          {DIAS.map((d) => (
            <label key={d.v} className="flex items-center gap-1 cursor-pointer">
              <Checkbox checked={cfg.dias_semana?.includes(d.v)} onCheckedChange={() => togDia(d.v)} />
              <span className="text-sm">{d.l}</span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Início</Label>
            <Input type="time" value={cfg.horario_inicio} onChange={(e) => update({ horario_inicio: e.target.value })} />
          </div>
          <div className="space-y-1"><Label>Fim</Label>
            <Input type="time" value={cfg.horario_fim} onChange={(e) => update({ horario_fim: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1"><Label>Fora do horário</Label>
          <Select value={cfg.acao_fora_horario} onValueChange={(v) => update({ acao_fora_horario: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ticket">Criar ticket e avisar cliente</SelectItem>
              <SelectItem value="mensagem">IA continua sem transbordo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Button onClick={salvar} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Salvar configurações
      </Button>
    </div>
  );
}
