import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export function MetricCard({
  label, value, suffix, hint, trend, icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  trend?: number;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {(hint || typeof trend === "number") && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {typeof trend === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium tabular-nums",
                trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </Card>
  );
}
