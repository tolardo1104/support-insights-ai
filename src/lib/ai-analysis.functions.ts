import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProviderAndModel } from "@/lib/ai-gateway";

async function getOrgConfig(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles").select("organizacao_id").eq("id", userId).single();
  if (!profile?.organizacao_id) throw new Error("Organização não encontrada");
  const { data: cfg } = await supabase
    .from("configuracoes").select("*").eq("organizacao_id", profile.organizacao_id).single();
  return { orgId: profile.organizacao_id as string, cfg };
}

function getApiKey(cfg: any): string {
  // Prefer user-supplied IA key; fall back to Lovable AI gateway key (server-injected)
  return cfg?.ia_api_key || (process.env.LOVABLE_API_KEY as string);
}

/** Analyze the period: aggregate tickets and generate insights. */
export const analyzePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    periodo?: "semana" | "mes" | "trimestre";
    dataInicio?: string;
    dataFim?: string;
    promptOverride?: string;
    tipoAnalise?: string;
  }) =>
    z.object({
      periodo: z.enum(["semana", "mes", "trimestre"]).default("mes"),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      promptOverride: z.string().optional(),
      tipoAnalise: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { orgId, cfg } = await getOrgConfig(supabase, userId);

    // Calcular datas
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataFim = data.dataFim ?? hoje.toISOString().slice(0, 10);
    const dataInicio = data.dataInicio
      ?? (data.periodo === "semana"
        ? new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10)
        : data.periodo === "trimestre"
        ? new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10)
        : inicioMes.toISOString().slice(0, 10));

    const { data: tickets } = await supabase
      .from("tickets_cache")
      .select("*")
      .eq("organizacao_id", orgId)
      .gte("criado_em", `${dataInicio}T00:00:00.000Z`)
      .lte("criado_em", `${dataFim}T23:59:59.999Z`)
      .limit(cfg?.ia_tickets_analisados ?? 100);

    if (!tickets?.length) {
      return {
        ok: false,
        resultado: "Nenhum ticket encontrado no período. Sincronize com a Movidesk primeiro.",
      };
    }

    const apiKey = getApiKey(cfg);
    if (!apiKey) return { ok: false, resultado: "Configure uma API Key de IA em Configurações." };

    const totais = {
      total: tickets.length,
      resolvidos: tickets.filter((t: any) => t.resolvido_em).length,
      tmaMedio: Math.round(
        tickets.filter((t: any) => t.tma_minutos)
          .reduce((s: number, t: any) => s + (t.tma_minutos || 0), 0) /
        Math.max(1, tickets.filter((t: any) => t.tma_minutos).length)
      ),
      csatMedio: +(
        tickets.filter((t: any) => t.csat_nota)
          .reduce((s: number, t: any) => s + (t.csat_nota || 0), 0) /
        Math.max(1, tickets.filter((t: any) => t.csat_nota).length)
      ).toFixed(1),
      categorias: Object.entries(
        tickets.reduce((acc: any, t: any) => {
          const k = t.categoria || "Sem categoria";
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {})
      ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10),
    };

    const model = getProviderAndModel(cfg?.ia_provedor || "gemini", apiKey, cfg?.ia_modelo);

    // Se promptOverride, usar ele diretamente; caso contrário usar o prompt configurado
    const prompt = data.promptOverride
      ? `${data.promptOverride}\n\nDADOS DO PERÍODO (${dataInicio} → ${dataFim}):\n${JSON.stringify(totais, null, 2)}`
      : `${cfg?.ia_prompt_analise_geral || "Analise os dados de suporte e dê insights acionáveis."}\n\nDADOS DO PERÍODO (${dataInicio} → ${dataFim}):\n${JSON.stringify(totais, null, 2)}\n\nAmostra de assuntos:\n${tickets.slice(0, 30).map((t: any) => `- [${t.categoria || "—"}] ${t.assunto}`).join("\n")}`;

    try {
      const { text } = await generateText({ model, prompt });

      // Salvar no banco sempre (sobrescreve para análise geral normal; cria novo para overrides)
      const tipoSalvar = data.tipoAnalise || (data.promptOverride ? null : "geral");
      
      if (tipoSalvar) {
        await supabase.from("analises_ia").insert({
          organizacao_id: orgId,
          tipo: tipoSalvar,
          ia_provedor: cfg?.ia_provedor,
          ia_modelo: cfg?.ia_modelo,
          resultado: { texto: text, totais } as any,
          periodo_inicio: dataInicio,
          periodo_fim: dataFim,
        });
      }

      return { ok: true, resultado: text };
    } catch (error: any) {
      console.error("Erro na geração de IA (analyzePeriod):", error);
      return { ok: false, resultado: `Erro da IA: ${error.message || "Erro desconhecido"}` };
    }
  });

/** Analyze a specific atendente. */
export const analyzeAtendente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { atendenteId: string }) => z.object({ atendenteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { orgId, cfg } = await getOrgConfig(supabase, userId);

    const { data: atend } = await supabase.from("atendentes").select("*").eq("id", data.atendenteId).eq("organizacao_id", orgId).single();
    if (!atend) throw new Error("Atendente não encontrado");

    const { data: tickets } = await supabase
      .from("tickets_cache").select("*").eq("organizacao_id", orgId).eq("atendente_id", data.atendenteId).limit(cfg?.ia_tickets_analisados ?? 30);

    if (!tickets?.length) return { ok: false, resultado: "Sem tickets deste atendente para analisar." };

    const apiKey = getApiKey(cfg);
    if (!apiKey) return { ok: false, resultado: "Configure uma API Key de IA em Configurações." };

    const model = getProviderAndModel(cfg?.ia_provedor || "gemini", apiKey, cfg?.ia_modelo);

    const prompt = (cfg?.ia_prompt_analise_atendente || "").replace("{NOME}", atend.nome) +
      "\n\nTICKETS:\n" + tickets.map((t: any) => `- [${t.categoria || "—"}] ${t.assunto} | TMA ${t.tma_minutos}min | CSAT ${t.csat_nota ?? "—"}`).join("\n") +
      "\n\nIMPORTANTE: Forneça a sua análise em texto, e no final escreva exatamente 'CLASSIFICACAO: DESTAQUE', 'CLASSIFICACAO: REGULAR' ou 'CLASSIFICACAO: ATENCAO' com base na sua avaliação geral do atendente.";

    try {
      const { text } = await generateText({ model, prompt });

      let classificacao = "regular";
      const match = text.match(/CLASSIFICACAO:\s*(DESTAQUE|REGULAR|ATENCAO|ATENÇÃO)/i);
      if (match) {
        classificacao = match[1].toLowerCase().replace("atenção", "atencao");
      }

      await supabase.from("analises_ia").insert({
        organizacao_id: orgId, atendente_id: data.atendenteId, tipo: "atendente",
        ia_provedor: cfg?.ia_provedor, ia_modelo: cfg?.ia_modelo,
        resultado: { texto: text, classificacao },
      });

      return { ok: true, resultado: text };
    } catch (error: any) {
      console.error("Erro na geração de IA (analyzeAtendente):", error);
      return { ok: false, resultado: `Erro da IA: ${error.message || "Erro desconhecido"}` };
    }
  });
