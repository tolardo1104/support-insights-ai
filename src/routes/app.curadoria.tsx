import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/app/curadoria")({ component: CuradoriaPage });

const STATUS_BADGE: Record<string, string> = {
  em_andamento: "bg-yellow-500/15 text-yellow-700",
  resolvido: "bg-green-500/15 text-green-600",
  transbordado: "bg-blue-500/15 text-blue-600",
  falha: "bg-red-500/15 text-red-600",
};
const CUR_BADGE: Record<string, string> = {
  pendente: "bg-muted text-muted-foreground",
  ok: "bg-green-500/15 text-green-600",
  ajuste_necessario: "bg-yellow-500/15 text-yellow-700",
};

function CuradoriaPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("pendente");
  const [periodo, setPeriodo] = useState("30");
  const [aberta, setAberta] = useState<any | null>(null);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [nota, setNota] = useState("");

  async function carregar(oid: string) {
    let q = (supabase as any).from("chatbot_conversas").select("*").eq("organizacao_id", oid).order("criado_em", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("curadoria_status", filtroStatus);
    if (periodo !== "todos") {
      const d = new Date(); d.setDate(d.getDate() - Number(periodo));
      q = q.gte("criado_em", d.toISOString());
    }
    const { data } = await q; setConversas(data ?? []);
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid);
  })(); }, []);
  useEffect(() => { if (orgId) carregar(orgId); }, [orgId, filtroStatus, periodo]);

  const counts = useMemo(() => {
    const all = conversas;
    return {
      pendente: all.filter((c) => c.curadoria_status === "pendente").length,
      ajuste: all.filter((c) => c.curadoria_status === "ajuste_necessario").length,
      ok: all.filter((c) => c.curadoria_status === "ok").length,
    };
  }, [conversas]);

  const insights = useMemo(() => {
    const map: Record<string, number> = {};
    conversas.filter((c) => c.status === "transbordado" || c.status === "falha").forEach((c) => {
      const cat = c.categoria_identificada || "Sem categoria";
      map[cat] = (map[cat] ?? 0) + 1;
      (c.tags_identificadas ?? []).forEach((t: string) => { map[t] = (map[t] ?? 0) + 1; });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [conversas]);

  async function aprovar(id: string) {
    await (supabase as any).from("chatbot_conversas").update({ curadoria_status: "ok", curadoria_nota: null }).eq("id", id);
    toast.success("Aprovado"); if (orgId) await carregar(orgId);
  }
  async function marcarAjuste(id: string, n: string) {
    await (supabase as any).from("chatbot_conversas").update({ curadoria_status: "ajuste_necessario", curadoria_nota: n }).eq("id", id);
    toast.success("Marcado para ajuste"); setNota(""); if (orgId) await carregar(orgId);
  }
  async function abrir(c: any) {
    setAberta(c);
    const { data } = await (supabase as any).from("chatbot_mensagens").select("*").eq("conversa_id", c.id).order("criado_em");
    setMensagens(data ?? []);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Curadoria" description="Revise conversas e melhore o atendimento da IA." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Pendentes de revisão</div><div className="text-2xl font-semibold mt-1">{counts.pendente}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Precisam ajuste</div><div className="text-2xl font-semibold mt-1 text-yellow-600">{counts.ajuste}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Aprovadas</div><div className="text-2xl font-semibold mt-1 text-green-600">{counts.ok}</div></Card>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="ajuste_necessario">Precisam ajuste</SelectItem>
              <SelectItem value="ok">Aprovadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="space-y-3">
        {conversas.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma conversa para curadoria</Card>}
        {conversas.map((c) => (
          <Card key={c.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.nome_cliente || c.numero_telefone || "—"}</span>
                  <Badge variant="outline">{c.canal}</Badge>
                  <Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge>
                  <Badge className={CUR_BADGE[c.curadoria_status]}>{c.curadoria_status}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.criado_em), "dd/MM/yyyy HH:mm")}</span>
                </div>
                {c.resumo_ia && <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.resumo_ia}</div>}
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">Tentativas IA: {c.tentativas_ia ?? 0}</Badge>
                </div>
                {c.curadoria_nota && (
                  <div className="mt-2 p-2 rounded-md bg-yellow-500/10 text-sm text-yellow-800 dark:text-yellow-200">
                    <strong className="text-xs">Nota:</strong> {c.curadoria_nota}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => abrir(c)}>Ver conversa</Button>
                {c.curadoria_status !== "ok" && <>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => aprovar(c.id)}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-yellow-700"><AlertCircle className="h-3.5 w-3.5 mr-1" />Precisa ajuste</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-2">
                      <Textarea placeholder="Nota sobre o ajuste necessário..." value={nota} onChange={(e) => setNota(e.target.value)} rows={3} />
                      <Button size="sm" className="w-full" onClick={() => marcarAjuste(c.id, nota)}>Salvar nota</Button>
                    </PopoverContent>
                  </Popover>
                </>}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 mt-6">
        <h3 className="font-semibold mb-1">Tópicos não resolvidos pela IA</h3>
        <p className="text-sm text-muted-foreground mb-3">Baseado nas conversas com transbordo ou falha, considere adicionar estes tópicos à base de conhecimento.</p>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insights.map(([t, n]) => <Badge key={t} variant="secondary">{t} <span className="ml-1 opacity-60">×{n}</span></Badge>)}
          </div>
        )}
      </Card>

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-2xl">
          {aberta && <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{aberta.nome_cliente || aberta.numero_telefone}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {aberta.resumo_ia && <Card className="p-3 bg-muted/30 text-sm">{aberta.resumo_ia}</Card>}
              <ScrollArea className="max-h-[400px] border rounded-md p-3">
                <div className="space-y-2">
                  {mensagens.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem mensagens</p>}
                  {mensagens.map((m) => {
                    if (m.remetente === "sistema") return <div key={m.id} className="text-xs text-center text-muted-foreground py-1">{m.conteudo}</div>;
                    const isCliente = m.remetente === "cliente";
                    return (
                      <div key={m.id} className={isCliente ? "flex justify-end" : "flex"}>
                        <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${isCliente ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                          {m.conteudo}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              {aberta.ticket_movidesk_id && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://atendimento.movidesk.com/Ticket/Edit/${aberta.ticket_movidesk_id}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />Ver ticket
                  </a>
                </Button>
              )}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
