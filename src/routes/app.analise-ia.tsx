import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockAnaliseIaGeral, mockHistoricoAnalises } from "@/lib/mock-data";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/analise-ia")({ component: AnaliseIaPage });

function AnaliseIaPage() {
  const [resultado, setResultado] = useState(mockAnaliseIaGeral);
  const [loading, setLoading] = useState(false);

  const exec = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResultado(mockAnaliseIaGeral);
      toast.success("Análise gerada");
    }, 1500);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Central de Análise IA" description="Gere insights sobre o período usando o provedor de IA configurado." />

      <Card className="p-6 mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Análise do período</h3>
        <div className="flex gap-3 flex-wrap mb-6">
          <Select defaultValue="mes">
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Última semana</SelectItem>
              <SelectItem value="mes">Último mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exec} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Executar análise
          </Button>
        </div>

        <div className="prose prose-sm max-w-none whitespace-pre-line text-sm border rounded-md p-5 bg-muted/20">
          {resultado}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Histórico de análises</h3>
        <div className="space-y-2">
          {mockHistoricoAnalises.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/30 transition">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Análise {h.tipo}</div>
                  <div className="text-xs text-muted-foreground font-mono">{h.data}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{h.provedor}</Badge>
                <span className="text-xs text-muted-foreground font-mono">{h.modelo}</span>
                <Button variant="ghost" size="sm">Reabrir</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
