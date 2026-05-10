import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo } from "react";
import { useTickets } from "@/lib/use-tickets-data";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

function ClientesPage() {
  const { tickets, loading } = useTickets(30);

  const rows = useMemo(() => {
    const map = new Map<string, { nome: string; tickets: number; categorias: Map<string, number> }>();
    for (const t of tickets) {
      const key = t.cliente_id ?? t.cliente_nome ?? "—";
      if (key === "—") continue;
      const cur = map.get(key) ?? { nome: t.cliente_nome ?? "—", tickets: 0, categorias: new Map() };
      cur.tickets += 1;
      if (t.categoria) cur.categorias.set(t.categoria, (cur.categorias.get(t.categoria) ?? 0) + 1);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        nome: v.nome,
        tickets: v.tickets,
        categorias: Array.from(v.categorias.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
      }))
      .sort((a, b) => b.tickets - a.tickets)
      .slice(0, 50);
  }, [tickets]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Clientes" description="Ranking de clientes por volume de tickets no período." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead>Categorias frequentes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{c.tickets}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.categorias.map((cat) => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">Nenhum cliente no período. Sincronize com a Movidesk.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
