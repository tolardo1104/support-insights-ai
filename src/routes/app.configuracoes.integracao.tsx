import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Eye, EyeOff, RefreshCw, Loader2, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { testMovideskConnection, syncMovideskTickets } from "@/lib/movidesk.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/configuracoes/integracao")({ component: IntegracaoConfig });

const fmt = (d: Date) => format(d, "yyyy-MM-dd");

function IntegracaoConfig() {
  const [show, setShow] = useState(false);
  const [key, setKey] = useState("");
  const [intervalo, setIntervalo] = useState("60");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const [dataInicio, setDataInicio] = useState<Date>(subDays(today, 30));
  const [dataFim, setDataFim] = useState<Date>(today);
  const [logs, setLogs] = useState<any[]>([]);

  const testFn = useServerFn(testMovideskConnection);
  const syncFn = useServerFn(syncMovideskTickets);

  const loadLogs = async () => {
    const { data } = await supabase
      .from("sync_log")
      .select("*")
      .order("executado_em", { ascending: false })
      .limit(10);
    setLogs(data ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("movidesk_api_key,sync_intervalo_minutos")
        .maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (data?.movidesk_api_key) setKey(data.movidesk_api_key);
      if (data?.sync_intervalo_minutos) setIntervalo(String(data.sync_intervalo_minutos));
      await loadLogs();
    })();
  }, []);

  const aplicarAtalho = (tipo: string) => {
    const now = new Date();
    if (tipo === "hoje") { setDataInicio(now); setDataFim(now); }
    else if (tipo === "7d") { setDataInicio(subDays(now, 7)); setDataFim(now); }
    else if (tipo === "30d") { setDataInicio(subDays(now, 30)); setDataFim(now); }
    else if (tipo === "mes") { setDataInicio(startOfMonth(now)); setDataFim(now); }
    else if (tipo === "anterior") {
      const prev = subMonths(now, 1);
      setDataInicio(startOfMonth(prev)); setDataFim(endOfMonth(prev));
    }
  };

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return toast.error("Sessão expirada"); }
    const { data: prof, error: pErr } = await supabase
      .from("profiles").select("organizacao_id").eq("id", user.id).single();
    if (pErr || !prof?.organizacao_id) { setSaving(false); return toast.error(pErr?.message ?? "Organização não encontrada"); }
    const { error } = await supabase.from("configuracoes").update({
      movidesk_api_key: key, sync_intervalo_minutos: Number(intervalo),
    }).eq("organizacao_id", prof.organizacao_id);
    setSaving(false);
    error ? toast.error(error.message) : toast.success("Configurações salvas");
  };

  const sync = async () => {
    if (dataInicio > dataFim) return toast.error("Data início deve ser anterior à data fim");
    setSyncing(true);
    try {
      const r = await syncFn({ data: { dataInicio: fmt(dataInicio), dataFim: fmt(dataFim) } });
      r.ok ? toast.success(r.message) : toast.error(r.message);
      await loadLogs();
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
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-1">Sincronizar tickets</h3>
        <p className="text-sm text-muted-foreground mb-5">Selecione o período para importar os tickets da Movidesk.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={() => aplicarAtalho("hoje")}>Hoje</Button>
          <Button variant="outline" size="sm" onClick={() => aplicarAtalho("7d")}>Últimos 7 dias</Button>
          <Button variant="outline" size="sm" onClick={() => aplicarAtalho("30d")}>Últimos 30 dias</Button>
          <Button variant="outline" size="sm" onClick={() => aplicarAtalho("mes")}>Mês atual</Button>
          <Button variant="outline" size="sm" onClick={() => aplicarAtalho("anterior")}>Mês anterior</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>De</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataInicio, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={(d) => d && setDataInicio(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataFim, "PPP", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={(d) => d && setDataFim(d)} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {syncing ? "Sincronizando tickets..." : "Sincronizar"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Últimas sincronizações</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sincronização registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Importados</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{format(new Date(l.executado_em), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>{l.periodo_inicio} → {l.periodo_fim}</TableCell>
                  <TableCell>{l.total_importado ?? 0}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full",
                      l.status === "sucesso" ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive")}>
                      {l.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{l.mensagem_erro ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
