import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Phone, Pencil, Trash2, CheckCircle, RefreshCw, MessageCircle, QrCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { conectarEvolutionQR, checarStatusEvolution } from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/app/whatsapp")({ component: WhatsAppPage });

const PROVEDORES = [
  { v: "uazapi", l: "UAZAPI — QR Code (tem plano grátis) ⭐" },
  { v: "evolution_qr", l: "Evolution API — QR Code (self-hosted)" },
  { v: "evolution_official", l: "Evolution API — Meta Oficial" },
  { v: "zapi", l: "Z-API" },
  { v: "meta_oficial", l: "Meta API Oficial" },
  { v: "sidobe", l: "Sidobe" },
  { v: "outro", l: "Outro" },
];

const STATUS_BADGE: Record<string, string> = {
  conectado: "bg-green-500/15 text-green-600",
  desconectado: "bg-red-500/15 text-red-600",
  aguardando_qr: "bg-yellow-500/15 text-yellow-700",
  erro: "bg-orange-500/15 text-orange-600",
};

function emptyForm() {
  return { nome: "", provedor: "uazapi", numero_telefone: "", url_servidor: "", api_key_provedor: "", instance_name: "", webhook_url: "" };
}

function WhatsAppPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [conexoes, setConexoes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  async function carregar(oid: string) {
    const { data } = await (supabase as any).from("conexoes_whatsapp").select("*").eq("organizacao_id", oid).order("criado_em", { ascending: false });
    setConexoes(data ?? []);
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid); await carregar(oid);
  })(); }, []);

  function novo() { setEditId(null); setForm(emptyForm()); setOpen(true); }
  function editar(c: any) {
    setEditId(c.id);
    setForm({
      nome: c.nome ?? "", provedor: c.provedor, numero_telefone: c.numero_telefone ?? "",
      url_servidor: c.url_servidor ?? "", api_key_provedor: c.api_key_provedor ?? "",
      instance_name: c.instance_name ?? "", webhook_url: c.webhook_url ?? "",
    });
    setOpen(true);
  }
  async function salvar() {
    if (!orgId) return;
    if (!form.nome) return toast.error("Informe o nome da conexão");
    const payload = { ...form, organizacao_id: orgId, atualizado_em: new Date().toISOString() };
    const { error } = editId
      ? await (supabase as any).from("conexoes_whatsapp").update(payload).eq("id", editId)
      : await (supabase as any).from("conexoes_whatsapp").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Conexão salva"); setOpen(false); await carregar(orgId);
  }
  async function excluir(id: string) {
    await (supabase as any).from("conexoes_whatsapp").delete().eq("id", id);
    toast.success("Excluído"); if (orgId) await carregar(orgId);
  }
  async function definirAtiva(id: string) {
    if (!orgId) return;
    await (supabase as any).from("conexoes_whatsapp").update({ ativo: false }).eq("organizacao_id", orgId);
    await (supabase as any).from("conexoes_whatsapp").update({ ativo: true }).eq("id", id);
    toast.success("Conexão ativa definida"); await carregar(orgId);
  }
  const conectarFn = useServerFn(conectarEvolutionQR);
  const statusFn = useServerFn(checarStatusEvolution);
  const [conectandoId, setConectandoId] = useState<string | null>(null);

  async function conectarQR(c: any) {
    if (c.provedor !== "evolution_qr") {
      return toast.error("Geração de QR só está disponível para Evolution API — QR Code");
    }
    if (!c.url_servidor || !c.api_key_provedor || !c.instance_name) {
      return toast.error("Configure URL, API Key e nome da instância antes de conectar");
    }
    try {
      setConectandoId(c.id);
      await conectarFn({ data: { conexaoId: c.id } });
      toast.success("QR Code gerado. Escaneie com o WhatsApp.");
      if (orgId) await carregar(orgId);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar QR Code");
    } finally {
      setConectandoId(null);
    }
  }

  async function reconectar(c: any) {
    await conectarQR(c);
  }

  // Polling de status enquanto há conexão aguardando QR
  useEffect(() => {
    const aguardando = conexoes.filter((c) => c.status === "aguardando_qr" && c.provedor === "evolution_qr");
    if (aguardando.length === 0) return;
    const interval = setInterval(async () => {
      for (const c of aguardando) {
        try {
          const r: any = await statusFn({ data: { conexaoId: c.id } });
          if (r?.status === "conectado") {
            toast.success(`${c.nome} conectado!`);
            if (orgId) await carregar(orgId);
          }
        } catch { /* ignore */ }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [conexoes, orgId, statusFn]);

  const up = (p: any) => setForm((f) => ({ ...f, ...p }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="WhatsApp"
        description="Gerencie as conexões do seu número de WhatsApp."
        actions={<Button onClick={novo}><Plus className="h-4 w-4 mr-1" />Nova conexão</Button>}
      />

      {conexoes.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium mb-1">Nenhuma conexão configurada</p>
          <p className="text-sm text-muted-foreground mb-4">Configure sua primeira conexão de WhatsApp para começar.</p>
          <Button onClick={novo}><Plus className="h-4 w-4 mr-1" />Adicionar primeira conexão</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conexoes.map((c) => (
            <Card key={c.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {c.nome}
                    {c.ativo && <Badge className="bg-primary/15 text-primary">Ativa</Badge>}
                  </div>
                  <Badge className={STATUS_BADGE[c.status] ?? "bg-muted"}>{c.status}</Badge>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{c.numero_telefone || "Não configurado"}</span></div>
                <div className="text-xs text-muted-foreground">{PROVEDORES.find((p) => p.v === c.provedor)?.l ?? c.provedor}</div>
              </div>
              {c.status === "aguardando_qr" && c.qr_code_base64 && (
                <div className="text-center space-y-1 border rounded-md p-3 bg-muted/30">
                  <img src={`data:image/png;base64,${c.qr_code_base64}`} alt="QR Code" className="mx-auto" style={{ width: 200, height: 200 }} />
                  <p className="text-xs text-muted-foreground">Escaneie com o WhatsApp</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => editar(c)}><Pencil className="h-3.5 w-3.5 mr-1" />Editar</Button>
                <Button variant="outline" size="sm" onClick={() => definirAtiva(c.id)} disabled={c.ativo}><CheckCircle className="h-3.5 w-3.5 mr-1" />Definir como ativa</Button>
                {c.provedor === "evolution_qr" && c.status !== "conectado" && (
                  <Button size="sm" onClick={() => conectarQR(c)} disabled={conectandoId === c.id}>
                    {conectandoId === c.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <QrCode className="h-3.5 w-3.5 mr-1" />}
                    {c.qr_code_base64 ? "Gerar novo QR" : "Conectar / Gerar QR"}
                  </Button>
                )}
                {(c.status === "desconectado" || c.status === "erro") && c.provedor !== "evolution_qr" && (
                  <Button variant="outline" size="sm" onClick={() => reconectar(c)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Reconectar</Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Excluir conexão?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir(c.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} conexão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Provedor</Label>
              <Select value={form.provedor} onValueChange={(v) => up({ provedor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROVEDORES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Nome da conexão</Label><Input value={form.nome} onChange={(e) => up({ nome: e.target.value })} /></div>
            <div className="space-y-1"><Label>Número de telefone</Label><Input value={form.numero_telefone} onChange={(e) => up({ numero_telefone: e.target.value })} placeholder="5547999999999" /></div>

            {form.provedor === "evolution_qr" && <>
              <div className="space-y-1"><Label>URL do servidor Evolution API</Label><Input value={form.url_servidor} onChange={(e) => up({ url_servidor: e.target.value })} placeholder="https://meu-evolution.com" /></div>
              <div className="space-y-1"><Label>API Key global do servidor</Label><Input value={form.api_key_provedor} onChange={(e) => up({ api_key_provedor: e.target.value })} /></div>
              <div className="space-y-1"><Label>Nome da instância</Label><Input value={form.instance_name} onChange={(e) => up({ instance_name: e.target.value })} placeholder="5547999999999" /></div>
            </>}
            {form.provedor === "evolution_official" && <>
              <div className="space-y-1"><Label>URL do servidor Evolution API</Label><Input value={form.url_servidor} onChange={(e) => up({ url_servidor: e.target.value })} /></div>
              <div className="space-y-1"><Label>API Key global</Label><Input value={form.api_key_provedor} onChange={(e) => up({ api_key_provedor: e.target.value })} /></div>
              <div className="space-y-1"><Label>Number ID do WhatsApp</Label><Input value={form.instance_name} onChange={(e) => up({ instance_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Business ID</Label><Input value={form.webhook_url} onChange={(e) => up({ webhook_url: e.target.value })} /></div>
            </>}
            {form.provedor === "zapi" && <>
              <div className="space-y-1"><Label>Instance ID</Label><Input value={form.instance_name} onChange={(e) => up({ instance_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Token Z-API</Label><Input value={form.api_key_provedor} onChange={(e) => up({ api_key_provedor: e.target.value })} /></div>
            </>}
            {form.provedor === "meta_oficial" && <>
              <div className="space-y-1"><Label>Token de acesso</Label><Input value={form.api_key_provedor} onChange={(e) => up({ api_key_provedor: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone Number ID</Label><Input value={form.instance_name} onChange={(e) => up({ instance_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>WhatsApp Business Account ID</Label><Input value={form.numero_telefone} onChange={(e) => up({ numero_telefone: e.target.value })} /></div>
            </>}
            {(form.provedor === "sidobe" || form.provedor === "outro") && <>
              <div className="space-y-1"><Label>URL base da API</Label><Input value={form.url_servidor} onChange={(e) => up({ url_servidor: e.target.value })} /></div>
              <div className="space-y-1"><Label>API Key / Token</Label><Input value={form.api_key_provedor} onChange={(e) => up({ api_key_provedor: e.target.value })} /></div>
            </>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
