import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Eye, EyeOff, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { testMovideskConnection, syncMovideskTickets } from "@/lib/movidesk.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/configuracoes/integracao")({ component: IntegracaoConfig });

function IntegracaoConfig() {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState("");
  const [intervalo, setIntervalo] = useState("60");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const testFn = useServerFn(testMovideskConnection);
  const syncFn = useServerFn(syncMovideskTickets);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("configuracoes").select("movidesk_api_key,sync_intervalo_minutos").maybeSingle();
      if (data?.movidesk_api_key) setKey(data.movidesk_api_key);
      if (data?.sync_intervalo_minutos) setIntervalo(String(data.sync_intervalo_minutos));
    })();
  }, []);

  const test = async () => {
    if (!key) return toast.error("Informe a API Key");
    setTesting(true);
    try {
      const r = await testFn({ data: { apiKey: key } });
      r.ok ? toast.success(r.message) : toast.error(r.message);
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(false); }
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("configuracoes").update({
      movidesk_api_key: key, sync_intervalo_minutos: Number(intervalo),
    }).neq("organizacao_id", "00000000-0000-0000-0000-000000000000");
    setSaving(false);
    error ? toast.error(error.message) : toast.success("Configurações salvas");
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await syncFn({ data: { dias: 30 } });
      r.ok ? toast.success(r.message) : toast.error(r.message);
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

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
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Testar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Intervalo de sincronização</Label>
            <Select value={intervalo} onValueChange={setIntervalo}>
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
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
            <Button variant="outline" onClick={sync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
