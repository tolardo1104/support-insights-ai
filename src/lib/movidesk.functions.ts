import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MOVIDESK_BASE = "https://api.movidesk.com/public/v1";
const SELECT_FIELDS =
  "id,type,subject,category,urgency,status,baseStatus,origin,createdDate,resolvedIn,closedIn,lastUpdate,reopenedIn,ownerTeam,tags";
const EXPAND_FIELDS =
  "owner($select=id,businessName,email),clients($select=id,businessName,email),actions($select=id,type,createdDate,createdBy;$top=5;$orderby=createdDate asc),satisfactionSurveyResponses";

function tratarErroMovidesk(status: number, body: any): string {
  if (status === 400) return `Campo inválido na query Movidesk. ${body?.message ?? ""}`.trim();
  if (status === 401) return "Token da Movidesk inválido ou expirado. Verifique nas configurações.";
  if (status === 429) return "Limite de requisições atingido (10/min). Aguarde e tente novamente.";
  if (status === 500) return "Erro interno na Movidesk. Tente novamente em alguns minutos.";
  return `Erro ${status}: ${body?.message || "Erro desconhecido"}`;
}

function calcularTmaHoras(createdDate?: string | null, resolvedIn?: string | null): number | null {
  if (!createdDate || !resolvedIn) return null;
  const diff = new Date(resolvedIn).getTime() - new Date(createdDate).getTime();
  if (isNaN(diff) || diff < 0) return null;
  return Math.round((diff / 3_600_000) * 10) / 10;
}

/** Test the Movidesk API key by fetching one ticket. */
export const testMovideskConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { apiKey: string }) => z.object({ apiKey: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${MOVIDESK_BASE}/tickets?token=${encodeURIComponent(data.apiKey)}&$top=1&$select=id`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        let body: any = null;
        try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
        return { ok: false, status: res.status, message: tratarErroMovidesk(res.status, body) };
      }
      return { ok: true, status: 200, message: "Conexão estabelecida" };
    } catch (e: any) {
      return { ok: false, status: 0, message: e?.message ?? "Erro de rede" };
    }
  });

/** Sync tickets from Movidesk for a given period. */
export const syncMovideskTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataInicio: string; dataFim: string }) =>
    z.object({
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles").select("organizacao_id").eq("id", userId).single();
    if (!profile?.organizacao_id) throw new Error("Organização não encontrada");
    const orgId = profile.organizacao_id;

    const { data: cfg } = await supabase
      .from("configuracoes").select("movidesk_api_key").eq("organizacao_id", orgId).single();
    const apiKey = cfg?.movidesk_api_key;
    if (!apiKey) {
      return { ok: false, importados: 0, message: "Configure a API Key da Movidesk em Configurações." };
    }

    const PAGE_SIZE = 100;
    let skip = 0;
    const tickets: any[] = [];
    const ini = `${data.dataInicio}T00:00:00.000z`;
    const fim = `${data.dataFim}T23:59:59.000z`;
    const filter = `(createdDate ge ${ini} and createdDate le ${fim}) or (lastUpdate ge ${ini} and lastUpdate le ${fim})`;

    try {
      while (true) {
        if (skip > 0) await new Promise((r) => setTimeout(r, 6000));
        const url =
          `${MOVIDESK_BASE}/tickets?token=${encodeURIComponent(apiKey)}` +
          `&$select=${SELECT_FIELDS}` +
          `&$expand=${encodeURIComponent(EXPAND_FIELDS)}` +
          `&$filter=${encodeURIComponent(filter)}` +
          `&$orderby=createdDate desc` +
          `&$top=${PAGE_SIZE}&$skip=${skip}`;

        const res = await fetch(url);
        if (!res.ok) {
          let body: any = null;
          try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
          const msg = tratarErroMovidesk(res.status, body);
          await supabase.from("sync_log").insert({
            organizacao_id: orgId, periodo_inicio: data.dataInicio, periodo_fim: data.dataFim,
            total_importado: tickets.length, status: "erro", mensagem_erro: msg,
          });
          return { ok: false, importados: tickets.length, message: msg };
        }
        const page: any[] = await res.json();
        if (!Array.isArray(page) || page.length === 0) break;
        tickets.push(...page);
        skip += PAGE_SIZE;
        if (page.length < PAGE_SIZE) break;
        if (skip >= 5000) break; // safety cap
      }
    } catch (e: any) {
      const msg = e?.message ?? "Erro de rede ao consultar Movidesk";
      await supabase.from("sync_log").insert({
        organizacao_id: orgId, periodo_inicio: data.dataInicio, periodo_fim: data.dataFim,
        total_importado: tickets.length, status: "erro", mensagem_erro: msg,
      });
      return { ok: false, importados: tickets.length, message: msg };
    }

    // Upsert atendentes
    const ownersMap = new Map<string, { nome: string; email: string | null }>();
    for (const t of tickets) {
      const o = t.owner;
      if (o?.id) ownersMap.set(String(o.id), { nome: o.businessName ?? "—", email: o.email ?? null });
    }
    const atendentesByMovideskId = new Map<string, string>();
    for (const [movideskId, info] of ownersMap) {
      const { data: existing } = await supabase
        .from("atendentes").select("id").eq("organizacao_id", orgId).eq("movidesk_id", movideskId).maybeSingle();
      if (existing) {
        atendentesByMovideskId.set(movideskId, existing.id);
      } else {
        const { data: ins } = await supabase
          .from("atendentes").insert({ organizacao_id: orgId, movidesk_id: movideskId, nome: info.nome, email: info.email })
          .select("id").single();
        if (ins) atendentesByMovideskId.set(movideskId, ins.id);
      }
    }

    let count = 0;
    for (const t of tickets) {
      const ownerMovideskId = t.owner?.id ? String(t.owner.id) : null;
      const atendenteId = ownerMovideskId ? atendentesByMovideskId.get(ownerMovideskId) ?? null : null;
      const cliente = Array.isArray(t.clients) ? t.clients[0] : null;
      const tmaHoras = calcularTmaHoras(t.createdDate, t.resolvedIn);
      const tmaMin = tmaHoras !== null ? Math.round(tmaHoras * 60) : null;

      // Calcular FRT: tempo até primeira ação do atendente
      let frtMinutos: number | null = null;
      if (Array.isArray(t.actions) && t.createdDate) {
        const primeiraResposta = t.actions.find(
          (a: any) => a.type === 2 // type 2 = resposta do atendente na Movidesk
        );
        if (primeiraResposta?.createdDate) {
          const diff = new Date(primeiraResposta.createdDate).getTime()
            - new Date(t.createdDate).getTime();
          frtMinutos = diff > 0 ? Math.round(diff / 60000) : null;
        }
      }

      // Extrair NPS/CSAT da pesquisa de satisfação Movidesk
      let csatNota: number | null = null;
      if (Array.isArray(t.satisfactionSurveyResponses) && t.satisfactionSurveyResponses.length > 0) {
        const r = t.satisfactionSurveyResponses[0];
        const candidato =
          r?.npsScore ??
          r?.satisfactionWithService ??
          r?.satisfactionWithSupport ??
          r?.satisfactionWithExperience ??
          r?.score ??
          null;
        if (typeof candidato === "number") csatNota = candidato;
      }

      const payload = {
        organizacao_id: orgId,
        movidesk_ticket_id: String(t.id),
        assunto: t.subject ?? null,
        status: t.baseStatus ?? t.status ?? null,
        prioridade: t.urgency ?? null,
        categoria: t.category ?? null,
        cliente_id: cliente?.id ? String(cliente.id) : null,
        cliente_nome: cliente?.businessName ?? null,
        atendente_id: atendenteId,
        criado_em: t.createdDate ?? null,
        resolvido_em: t.resolvedIn ?? null,
        atualizado_em: t.lastUpdate ?? null,
        reaberto_em: t.reopenedIn ?? null,
        reaberto: !!t.reopenedIn,
        tma_minutos: tmaMin,
        csat_nota: csatNota,
        tme_minutos: frtMinutos,
        frt_minutos: frtMinutos,
        abandonado: t.baseStatus === "Cancelado" || t.baseStatus === "Abandonado" || false,
        sincronizado_em: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("tickets_cache").select("id").eq("organizacao_id", orgId).eq("movidesk_ticket_id", String(t.id)).maybeSingle();
      if (existing) {
        await supabase.from("tickets_cache").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("tickets_cache").insert(payload);
      }
      count++;
    }

    await supabase.from("configuracoes").update({
      sync_periodo_inicio: data.dataInicio,
      sync_periodo_fim: data.dataFim,
      sync_ultimo_em: new Date().toISOString(),
      sync_total_importado: count,
    }).eq("organizacao_id", orgId);

    await supabase.from("sync_log").insert({
      organizacao_id: orgId, periodo_inicio: data.dataInicio, periodo_fim: data.dataFim,
      total_importado: count, status: "sucesso",
    });

    return { ok: true, importados: count, message: `${count} tickets sincronizados` };
  });
