import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockSyncLog } from "@/lib/mock-data";
import { Eye, EyeOff, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/configuracoes/integracao")({ component: IntegracaoConfig });

function IntegracaoConfig() {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState("");
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-1">Integração com Movidesk</h3>
        <p className="text-sm text-muted-foreground mb-5">Conecte sua conta para sincronizar tickets automaticamente.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input type={show ? "text" : "password"} value={key} onChange={(e) => setKey(e.target.value)} placeholder="••••••••••••••••" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button variant="outline" onClick={() => toast.success("Conexão testada com sucesso")}>Testar</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Intervalo de sincronização</Label>
            <Select defaultValue="60">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">A cada 15 minutos</SelectItem>
                <SelectItem value="30">A cada 30 minutos</SelectItem>
                <SelectItem value="60">A cada hora</SelectItem>
                <SelectItem value="240">A cada 4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => toast.success("Configurações salvas")}>Salvar</Button>
            <Button variant="outline" onClick={() => toast.success("Sincronização em andamento")}><RefreshCw className="h-4 w-4 mr-2" />Sincronizar agora</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Últimas sincronizações</h3>
        <div className="space-y-2">
          {mockSyncLog.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                {s.status === "ok" ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="font-mono text-sm">{s.data}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{s.registros} registros</span>
                <Badge variant={s.status === "ok" ? "secondary" : "destructive"}>{s.status === "ok" ? "Sucesso" : "Erro"}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
