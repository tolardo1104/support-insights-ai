import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { useTickets, useAtendentes } from "@/lib/use-tickets-data";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, List, X, ArrowRight, ArrowUpDown, Star, AlertTriangle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/atendentes")({ component: AtendentesPage });

type ViewMode = "grid" | "list";
type StatusKey = "destaque" | "regular" | "atencao" | "sem_analise";

const statusLabel: Record<StatusKey, string> = {
  destaque: "Destaque",
  regular: "Regular",
  atencao: "Atenção",
  sem_analise: "Sem análise",
};

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

function AtendentesPage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayISO());

  const atendentes = useAtendentes();
  const { tickets, loading } = useTickets(from, to);

  const [equipe, setEquipe] = useState<string>("__all__");
  const [statusSel, setStatusSel] = useState<Record<StatusKey, boolean>>({
    destaque: true, regular: true, atencao: true, sem_analise: true,
  });
  const [orderBy, setOrderBy] = useState("nome");
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    return (localStorage.getItem("atendentes_view_mode") as ViewMode) || "grid";
  });
  useEffect(() => { localStorage.setItem("atendentes_view_mode", view); }, [view]);

  // Load latest IA classification per atendente
  const [classMap, setClassMap] = useState<Record<string, StatusKey>>({});
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("analises_ia")
        .select("atendente_id, resultado, criado_em")
        .eq("tipo", "atendente")
        .order("criado_em", { ascending: false })
        .limit(500);
      const map: Record<string, StatusKey> = {};
      for (const r of (data ?? []) as any[]) {
        if (!r.atendente_id || map[r.atendente_id]) continue;
        const c = String(r.resultado?.classificacao ?? "").toLowerCase();
        let status: StatusKey = "sem_analise";
        if (c.includes("destaque")) status = "destaque";
        else if (c.includes("aten")) status = "atencao";
        else if (c.includes("regular")) status = "regular";
        else if (r.resultado?.texto) status = "regular";
        map[r.atendente_id] = status;
      }
      setClassMap(map);
    })();
  }, []);

  const equipes = useMemo(() => {
    const s = new Set<string>();
    atendentes.forEach((a) => a.equipe && s.add(a.equipe));
    return Array.from(s).sort();
  }, [atendentes]);

  const rows = useMemo(() => {
    const byId = new Map<string, { tickets: number; tmaSum: number; tmaN: number; csatSum: number; csatN: number; tmeSum: number; tmeN: number; frtSum: number; frtN: number; abandonos: number }>();
    for (const t of tickets) {
      if (!t.atendente_id) continue;
      const cur = byId.get(t.atendente_id) ?? { tickets: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0, tmeSum: 0, tmeN: 0, frtSum: 0, frtN: 0, abandonos: 0 };
      cur.tickets += 1;
      if (t.tma_minutos != null) { cur.tmaSum += t.tma_minutos; cur.tmaN += 1; }
      if (t.csat_nota != null) { cur.csatSum += t.csat_nota; cur.csatN += 1; }
      if (t.tme_minutos != null) { cur.tmeSum += t.tme_minutos; cur.tmeN += 1; }
      if (t.frt_minutos != null) { cur.frtSum += t.frt_minutos; cur.frtN += 1; }
      if (t.abandonado) { cur.abandonos += 1; }
      byId.set(t.atendente_id, cur);
    }
    return atendentes.map((a) => {
      const s = byId.get(a.id) ?? { tickets: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0, tmeSum: 0, tmeN: 0, frtSum: 0, frtN: 0, abandonos: 0 };
      const tma = s.tmaN ? Math.round((s.tmaSum / s.tmaN / 60) * 10) / 10 : 0;
      const csat = s.csatN ? Math.round((s.csatSum / s.csatN) * 10) / 10 : 0;
      const tme = s.tmeN ? Math.round(s.tmeSum / s.tmeN) : null;
      const frt = s.frtN ? Math.round(s.frtSum / s.frtN) : null;
      const abandono = s.tickets ? Math.round((s.abandonos / s.tickets) * 100) : 0;

      const status: StatusKey = classMap[a.id] ?? "sem_analise";
      const score = Math.round(csat * 0.4 + Math.min(100, s.tickets) * 0.3 + Math.max(0, 100 - tma * 10) * 0.3);
      return { ...a, tickets: s.tickets, tma, csat, tme, frt, abandono, status, score };
    });
  }, [atendentes, tickets, classMap]);

  const filtered = useMemo(() => {
    let r = rows;
    if (equipe !== "__all__") r = r.filter((a) => a.equipe === equipe);
    r = r.filter((a) => statusSel[a.status]);
    const sorters: Record<string, (a: any, b: any) => number> = {
      nome: (a, b) => a.nome.localeCompare(b.nome),
      tickets: (a, b) => b.tickets - a.tickets,
      tma: (a, b) => a.tma - b.tma,
      csat: (a, b) => b.csat - a.csat,
      score_desc: (a, b) => b.score - a.score,
      score_asc: (a, b) => a.score - b.score,
    };
    return [...r].sort(sorters[orderBy] ?? sorters.nome);
  }, [rows, equipe, statusSel, orderBy]);

  const isFiltered = equipe !== "__all__" || orderBy !== "nome"
    || !Object.values(statusSel).every(Boolean) || from !== startOfMonth() || to !== todayISO();

  function clearFilters() {
    setEquipe("__all__"); setOrderBy("nome");
    setStatusSel({ destaque: true, regular: true, atencao: true, sem_analise: true });
    setFrom(startOfMonth()); setTo(todayISO());
  }

  const fmtTempo = (m: number | null) => m === null ? "—" : m > 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${m}min`;

  const goDetail = (id: string) => navigate({ to: "/app/atendentes/$id", params: { id } });

  const [csatDetailId, setCsatDetailId] = useState<string | null>(null);

  const csatTickets = useMemo(() => {
    if (!csatDetailId) return [];
    return tickets.filter((t) => t.atendente_id === csatDetailId && t.csat_nota != null)
      .sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());
  }, [csatDetailId, tickets]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Atendentes"
        description="Performance individual e ranking da equipe."
        actions={
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Toggle pressed={view === "grid"} onPressedChange={() => setView("grid")} size="sm" aria-label="Grade"><LayoutGrid className="h-4 w-4" /></Toggle>
            <Toggle pressed={view === "list"} onPressedChange={() => setView("list")} size="sm" aria-label="Lista"><List className="h-4 w-4" /></Toggle>
          </div>
        }
      />

      <Card className="p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Até</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="outline" onClick={() => { setFrom(todayISO()); setTo(todayISO()); }}>Hoje</Button>
            <Button size="sm" variant="outline" onClick={() => { setFrom(daysAgoISO(7)); setTo(todayISO()); }}>7 dias</Button>
            <Button size="sm" variant="outline" onClick={() => { setFrom(daysAgoISO(30)); setTo(todayISO()); }}>30 dias</Button>
            <Button size="sm" variant="outline" onClick={() => { setFrom(startOfMonth()); setTo(todayISO()); }}>Mês atual</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const d = new Date(); const ini = new Date(d.getFullYear(), d.getMonth() - 1, 1);
              const fim = new Date(d.getFullYear(), d.getMonth(), 0);
              setFrom(ini.toISOString().slice(0, 10)); setTo(fim.toISOString().slice(0, 10));
            }}>Mês anterior</Button>
          </div>
          <div className="ml-auto flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Equipe</label>
              <Select value={equipe} onValueChange={setEquipe}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as equipes</SelectItem>
                  {equipes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ordenar por</label>
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome (A–Z)</SelectItem>
                  <SelectItem value="tickets">Maior volume de tickets</SelectItem>
                  <SelectItem value="tma">Menor TMA</SelectItem>
                  <SelectItem value="csat">Maior CSAT</SelectItem>
                  <SelectItem value="score_desc">Maior score geral</SelectItem>
                  <SelectItem value="score_asc">Pior desempenho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1">Status:</span>
          {(Object.keys(statusLabel) as StatusKey[]).map((k) => (
            <Toggle
              key={k}
              size="sm"
              pressed={statusSel[k]}
              onPressedChange={(v) => setStatusSel((s) => ({ ...s, [k]: v }))}
              variant="outline"
            >
              {k === "destaque" && <Star className="h-3 w-3 mr-1" />}
              {k === "atencao" && <AlertTriangle className="h-3 w-3 mr-1" />}
              {statusLabel[k]}
            </Toggle>
          ))}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Exibindo {filtered.length} de {rows.length} atendentes</span>
            {isFiltered && (
              <Button size="sm" variant="ghost" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Limpar filtros</Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">Nenhum atendente encontrado para os filtros atuais.</p>
          {rows.length === 0 && (
            <Button onClick={() => navigate({ to: "/app/configuracoes/integracao" })}>Sincronizar com a Movidesk</Button>
          )}
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, idx) => (
            <Card
              key={a.id}
              onClick={() => goDetail(a.id)}
              className="p-5 cursor-pointer transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                  {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{a.nome}</h3>
                  <p className="text-xs text-muted-foreground">{a.equipe ?? a.email ?? "—"}</p>
                </div>
                <StatusBadge s={a.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div><div className="text-xs text-muted-foreground">Tickets</div><div className="font-mono font-semibold tabular-nums">{a.tickets}</div></div>
                <div><div className="text-xs text-muted-foreground">TMA</div><div className="font-mono font-semibold tabular-nums">{a.tma}h</div></div>
                <div onClick={(e) => { e.stopPropagation(); setCsatDetailId(a.id); }} className="cursor-pointer hover:bg-muted/50 rounded p-1 -m-1 transition-colors">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">CSAT <ExternalLink className="h-3 w-3" /></div>
                  <div className="font-mono font-semibold tabular-nums">{a.csat}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed">
                <div><div className="text-[10px] text-muted-foreground uppercase">TME</div><div className="font-mono text-sm tabular-nums">{fmtTempo(a.tme)}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">FRT</div><div className="font-mono text-sm tabular-nums">{fmtTempo(a.frt)}</div></div>
                <div><div className="text-[10px] text-muted-foreground uppercase">Abandono</div><div className="font-mono text-sm tabular-nums">{a.abandono}%</div></div>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); goDetail(a.id); }}>
                Ver análise completa
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Atendente</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead className="cursor-pointer" onClick={() => setOrderBy("tickets")}>Tickets <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                <TableHead className="cursor-pointer" onClick={() => setOrderBy("tma")}>TMA <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                <TableHead>TME</TableHead>
                <TableHead>FRT</TableHead>
                <TableHead>Abandono</TableHead>
                <TableHead className="cursor-pointer" onClick={() => setOrderBy("csat")}>CSAT <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                <TableHead className="cursor-pointer" onClick={() => setOrderBy("score_desc")}>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a, idx) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => goDetail(a.id)}>
                  <TableCell className="font-mono">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
                        {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="font-medium">{a.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.equipe ?? "—"}</TableCell>
                  <TableCell className="font-mono tabular-nums">{a.tickets}</TableCell>
                  <TableCell className="font-mono tabular-nums" style={{ color: a.tma > 4 ? "var(--destructive)" : undefined }}>{a.tma}h</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground text-xs">{fmtTempo(a.tme)}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground text-xs">{fmtTempo(a.frt)}</TableCell>
                  <TableCell className="font-mono tabular-nums text-muted-foreground text-xs">{a.abandono}%</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 font-mono" onClick={(e) => { e.stopPropagation(); setCsatDetailId(a.id); }}>
                      {a.csat} <ExternalLink className="h-3 w-3 ml-1" />
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums w-8">{a.score}</span>
                      <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, a.score)}%` }} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge s={a.status} /></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); goDetail(a.id); }}>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* MODAL DETALHES DE CSAT */}
      <Dialog open={!!csatDetailId} onOpenChange={(o) => { if (!o) setCsatDetailId(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhamento de CSAT</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {csatTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma avaliação encontrada no período.</p>
            ) : (
              <div className="space-y-3">
                {csatTickets.map(t => (
                  <div key={t.id} className="p-3 border rounded-md text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{t.numero ?? t.id}</span>
                      <Badge variant={t.csat_nota && t.csat_nota >= 80 ? "default" : t.csat_nota && t.csat_nota >= 50 ? "secondary" : "destructive"}>
                        Nota: {t.csat_nota}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(t.criado_em || "").toLocaleDateString()} • {t.categoria ?? "Sem categoria"}
                    </div>
                    <div className="font-medium truncate">{t.assunto}</div>
                    {t.csat_comentario && (
                      <div className="mt-2 text-muted-foreground italic border-l-2 pl-2">
                        "{t.csat_comentario}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ s }: { s: StatusKey }) {
  const cls = s === "destaque" ? "bg-success/15 text-success border-success/30"
    : s === "atencao" ? "bg-destructive/15 text-destructive border-destructive/30"
    : s === "regular" ? "bg-muted text-foreground"
    : "bg-muted/50 text-muted-foreground";
  return <Badge variant="outline" className={cls}>{statusLabel[s]}</Badge>;
}
