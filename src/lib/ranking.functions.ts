import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Recalculate rankings for the current month based on tickets_cache + pesos. */
export const calculateRanking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles").select("organizacao_id").eq("id", userId).single();
    if (!profile?.organizacao_id) throw new Error("Organização não encontrada");
    const orgId = profile.organizacao_id;

    const { data: pesos } = await supabase.from("peso_ranking").select("*").eq("organizacao_id", orgId).single();
    const w = {
      csat: pesos?.peso_csat ?? 30,
      volume: pesos?.peso_volume ?? 25,
      tma: pesos?.peso_tma ?? 20,
      ia: pesos?.peso_score_ia ?? 15,
      metas: pesos?.peso_metas ?? 10,
    };

    const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

    const { data: tickets } = await supabase
      .from("tickets_cache").select("atendente_id,tma_minutos,csat_nota")
      .eq("organizacao_id", orgId).gte("criado_em", inicioMes.toISOString());

    if (!tickets?.length) return { ok: false, message: "Sem tickets do mês para calcular ranking." };

    const byAtend: Record<string, { volume: number; tmaSum: number; tmaN: number; csatSum: number; csatN: number }> = {};
    for (const t of tickets) {
      if (!t.atendente_id) continue;
      const a = (byAtend[t.atendente_id] ||= { volume: 0, tmaSum: 0, tmaN: 0, csatSum: 0, csatN: 0 });
      a.volume++;
      if (t.tma_minutos) { a.tmaSum += t.tma_minutos; a.tmaN++; }
      if (t.csat_nota) { a.csatSum += t.csat_nota; a.csatN++; }
    }

    const ids = Object.keys(byAtend);
    if (!ids.length) return { ok: false, message: "Tickets sem atendente vinculado." };

    const maxVolume = Math.max(...ids.map((i) => byAtend[i].volume));
    const tmaArr = ids.map((i) => byAtend[i].tmaN ? byAtend[i].tmaSum / byAtend[i].tmaN : Infinity);
    const minTma = Math.min(...tmaArr.filter((v) => isFinite(v))) || 1;

    const periodo = new Date(inicioMes).toISOString().slice(0, 10);

    // wipe current month
    await supabase.from("ranking_scores").delete().eq("organizacao_id", orgId).eq("periodo_mes", periodo);

    const rows = ids.map((id) => {
      const a = byAtend[id];
      const csat = a.csatN ? (a.csatSum / a.csatN) : 0; // 0..100 ou 0..5
      const csatNorm = csat > 10 ? csat : csat * 20; // normaliza para 0..100
      const tma = a.tmaN ? a.tmaSum / a.tmaN : minTma;
      const tmaScore = Math.max(0, Math.min(100, (minTma / tma) * 100));
      const volScore = (a.volume / maxVolume) * 100;
      const iaScore = 70; // placeholder até termos análise IA por atendente
      const metasScore = 75;
      const total =
        (csatNorm * w.csat + volScore * w.volume + tmaScore * w.tma + iaScore * w.ia + metasScore * w.metas) / 100;
      return {
        organizacao_id: orgId, atendente_id: id, periodo_mes: periodo,
        score_csat: csatNorm, score_volume: volScore, score_tma: tmaScore,
        score_ia: iaScore, score_metas: metasScore, score_total: +total.toFixed(2),
      };
    }).sort((a, b) => b.score_total - a.score_total)
      .map((r, i) => ({ ...r, posicao: i + 1 }));

    await supabase.from("ranking_scores").insert(rows);

    return { ok: true, message: `Ranking calculado para ${rows.length} atendentes.` };
  });
