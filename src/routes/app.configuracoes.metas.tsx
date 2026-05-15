import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { mockMetas } from "@/lib/mock-data";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/configuracoes/metas")({ component: MetasConfig });

function MetasConfig() {
  const [metas, setMetas] = useState(mockMetas.map((m) => ({ ...m, ativo: true })));
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Metas da equipe</h3>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova meta</Button>
        </div>
        <div className="space-y-3">
          {metas.map((m, idx) => (
            <div key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_60px_60px] gap-3 items-end p-3 border rounded-md">
              <div className="space-y-1">
                <Label className="text-xs">Métrica</Label>
                <Select defaultValue={m.metrica}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tickets_mes">Tickets / mês</SelectItem>
                    <SelectItem value="tma_horas">TMA (horas)</SelectItem>
                    <SelectItem value="csat">CSAT</SelectItem>
                    <SelectItem value="resolucao_primeiro_contato">Resol. 1º contato</SelectItem>
                    <SelectItem value="primeira_resposta">1ª resposta (h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor</Label>
                <Input defaultValue={m.meta} type="number" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período</Label>
                <Select defaultValue="mensal">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ativo</Label>
                <Switch checked={m.ativo} onCheckedChange={(v) => setMetas(metas.map((x, i) => i === idx ? { ...x, ativo: v } : x))} />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setMetas(metas.filter((_, i) => i !== idx)); toast.success("Meta excluída"); }}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
        <Button className="mt-4" onClick={() => toast.success("Metas salvas")}>Salvar</Button>
      </Card>
    </div>
  );
}
