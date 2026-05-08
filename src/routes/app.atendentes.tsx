import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAtendentes } from "@/lib/mock-data";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/app/atendentes")({ component: AtendentesPage });

const statusBadge = {
  destaque: { label: "Destaque", cls: "bg-success/15 text-success border-success/30" },
  regular: { label: "Regular", cls: "bg-muted text-muted-foreground border-border" },
  atencao: { label: "Atenção", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

function AtendentesPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Atendentes" description="Performance individual e ranking da equipe." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAtendentes.map((a) => {
          const s = statusBadge[a.status];
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold">
                  {a.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{a.nome}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.equipe}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Trophy className="h-3 w-3" />#{a.pos}</div>
                  <Badge variant="outline" className={`mt-1 ${s.cls}`}>{s.label}</Badge>
                </div>
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
          );
        })}
      </div>
    </div>
  );
}
