import { AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function DemoBanner() {
  return (
    <div className="border-b bg-warning/10 text-warning-foreground">
      <div className="px-6 py-2 flex items-center gap-2 text-xs">
        <AlertCircle className="h-3.5 w-3.5 text-warning" />
        <span>
          <strong>Modo demonstração</strong> — você está vendo dados fictícios. Configure sua API Movidesk em{" "}
          <Link to="/app/configuracoes/integracao" className="underline font-medium">Configurações → Integração</Link>.
        </span>
      </div>
    </div>
  );
}
