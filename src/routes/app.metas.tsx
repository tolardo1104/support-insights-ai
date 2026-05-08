import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { mockMetas, mockAtendentes } from "@/lib/mock-data";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/app/metas")({ component: MetasPage });

function progresso(atual: number, meta: number, inverso = false) {
  const pct = inverso ? Math.max(0, 100 - (atual / meta) * 100) : Math.min(100, (atual / meta) * 100);
  return Math.round(pct);
}
function corPct(pct: number) {
  return pct < 60 ? "var(--destructive)" : pct < 85 ? "var(--warning)" : "var(--success)";
}

function MetaItem({ m }: { m: typeof mockMetas[number] }) {
  const inverso = m.metrica === "tma_horas" || m.metrica === "primeira_resposta";
  const pct = progresso(m.atual, m.meta, inverso);
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{m.label}</h4>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Atual: <span className="text-foreground">{m.atual}{m.unidade}</span> · Meta: {m.meta}{m.unidade}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: corPct(pct) }}>{pct}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: corPct(pct) }} />
      </div>
    </div>
  );
}

function MetasPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader title="Metas" description="Acompanhe o desempenho da equipe e por atendente." />
      <Tabs defaultValue="equipe">
        <TabsList>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="atendente">Por atendente</TabsTrigger>
        </TabsList>
        <TabsContent value="equipe" className="mt-4">
          <Card className="p-6 space-y-3">
            {mockMetas.map((m) => <MetaItem key={m.id} m={m} />)}
          </Card>
        </TabsContent>
        <TabsContent value="atendente" className="mt-4">
          <Card className="p-6">
            <div className="mb-4 max-w-xs">
              <Select defaultValue={mockAtendentes[0].id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mockAtendentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              {mockMetas.map((m) => <MetaItem key={m.id} m={m} />)}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
