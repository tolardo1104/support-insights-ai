import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Plug, Sparkles, Target, Trophy, Bot, FileText, BookOpen, HelpCircle, Sliders, Ticket } from "lucide-react";

export const Route = createFileRoute("/app/configuracoes")({ component: ConfigLayout });

const subnav = [
  { to: "/app/configuracoes/integracao", label: "Integração", icon: Plug },
  { to: "/app/configuracoes/ia", label: "IA", icon: Sparkles },
  { to: "/app/configuracoes/metas", label: "Metas", icon: Target },
  { to: "/app/configuracoes/ranking", label: "Ranking", icon: Trophy },
  { to: "/app/configuracoes/chatbot", label: "Chatbot", icon: Bot },
  { to: "/app/configuracoes/chatbot-prompt", label: "Prompt", icon: FileText },
  { to: "/app/configuracoes/chatbot-conhecimento", label: "Conhecimento", icon: BookOpen },
  { to: "/app/configuracoes/chatbot-faq", label: "FAQ", icon: HelpCircle },
  { to: "/app/configuracoes/chatbot-regras", label: "Regras", icon: Sliders },
  { to: "/app/configuracoes/chatbot-tickets", label: "Tickets", icon: Ticket },
];

function ConfigLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Configurações" description="Gerencie integrações, IA, metas e regras de pontuação." />
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        <Card className="p-2 h-fit">
          <nav className="space-y-1">
            {subnav.map((it) => {
              const active = path.startsWith(it.to);
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition",
                    active ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted",
                  )}
                >
                  <it.icon className="h-4 w-4" /> {it.label}
                </Link>
              );
            })}
          </nav>
        </Card>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
