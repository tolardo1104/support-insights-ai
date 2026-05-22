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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/chatbot-faq")({ component: ChatbotFaq });

function ChatbotFaq() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [tags, setTags] = useState("");

  async function carregar(oid: string) {
    const { data } = await (supabase as any).from("chatbot_faq").select("*").eq("organizacao_id", oid).order("ordem");
    setItens(data ?? []);
  }

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid); await carregar(oid);
  })(); }, []);

  function novo() {
    setEditId(null); setPergunta(""); setResposta(""); setTags(""); setOpen(true);
  }
  function editar(it: any) {
    setEditId(it.id); setPergunta(it.pergunta); setResposta(it.resposta); setTags((it.tags ?? []).join(", ")); setOpen(true);
  }
  async function salvar() {
    if (!orgId) return;
    const payload = {
      organizacao_id: orgId,
      pergunta, resposta,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ativo: true,
    };
    const { error } = editId
      ? await (supabase as any).from("chatbot_faq").update(payload).eq("id", editId)
      : await (supabase as any).from("chatbot_faq").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); await carregar(orgId);
  }
  async function toggleAtivo(id: string, ativo: boolean) {
    await (supabase as any).from("chatbot_faq").update({ ativo }).eq("id", id);
    if (orgId) await carregar(orgId);
  }
  async function excluir(id: string) {
    await (supabase as any).from("chatbot_faq").delete().eq("id", id);
    toast.success("Excluído");
    if (orgId) await carregar(orgId);
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">FAQ</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={novo}><Plus className="h-4 w-4 mr-1" />Adicionar pergunta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} pergunta</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Pergunta</Label><Input value={pergunta} onChange={(e) => setPergunta(e.target.value)} /></div>
                <div className="space-y-1"><Label>Resposta</Label><Textarea rows={4} value={resposta} onChange={(e) => setResposta(e.target.value)} /></div>
                <div className="space-y-1"><Label>Tags (separadas por vírgula)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="login, senha, acesso" /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={salvar}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pergunta</TableHead><TableHead>Resposta</TableHead><TableHead>Tags</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {itens.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhuma pergunta cadastrada</TableCell></TableRow>}
            {itens.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="max-w-[200px] truncate">{it.pergunta}</TableCell>
                <TableCell className="max-w-[300px] truncate text-muted-foreground">{it.resposta}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{(it.tags ?? []).map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}</div></TableCell>
                <TableCell><Switch checked={it.ativo} onCheckedChange={(v) => toggleAtivo(it.id, v)} /></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => editar(it)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir pergunta?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir(it.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
