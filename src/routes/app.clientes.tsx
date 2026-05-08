import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockClientes } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

function ClientesPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader title="Clientes" description="Ranking de clientes por volume de tickets no período." />

      <Card className="p-5 mb-6 bg-warning/5 border-warning/30">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <h3 className="font-semibold flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" />Clientes em risco</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>TechCorp Ltda</strong> e <strong>Acme Industries</strong> apresentam volume crescente de chamados na mesma categoria. Considere uma conversa preventiva com o gerente da conta.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead>Categorias frequentes</TableHead>
              <TableHead>Atendente principal</TableHead>
              <TableHead>Tendência</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockClientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{c.tickets}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.categorias.map((cat) => <Badge key={cat} variant="secondary">{cat}</Badge>)}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.atendente}</TableCell>
                <TableCell>
                  {c.tendencia === "up" ? (
                    <span className="inline-flex items-center gap-1 text-destructive text-xs"><TrendingUp className="h-3 w-3" />Subindo</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-success text-xs"><TrendingDown className="h-3 w-3" />Caindo</span>
                  )}
                </TableCell>
                <TableCell><Button variant="ghost" size="sm">Ver histórico</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
