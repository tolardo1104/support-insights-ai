## Mudanças

### 1. Sincronização — capturar tickets atualizados/reabertos
**`src/lib/movidesk.functions.ts`**
- Adicionar `lastUpdate, reopenedIn` ao `$select`.
- Trocar filtro OData para `(createdDate ge X and createdDate le Y) or (lastUpdate ge X and lastUpdate le Y)` — captura tickets criados **ou** atualizados no período (reabertura, novas notas, edição).
- Persistir novos campos em `tickets_cache`: `atualizado_em` (timestamptz), `reaberto_em` (timestamptz), `reaberto` (boolean = `reopenedIn != null`).

**Migration**: adicionar colunas `atualizado_em`, `reaberto_em`, `reaberto` em `tickets_cache`.

### 2. Hook de tickets
**`src/lib/use-tickets-data.ts`**
- Adicionar `atualizado_em`, `reaberto`, `reaberto_em` no select e no tipo `Ticket`.
- Adicionar segundo hook `useTicketsPrevious(from, to)` que busca o período anterior equivalente (mesmo nº de dias) — usado para calcular tendência.

### 3. Dashboard — novo card e layout 5 por linha
**`src/routes/app.dashboard.tsx`**
- Nova métrica `reabertos` (count de `tickets.filter(t => t.reaberto)`).
- Reorganizar cards em **2 linhas de 5** (`grid-cols-2 md:grid-cols-3 lg:grid-cols-5`):
  - Linha 1: Tickets abertos · **Reabertos** · Resolvidos · Total · TMA médio
  - Linha 2: CSAT · FCR · TME · FRT · Taxa abandono
- Cards menores: padding reduzido no `MetricCard` (`p-4` opcional via prop `compact`), valor `text-2xl`.

### 4. Meta + tendência por card
**`src/components/metric-card.tsx`** — estender props:
- `meta?: number` — exibe "Meta: X" como hint quando presente.
- `trend?: number` — já existe; agora será calculada a partir do período anterior.
- `trendDirection?: 'up-good' | 'down-good'` — para métricas onde "menor é melhor" (TMA, TME, FRT, abandono, reabertos), inverter cor (verde quando cai).

**Dashboard:**
- Buscar `metas` da org (tabela `metas`) e mapear por métrica: `tma`, `csat`, `fcr`, `tme`, `frt`, `volume`, `abandono`, `reabertos`.
- Calcular `previous` window (mesma duração imediatamente antes de `from`), reusar `useTickets`, computar mesmas métricas, derivar `trend = ((atual - anterior) / anterior) * 100`.
- Passar `meta` e `trend` (com `trendDirection` correto) para cada `MetricCard`.

### Notas técnicas
- Filtro OData Movidesk com `or` precisa de parênteses corretamente codificados.
- Coluna `reaberto_em` usa `reopenedIn` do Movidesk (já existe na API).
- Período anterior = mesmo intervalo de dias deslocado para trás (ex: 30d atual → 30d anteriores).
- "Menor é melhor" cards: TMA, TME, FRT, Reabertos, Taxa abandono.

Após aplicar, será necessária **nova sincronização** para popular `atualizado_em`, `reaberto_em`, `reaberto` nos tickets existentes.
