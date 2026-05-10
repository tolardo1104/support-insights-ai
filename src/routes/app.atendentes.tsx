import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useTickets, useAtendentes } from "@/lib/use-tickets-data";

export const Route = createFileRoute("/app/atendentes")({ component: AtendentesPage });

function AtendentesPage() {
  const atendentes = useAtendentes();
  const { tickets, loading } = useTickets(30);

  const rows = useMemo(() => {
    const byId = new Map<string, { tickets: number; tmaSum: number; tmaN: number; csatSum: number; csatN: number }>();
    for (const t of tickets) {
      if (!t.atendente_id) continue;
      const cur = byId.get(t.atendente_id) ?? { tickets: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0 };
      cur.tickets += 1;
      if (t.tma_minutos != null) { cur.tmaSum += t.tma_minutos; cur.tmaN += 1; }
      if (t.csat_nota != null) { cur.csatSum += t.csat_nota; cur.csatN += 1; }
      byId.set(t.atendente_id, cur);
    }
    return atendentes.map((a) => {
      const s = byId.get(a.id) ?? { tickets: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0 };
      return {
        ...a,
        tickets: s.tickets,
        tma: s.tmaN ? Math.round((s.tmaSum / s.tmaN / 60) * 10) / 10 : 0,
        csat: s.csatN ? Math.round(s.csatSum / s.csatN) : 0,
      };
    }).sort((a, b) => b.tickets - a.tickets);
  }, [atendentes, tickets]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Atendentes" description="Performance individual e ranking da equipe." />
      {!loading && rows.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum atendente encontrado. Sincronize com a Movidesk em Configurações → Integração.
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((a, idx) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{a.nome}</h3>
                <p className="text-xs text-muted-foreground">{a.equipe ?? a.email ?? "—"}</p>
              </div>
              <div className="text-xs text-muted-foreground">#{idx + 1}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
              <div><div className="text-xs text-muted-foreground">Tickets</div><div className="font-mono font-semibold tabular-nums">{a.tickets}</div></div>
              <div><div className="text-xs text-muted-foreground">TMA</div><div className="font-mono font-semibold tabular-nums">{a.tma}h</div></div>
              <div><div className="text-xs text-muted-foreground">CSAT</div><div className="font-mono font-semibold tabular-nums">{a.csat}%</div></div>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full mt-4">
              <Link to="/app/atendentes/$id" params={{ id: a.id }}>Ver análise completa</Link>
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
