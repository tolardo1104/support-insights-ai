import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/app/configuracoes/chatbot-conhecimento")({ component: ChatbotConhecimento });

function ChatbotConhecimento() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [novaUrl, setNovaUrl] = useState("");
  const [textoManual, setTextoManual] = useState("");
  const [textoId, setTextoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar(oid: string) {
    const { data } = await (supabase as any).from("chatbot_conhecimento").select("*").eq("organizacao_id", oid).order("criado_em", { ascending: false });
    setItens(data ?? []);
    const t = (data ?? []).find((x: any) => x.tipo === "texto");
    if (t) { setTextoManual(t.conteudo ?? ""); setTextoId(t.id); }
  }

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").eq("id", user.id).single();
    const oid = prof?.organizacao_id; if (!oid) return;
    setOrgId(oid);
    await carregar(oid);
  })(); }, []);

  async function enviarArquivo() {
    if (!file || !orgId) return;
    setUploading(true);
    const path = `${orgId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("chatbot-conhecimento").upload(path, file);
    if (upErr) { setUploading(false); return toast.error("Erro no upload: " + upErr.message); }
    const { error } = await (supabase as any).from("chatbot_conhecimento").insert({
      organizacao_id: orgId, nome: file.name, tipo: "arquivo", storage_path: path, ativo: true,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Arquivo enviado");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
    await carregar(orgId);
  }

  async function adicionarUrl() {
    if (!novaUrl || !orgId) return;
    const { error } = await (supabase as any).from("chatbot_conhecimento").insert({
      organizacao_id: orgId, nome: novaUrl, tipo: "url", url_fonte: novaUrl, ativo: true,
    });
    if (error) return toast.error(error.message);
    setNovaUrl(""); toast.success("URL adicionada"); await carregar(orgId);
  }

  async function salvarTexto() {
    if (!orgId) return;
    const payload = { organizacao_id: orgId, nome: "Texto manual", tipo: "texto", conteudo: textoManual, ativo: true };
    const { error } = textoId
      ? await (supabase as any).from("chatbot_conhecimento").update({ conteudo: textoManual }).eq("id", textoId)
      : await (supabase as any).from("chatbot_conhecimento").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Texto salvo"); await carregar(orgId);
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    const { error } = await (supabase as any).from("chatbot_conhecimento").update({ ativo }).eq("id", id);
    if (error) return toast.error(error.message);
    if (orgId) await carregar(orgId);
  }

  async function excluir(it: any) {
    if (it.storage_path) await supabase.storage.from("chatbot-conhecimento").remove([it.storage_path]);
    const { error } = await (supabase as any).from("chatbot_conhecimento").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    if (orgId) await carregar(orgId);
  }

  const arquivos = itens.filter((i) => i.tipo === "arquivo");
  const urls = itens.filter((i) => i.tipo === "url");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="arquivos">
        <TabsList>
          <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="texto">Texto manual</TabsTrigger>
        </TabsList>

        <TabsContent value="arquivos" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste ou clique para enviar</p>
              <p className="text-xs text-muted-foreground">.txt, .pdf, .docx</p>
              <input ref={inputRef} type="file" accept=".txt,.pdf,.docx" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {file && (
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="text-sm"><div className="font-medium">{file.name}</div><div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div></div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Cancelar</Button>
                  <Button size="sm" onClick={enviarArquivo} disabled={uploading}>
                    {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar arquivo
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Arquivos enviados</h3>
            <Table>
              <TableHeader><TableRow>
                <TableHead></TableHead><TableHead>Nome</TableHead><TableHead>Data</TableHead><TableHead>Ativo</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {arquivos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-6">Nenhum arquivo</TableCell></TableRow>}
                {arquivos.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell><FileText className="h-4 w-4 text-muted-foreground" /></TableCell>
                    <TableCell>{a.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(a.criado_em), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell><Switch checked={a.ativo} onCheckedChange={(v) => toggleAtivo(a.id, v)} /></TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir arquivo?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir(a)}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="url" className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex gap-2">
              <Input placeholder="https://..." value={novaUrl} onChange={(e) => setNovaUrl(e.target.value)} />
              <Button onClick={adicionarUrl}>Adicionar URL</Button>
            </div>
            <div className="space-y-2">
              {urls.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma URL cadastrada</p>}
              {urls.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="text-sm truncate flex-1">{u.url_fonte}</div>
                  <div className="flex items-center gap-2">
                    <Switch checked={u.ativo} onCheckedChange={(v) => toggleAtivo(u.id, v)} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir URL?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => excluir(u)}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="texto" className="space-y-6">
          <Card className="p-6 space-y-4">
            <Label>Texto manual</Label>
            <Textarea
              className="min-h-[300px]"
              placeholder="Cole aqui procedimentos internos, políticas, informações do produto..."
              value={textoManual}
              onChange={(e) => setTextoManual(e.target.value)}
            />
            <Button onClick={salvarTexto}>Salvar texto</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
