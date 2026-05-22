import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Building2, Sparkles, Target, Trophy, Settings, LogOut, Moon, Sun,
  MessageCircle, MessagesSquare, ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/atendentes", label: "Atendentes", icon: Users },
  { to: "/app/clientes", label: "Clientes", icon: Building2 },
  { to: "/app/analise-ia", label: "Análise IA", icon: Sparkles },
  { to: "/app/metas", label: "Metas", icon: Target },
  { to: "/app/ranking", label: "Ranking", icon: Trophy },
  { to: "/app/configuracoes", label: "Configurações", icon: Settings },
  { to: "/app/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/app/conversas", label: "Conversas", icon: MessagesSquare },
  { to: "/app/curadoria", label: "Curadoria", icon: ClipboardCheck },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <aside className="w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold leading-tight">SupportIQ</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const active = path === it.to || path.startsWith(it.to + "/");
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50",
              )}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
            {(user?.email ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.email ?? "Demo"}</div>
            <div className="text-[10px] text-muted-foreground">Plano Free</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={signOut} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
