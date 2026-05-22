import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, ExternalLink, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/app/conversas")({ component: ConversasPage });

const STATUS_BADGE: Record<string, string> = {
  em_andamento: "bg-yellow-500/15 text-yellow-700",
  resolvido: "bg-green-500/15 text-green-600",
  transbordado: "bg-blue-500/15 text-blue-600",
  falha: "bg-red-500/15 text-red-600",
};

function mask(v?: string) {
  if (!v) return "—";
  const clean = v.replace(/\D/g, "");
  if (clean.length < 4) return v;
  return "***." + clean.slice(-4);
}

function ConversasPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [canal, setCanal] = useState("todos");
  const [periodo, setPeriodo] = useState("30");
  const [aberta, setAberta] = useState<any | null>(null);
  const [mensagens, setMensagens] = useState<any[]>([]);

  async function carregar(oid: string) {
    let q = (supabase as any).from("chatbot_conversas").select("*").eq("organizacao_id", oid).order("criado_em", { ascending: false });
    if (status !== "todos") q = q.eq("status", status);
    if (canal !== "todos") q = q.eq("canal", canal);
    if (periodo !== "todos") {
      const dias = Number(periodo);
      const d = new Date(); d.setDate(d.getDate() - dias);
      q = q.gte("criado_em", d.toISOString());
    }
    const { data } = await q;
    setConversas(data ?? []);
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid);
  })(); }, []);
  useEffect(() => { if (orgId) carregar(orgId); }, [orgId, status, canal, periodo]);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return conversas;
    return conversas.filter((c) =>
      (c.nome_cliente ?? "").toLowerCase().includes(b) ||
      (c.cpf_cnpj ?? "").toLowerCase().includes(b) ||
      (c.numero_telefone ?? "").toLowerCase().includes(b),
    );
  }, [busca, conversas]);

  async function abrir(c: any) {
    setAberta(c);
    const { data } = await (supabase as any).from("chatbot_mensagens").select("*").eq("conversa_id", c.id).order("criado_em");
    setMensagens(data ?? []);
  }

  async function marcarCuradoria(id: string) {
    await (supabase as any).from("chatbot_conversas").update({ curadoria_status: "ajuste_necessario" }).eq("id", id);
    toast.success("Marcada para curadoria"); if (orgId) await carregar(orgId);
  }
  function copiarLink(id: string) {
    const url = `${window.location.origin}${window.location.pathname}?conversa=${id}`;
    navigator.clipboard.writeText(url); toast.success("Link copiado");
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Conversas" description="Histórico de atendimentos realizados pelo chatbot." />

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Buscar por nome, CPF/CNPJ ou telefone..." value={busca} onChange={(e) => setBusca(e.target.value)} className="md:col-span-1" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="transbordado">Transbordado</SelectItem>
              <SelectItem value="falha">Falha</SelectItem>
            </SelectContent>
          </Select>
          <Select value={canal} onValueChange={setCanal}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow>
            <TableHead></TableHead><TableHead>Cliente</TableHead><TableHead>CPF/CNPJ</TableHead><TableHead>Status</TableHead>
            <TableHead>Tentativas IA</TableHead><TableHead>Ticket</TableHead><TableHead>Data</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtradas.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conversa encontrada</TableCell></TableRow>}
            {filtradas.map((c) => (
              <TableRow key={c.id}>
                <TableCell><MessageCircle className="h-4 w-4 text-muted-foreground" /></TableCell>
                <TableCell>{c.nome_cliente || c.numero_telefone || "—"}</TableCell>
                <TableCell className="text-xs font-mono">{mask(c.cpf_cnpj)}</TableCell>
                <TableCell><Badge className={STATUS_BADGE[c.status] ?? "bg-muted"}>{c.status}</Badge></TableCell>
                <TableCell>{c.tentativas_ia ?? 0}</TableCell>
                <TableCell>{c.ticket_movidesk_numero ? <span className="font-mono text-xs">#{c.ticket_movidesk_numero}</span> : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(c.criado_em), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => abrir(c)}>Ver</Button>
                    <Button variant="ghost" size="sm" onClick={() => marcarCuradoria(c.id)}><AlertCircle className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!aberta} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="max-w-2xl">
          {aberta && <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {aberta.nome_cliente || aberta.numero_telefone}
                <Badge className={STATUS_BADGE[aberta.status]}>{aberta.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>CPF/CNPJ: {mask(aberta.cpf_cnpj)}</div>
                <div>Telefone: {aberta.numero_telefone || "—"}</div>
                <div>Canal: {aberta.canal}</div>
                <div>Ticket: {aberta.ticket_movidesk_numero ? `#${aberta.ticket_movidesk_numero}` : "—"}</div>
                <div>Início: {format(new Date(aberta.criado_em), "dd/MM/yyyy HH:mm")}</div>
                <div>Fim: {aberta.encerrado_em ? format(new Date(aberta.encerrado_em), "dd/MM/yyyy HH:mm") : "—"}</div>
              </div>
              {(aberta.tags_identificadas ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">{aberta.tags_identificadas.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
              )}
              {aberta.resumo_ia && (
                <Card className="p-3 bg-muted/30"><div className="text-xs font-medium mb-1">Resumo da IA</div><div className="text-sm">{aberta.resumo_ia}</div></Card>
              )}
              <ScrollArea className="max-h-[400px] border rounded-md p-3">
                <div className="space-y-2">
                  {mensagens.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem mensagens</p>}
                  {mensagens.map((m) => {
                    if (m.remetente === "sistema") return <div key={m.id} className="text-xs text-center text-muted-foreground py-1">{m.conteudo}</div>;
                    const isCliente = m.remetente === "cliente";
                    return (
                      <div key={m.id} className={isCliente ? "flex justify-end" : "flex"}>
                        <div className={`rounded-2xl px-3 py-2 max-w-[80%] text-sm ${isCliente ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                          <div>{m.conteudo}</div>
                          <div className={`text-[10px] mt-1 ${isCliente ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(new Date(m.criado_em), "HH:mm")}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-2">
                  {aberta.ticket_movidesk_id && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://atendimento.movidesk.com/Ticket/Edit/${aberta.ticket_movidesk_id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />Ver ticket
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => copiarLink(aberta.id)}><Copy className="h-3.5 w-3.5 mr-1" />Copiar link</Button>
                </div>
                <Button size="sm" onClick={() => marcarCuradoria(aberta.id)}><AlertCircle className="h-3.5 w-3.5 mr-1" />Marcar para curadoria</Button>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
