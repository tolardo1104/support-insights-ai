import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MOVIDESK_BASE = "https://api.movidesk.com/public/v1";

/** Test the Movidesk API key by fetching one ticket. */
export const testMovideskConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { apiKey: string }) => z.object({ apiKey: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const url = `${MOVIDESK_BASE}/tickets?token=${encodeURIComponent(data.apiKey)}&$top=1&$select=id`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        return { ok: false, status: res.status, message: text.slice(0, 200) };
      }
      return { ok: true, status: 200, message: "Conexão estabelecida" };
    } catch (e: any) {
      return { ok: false, status: 0, message: e?.message ?? "Erro de rede" };
    }
  });

/** Sync recent tickets from Movidesk into tickets_cache. */
export const syncMovideskTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dias?: number }) => z.object({ dias: z.number().int().min(1).max(180).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get org + key
    const { data: profile } = await supabase
      .from("profiles").select("organizacao_id").eq("id", userId).single();
    if (!profile?.organizacao_id) throw new Error("Organização não encontrada");
    const orgId = profile.organizacao_id;

    const { data: cfg } = await supabase
      .from("configuracoes").select("movidesk_api_key").eq("organizacao_id", orgId).single();
    const apiKey = cfg?.movidesk_api_key;
    if (!apiKey) return { ok: false, importados: 0, message: "Configure a API Key da Movidesk em Configurações." };

    const since = new Date(Date.now() - data.dias * 86400_000).toISOString();
    const select = "id,subject,status,baseStatus,category,urgency,createdDate,resolvedIn,owner,clients,satisfactionSurvey";
    const filter = `createdDate ge ${since}`;
    const url = `${MOVIDESK_BASE}/tickets?token=${encodeURIComponent(apiKey)}&$top=200&$select=${encodeURIComponent(select)}&$filter=${encodeURIComponent(filter)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, importados: 0, message: `Movidesk ${res.status}: ${text.slice(0, 150)}` };
    }
    const tickets: any[] = await res.json();

    // Upsert atendentes
    const ownersMap = new Map<string, { nome: string; email: string | null }>();
    for (const t of tickets) {
      const o = t.owner;
      if (o?.id) ownersMap.set(String(o.id), { nome: o.businessName ?? o.personName ?? "—", email: o.email ?? null });
    }
    const atendentesByMovideskId = new Map<string, string>(); // movidesk_id -> atendente.id
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

    // Upsert tickets_cache
    let count = 0;
    for (const t of tickets) {
      const ownerMovideskId = t.owner?.id ? String(t.owner.id) : null;
      const atendenteId = ownerMovideskId ? atendentesByMovideskId.get(ownerMovideskId) ?? null : null;
      const cliente = t.clients?.[0];
      const tmaMin = t.resolvedIn && t.createdDate
        ? Math.round((new Date(t.resolvedIn).getTime() - new Date(t.createdDate).getTime()) / 60000)
        : null;
      const csat = t.satisfactionSurvey?.lastSatisfaction ?? null;

      const payload = {
        organizacao_id: orgId,
        movidesk_ticket_id: String(t.id),
        assunto: t.subject ?? null,
        status: t.baseStatus ?? t.status ?? null,
        prioridade: t.urgency ?? null,
        categoria: t.category ?? null,
        cliente_id: cliente?.id ? String(cliente.id) : null,
        cliente_nome: cliente?.businessName ?? cliente?.personName ?? null,
        atendente_id: atendenteId,
        criado_em: t.createdDate ?? null,
        resolvido_em: t.resolvedIn ?? null,
        tma_minutos: tmaMin,
        csat_nota: csat,
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

    return { ok: true, importados: count, message: `${count} tickets sincronizados` };
  });
