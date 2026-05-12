import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAtendentes, useTickets } from "@/lib/use-tickets-data";

export const Route = createFileRoute("/app/metas")({ component: MetasPage });

type Meta = {
  id: string;
  organizacao_id: string;
  atendente_id: string | null;
  metrica: string;
  valor_meta: number;
  periodo: string;
  ativo: boolean | null;
};

const METRICAS: Record<string, { label: string; unidade: string; inverso: boolean }> = {
  tickets_mes: { label: "Tickets / mês", unidade: "", inverso: false },
  tma_horas: { label: "TMA máximo", unidade: "h", inverso: true },
  csat: { label: "CSAT mínimo", unidade: "%", inverso: false },
  resolucao_primeiro_contato: { label: "Resolução 1º contato", unidade: "%", inverso: false },
  primeira_resposta: { label: "1ª resposta máx.", unidade: "h", inverso: true },
};

function corPct(pct: number) {
  return pct < 60 ? "var(--destructive)" : pct < 85 ? "var(--warning)" : "var(--success)";
}

function MetaRow({
  m, atual, onEdit, onDelete,
}: {
  m: Meta; atual: number;
  onEdit: (m: Meta) => void; onDelete: (id: string) => void;
}) {
  const cfg = METRICAS[m.metrica] ?? { label: m.metrica, unidade: "", inverso: false };
  const pct = cfg.inverso
    ? Math.max(0, Math.min(100, 100 - (atual / m.valor_meta) * 100))
    : Math.min(100, (atual / Math.max(1, m.valor_meta)) * 100);
  const pctR = Math.round(pct);
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{cfg.label}</h4>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Atual: <span className="text-foreground">{atual}{cfg.unidade}</span> · Meta: {m.valor_meta}{cfg.unidade} · {m.periodo}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: corPct(pctR) }}>{pctR}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctR}%`, background: corPct(pctR) }} />
      </div>
    </div>
  );
}

function MetaDialog({
  open, onOpenChange, initial, atendentes, onSave,
}: {
  open: boolean; onOpenChange: (b: boolean) => void;
  initial: Partial<Meta> | null;
  atendentes: { id: string; nome: string }[];
  onSave: (m: Partial<Meta>) => Promise<unknown>;
}) {
  const [metrica, setMetrica] = useState(initial?.metrica ?? "tickets_mes");
  const [valor, setValor] = useState<string>(String(initial?.valor_meta ?? ""));
  const [periodo, setPeriodo] = useState(initial?.periodo ?? "mensal");
  const [atendenteId, setAtendenteId] = useState<string>(initial?.atendente_id ?? "__equipe__");

  useEffect(() => {
    if (open) {
      setMetrica(initial?.metrica ?? "tickets_mes");
      setValor(String(initial?.valor_meta ?? ""));
      setPeriodo(initial?.periodo ?? "mensal");
      setAtendenteId(initial?.atendente_id ?? "__equipe__");
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial?.id ? "Editar meta" : "Nova meta"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Métrica</label>
            <Select value={metrica} onValueChange={setMetrica}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(METRICAS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor da meta</label>
            <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Período</label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Aplicar a</label>
            <Select value={atendenteId} onValueChange={setAtendenteId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__equipe__">Equipe (geral)</SelectItem>
                {atendentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={async () => {
            const v = Number(valor);
            if (!v || isNaN(v)) return toast.error("Informe um valor válido");
            await onSave({
              ...initial,
              metrica, valor_meta: v, periodo,
              atendente_id: atendenteId === "__equipe__" ? null : atendenteId,
            });
            onOpenChange(false);
          }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetasPage() {
  const atendentes = useAtendentes();
  const { tickets, loading: loadingTickets } = useTickets();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Meta> | null>(null);
  const [tab, setTab] = useState("equipe");
  const [atendenteSel, setAtendenteSel] = useState<string>("__all__");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("metas").select("*").eq("ativo", true);
    if (error) toast.error("Erro ao carregar metas");
    setMetas((data ?? []) as Meta[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (atendentes.length && !atendenteSel) setAtendenteSel(atendentes[0].id);
  }, [atendentes, atendenteSel]);

  // Aggregate atual values
  const atuaisEquipe = useMemo(() => {
    const total = tickets.length;
    const tmaArr = tickets.map((t) => t.tma_minutos).filter((v): v is number => v != null);
    const csatArr = tickets.map((t) => t.csat_nota).filter((v): v is number => v != null);
    return {
      tickets_mes: total,
      tma_horas: tmaArr.length ? Math.round((tmaArr.reduce((a, b) => a + b, 0) / tmaArr.length / 60) * 10) / 10 : 0,
      csat: csatArr.length ? Math.round(csatArr.reduce((a, b) => a + b, 0) / csatArr.length) : 0,
      resolucao_primeiro_contato: 0,
      primeira_resposta: 0,
    } as Record<string, number>;
  }, [tickets]);

  const atuaisPorAtendente = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const t of tickets) {
      if (!t.atendente_id) continue;
      const cur = map.get(t.atendente_id) ?? { tickets_mes: 0, _tmaSum: 0, _tmaN: 0, _csatSum: 0, _csatN: 0 } as any;
      cur.tickets_mes += 1;
      if (t.tma_minutos != null) { cur._tmaSum += t.tma_minutos; cur._tmaN += 1; }
      if (t.csat_nota != null) { cur._csatSum += t.csat_nota; cur._csatN += 1; }
      map.set(t.atendente_id, cur);
    }
    const out: Record<string, Record<string, number>> = {};
    map.forEach((v, k) => {
      out[k] = {
        tickets_mes: v.tickets_mes,
        tma_horas: v._tmaN ? Math.round((v._tmaSum / v._tmaN / 60) * 10) / 10 : 0,
        csat: v._csatN ? Math.round(v._csatSum / v._csatN) : 0,
        resolucao_primeiro_contato: 0,
        primeira_resposta: 0,
      };
    });
    return out;
  }, [tickets]);

  const metasEquipe = metas.filter((m) => !m.atendente_id);
  const metasAtendente = metas.filter((m) => m.atendente_id === atendenteSel);

  async function save(m: Partial<Meta>) {
    const { data: prof } = await supabase.from("profiles").select("organizacao_id").maybeSingle();
    if (!prof?.organizacao_id) return toast.error("Organização não encontrada");
    if (m.id) {
      const { error } = await supabase.from("metas").update({
        metrica: m.metrica!, valor_meta: m.valor_meta!, periodo: m.periodo!, atendente_id: m.atendente_id ?? null,
      }).eq("id", m.id);
      if (error) return toast.error("Erro ao salvar: " + error.message);
    } else {
      const { error } = await supabase.from("metas").insert({
        organizacao_id: prof.organizacao_id,
        metrica: m.metrica!, valor_meta: m.valor_meta!, periodo: m.periodo ?? "mensal",
        atendente_id: m.atendente_id ?? null, ativo: true,
      });
      if (error) return toast.error("Erro ao criar: " + error.message);
    }
    toast.success("Meta salva");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("metas").update({ ativo: false }).eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Meta removida");
    load();
  }

  const isLoading = loading || loadingTickets;

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader
        title="Metas"
        description="Acompanhe o desempenho da equipe e por atendente."
        actions={
          <Button onClick={() => { setEditing({ atendente_id: tab === "atendente" ? atendenteSel : null }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Nova meta
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="atendente">Por atendente</TabsTrigger>
        </TabsList>

        <TabsContent value="equipe" className="mt-4">
          <Card className="p-6 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
            ) : metasEquipe.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma meta cadastrada para a equipe.
                <div className="mt-3"><Button size="sm" onClick={() => { setEditing({ atendente_id: null }); setDialogOpen(true); }}>Criar primeira meta</Button></div>
              </div>
            ) : (
              metasEquipe.map((m) => (
                <MetaRow key={m.id} m={m} atual={atuaisEquipe[m.metrica] ?? 0}
                  onEdit={(x) => { setEditing(x); setDialogOpen(true); }} onDelete={remove} />
              ))
            )}
          </Card>
        </TabsContent>

        <TabsContent value="atendente" className="mt-4">
          <Card className="p-6">
            {atendentes.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Nenhum atendente cadastrado. Sincronize com a Movidesk.</div>
            ) : (
              <>
                <div className="mb-4 max-w-xs">
                  <Select value={atendenteSel} onValueChange={setAtendenteSel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {atendentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
                    : metasAtendente.length === 0 ? (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        Nenhuma meta individual.
                        <div className="mt-3"><Button size="sm" onClick={() => { setEditing({ atendente_id: atendenteSel }); setDialogOpen(true); }}>Criar meta</Button></div>
                      </div>
                    ) : metasAtendente.map((m) => (
                      <MetaRow key={m.id} m={m} atual={(atuaisPorAtendente[atendenteSel] ?? {})[m.metrica] ?? 0}
                        onEdit={(x) => { setEditing(x); setDialogOpen(true); }} onDelete={remove} />
                    ))}
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <MetaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        atendentes={atendentes.map((a) => ({ id: a.id, nome: a.nome }))}
        onSave={save}
      />
    </div>
  );
}
