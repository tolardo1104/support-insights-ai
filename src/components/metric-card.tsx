import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export function MetricCard({
  label, value, suffix, hint, trend, icon, meta, lowerIsBetter, compact, className, title
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  trend?: number | null;
  icon?: ReactNode;
  meta?: number | null;
  lowerIsBetter?: boolean;
  compact?: boolean;
  className?: string;
  title?: string;
}) {
  const hasTrend = typeof trend === "number" && isFinite(trend);
  const isUp = hasTrend && (trend as number) > 0;
  const isDown = hasTrend && (trend as number) < 0;
  const isFlat = hasTrend && (trend as number) === 0;
  const isGood = lowerIsBetter ? isDown : isUp;

  return (
    <Card className={cn(compact ? "p-3" : "p-5", className)} title={title}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          "font-medium text-muted-foreground uppercase tracking-wide",
          compact ? "text-[10px] leading-tight" : "text-xs",
        )}>{label}</span>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      </div>
      <div className={cn("flex items-baseline gap-1", compact ? "mt-1.5" : "mt-3")}>
        <span className={cn("font-semibold tabular-nums", compact ? "text-xl" : "text-3xl")}>{value}</span>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      <div className={cn("flex items-center justify-between gap-2", compact ? "mt-1.5" : "mt-2")}>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          {hasTrend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium tabular-nums shrink-0",
                isFlat
                  ? "bg-muted text-muted-foreground"
                  : isGood
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {isFlat ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend as number)}%
            </span>
          )}
          {hint && !compact && <span className="truncate">{hint}</span>}
        </div>
        {typeof meta === "number" && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            Meta: {meta}{suffix ?? ""}
          </span>
        )}
      </div>
    </Card>
  );
}
