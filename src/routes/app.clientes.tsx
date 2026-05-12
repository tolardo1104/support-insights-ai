import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTickets } from "@/lib/use-tickets-data";
import { startOfMonth, subDays, subMonths, endOfMonth } from "date-fns";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

const PAGE_SIZE = 15;

function todayISO() { return new Date().toISOString().slice(0, 10); }
function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type SortDir = "asc" | "desc";
type PeriodoTipo = "mes_atual" | "7d" | "30d" | "mes_anterior" | "custom";

function ClientesPage() {
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("mes_atual");

  const { tickets, loading } = useTickets(from, to);

  const [busca, setBusca] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  function aplicarPeriodo(tipo: PeriodoTipo) {
    setPeriodoTipo(tipo);
    const hoje = new Date();
    if (tipo === "mes_atual") {
      setFrom(startOfMonth(hoje).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "7d") {
      setFrom(subDays(hoje, 7).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "30d") {
      setFrom(subDays(hoje, 30).toISOString().slice(0, 10)); setTo(todayISO());
    } else if (tipo === "mes_anterior") {
      const prev = subMonths(hoje, 1);
      setFrom(startOfMonth(prev).toISOString().slice(0, 10));
      setTo(endOfMonth(prev).toISOString().slice(0, 10));
    }
  }

  const allRows = useMemo(() => {
    const map = new Map<string, { nome: string; tickets: number; categorias: Map<string, number> }>();
    for (const t of tickets) {
      const key = t.cliente_id ?? t.cliente_nome ?? "—";
      if (key === "—") continue;
      const cur = map.get(key) ?? { nome: t.cliente_nome ?? "—", tickets: 0, categorias: new Map() };
      cur.tickets += 1;
      if (t.categoria) cur.categorias.set(t.categoria, (cur.categorias.get(t.categoria) ?? 0) + 1);
      map.set(key, cur);
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      tickets: v.tickets,
      categorias: Array.from(v.categorias.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
    }));
  }, [tickets]);

  const filtered = useMemo(() => {
    let r = allRows;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((c) => c.nome.toLowerCase().includes(q));
    }
    r = [...r].sort((a, b) =>
      sortDir === "desc" ? b.tickets - a.tickets : a.tickets - b.tickets,
    );
    return r;
  }, [allRows, busca, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginados = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isFiltered = busca.trim() !== "" || periodoTipo !== "mes_atual";

  function limpar() {
    setBusca("");
    aplicarPeriodo("mes_atual");
    setPage(1);
  }

  const periodos: { key: PeriodoTipo; label: string }[] = [
    { key: "mes_atual", label: "Mês atual" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "mes_anterior", label: "Mês anterior" },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Clientes" description="Ranking de clientes por volume de tickets no período." />

      <Card className="p-4 mb-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap gap-2">
            {periodos.map((p) => (
              <Button
                key={p.key}
                variant={periodoTipo === p.key ? "default" : "outline"}
                size="sm"
                onClick={() => { aplicarPeriodo(p.key); setPage(1); }}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPeriodoTipo("custom"); setPage(1); }}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPeriodoTipo("custom"); setPage(1); }}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar cliente..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <span className="text-xs text-muted-foreground">
            Exibindo {paginados.length} de {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
          </span>
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={limpar}>
              <X className="h-3.5 w-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead
                className="text-right cursor-pointer select-none"
                onClick={() => { setSortDir((d) => d === "desc" ? "asc" : "desc"); setPage(1); }}
              >
                <div className="inline-flex items-center gap-1 justify-end">
                  Tickets
                  {sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                </div>
              </TableHead>
              <TableHead>Categorias frequentes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
              </TableRow>
            ))}
            {!loading && paginados.map((c, i) => (
              <TableRow key={c.id}>
                <TableCell className="text-muted-foreground tabular-nums">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{c.tickets}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.categorias.map((cat) => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                  {busca ? `Nenhum cliente encontrado para "${busca}"` : "Nenhum cliente no período. Sincronize com a Movidesk."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-xs text-muted-foreground">
              Página {page} de {totalPaginas} · {filtered.length} clientes
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const start = Math.max(1, Math.min(Math.max(1, totalPaginas - 4), page - 2));
                const p = start + i;
                if (p > totalPaginas) return null;
                return (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
