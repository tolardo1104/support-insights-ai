import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/chatbot-regras")({ component: ChatbotRegras });

type TipoRegra = "urgencia" | "tag" | "categoria";

const TIPOS: { tipo: TipoRegra; titulo: string; desc: string; campoLabel: string; selecionavel?: { v: string; l: string }[] }[] = [
  { tipo: "urgencia", titulo: "Regras de urgência", desc: "Define urgência do ticket quando a mensagem contém palavras específicas", campoLabel: "Urgência",
    selecionavel: [ { v: "Baixa", l: "Baixa" }, { v: "Normal", l: "Normal" }, { v: "Alta", l: "Alta" }, { v: "Urgente", l: "Urgente" } ] },
  { tipo: "tag", titulo: "Regras de tag", desc: "Adiciona tags automaticamente baseado em palavras-chave", campoLabel: "Tag a adicionar" },
  { tipo: "categoria", titulo: "Regras de categoria", desc: "Define a categoria do ticket baseado em palavras-chave", campoLabel: "Categoria" },
];

function ChatbotRegras() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [regras, setRegras] = useState<any[]>([]);

  async function carregar(oid: string) {
    const { data } = await (supabase as any).from("chatbot_regras").select("*").eq("organizacao_id", oid).order("criado_em", { ascending: false });
    setRegras(data ?? []);
  }
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid); await carregar(oid);
  })(); }, []);

  return (
    <div className="space-y-6">
      {TIPOS.map((t) => (
        <SecaoRegra key={t.tipo} cfg={t} orgId={orgId} regras={regras.filter((r) => r.tipo === t.tipo)} onChange={() => orgId && carregar(orgId)} />
      ))}
    </div>
  );
}

function SecaoRegra({ cfg, orgId, regras, onChange }: { cfg: typeof TIPOS[number]; orgId: string | null; regras: any[]; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [palavras, setPalavras] = useState("");
  const [valor, setValor] = useState(cfg.selecionavel?.[1].v ?? "");

  async function salvar() {
    if (!orgId) return;
    const arr = palavras.split("\n").map((s) => s.trim()).filter(Boolean);
    if (arr.length === 0 || !valor) return toast.error("Preencha todos os campos");
    const { error } = await (supabase as any).from("chatbot_regras").insert({
      organizacao_id: orgId, tipo: cfg.tipo, palavras_chave: arr, valor, ativo: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Regra adicionada"); setOpen(false); setPalavras(""); setValor(cfg.selecionavel?.[1].v ?? ""); onChange();
  }
  async function toggle(id: string, ativo: boolean) { await (supabase as any).from("chatbot_regras").update({ ativo }).eq("id", id); onChange(); }
  async function excluir(id: string) { await (supabase as any).from("chatbot_regras").delete().eq("id", id); toast.success("Excluído"); onChange(); }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold">{cfg.titulo}</h3>
          <p className="text-sm text-muted-foreground">{cfg.desc}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar regra</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova regra de {cfg.tipo}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Palavras-chave (uma por linha)</Label><Textarea rows={5} value={palavras} onChange={(e) => setPalavras(e.target.value)} /></div>
              <div className="space-y-1"><Label>{cfg.campoLabel}</Label>
                {cfg.selecionavel ? (
                  <Select value={valor} onValueChange={setValor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{cfg.selecionavel.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={valor} onChange={(e) => setValor(e.target.value)} />
                )}
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Palavras-chave</TableHead><TableHead>{cfg.campoLabel}</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {regras.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-sm">Nenhuma regra</TableCell></TableRow>}
          {regras.map((r) => (
            <TableRow key={r.id}>
              <TableCell><div className="flex flex-wrap gap-1">{(r.palavras_chave ?? []).map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}</div></TableCell>
              <TableCell><Badge>{r.valor}</Badge></TableCell>
              <TableCell><Switch checked={r.ativo} onCheckedChange={(v) => toggle(r.id, v)} /></TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Excluir regra?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
