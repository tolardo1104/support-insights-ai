import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalizeBase(url: string) {
  return url.replace(/\/+$/, "");
}

async function evoFetch(base: string, path: string, apiKey: string, init: RequestInit = {}) {
  const res = await fetch(`${normalizeBase(base)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Cria (se necessário) a instância na Evolution API e busca o QR Code.
 * Retorna QR em base64 (sem o prefixo data:image/png;base64,).
 */
export const conectarEvolutionQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ conexaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cx, error } = await supabase
      .from("conexoes_whatsapp" as any)
      .select("*")
      .eq("id", data.conexaoId)
      .single();
    if (error || !cx) throw new Error("Conexão não encontrada");
    const c: any = cx;
    if (!c.url_servidor) throw new Error("URL do servidor Evolution não configurada");
    if (!c.api_key_provedor) throw new Error("API Key do servidor não configurada");
    if (!c.instance_name) throw new Error("Nome da instância não configurado");

    const base = c.url_servidor;
    const apiKey = c.api_key_provedor;
    const instance = c.instance_name;

    // Verifica se a instância já existe
    const list = await evoFetch(base, `/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`, apiKey);
    const exists = Array.isArray(list.body)
      ? list.body.some((i: any) => (i?.instance?.instanceName ?? i?.name ?? i?.instanceName) === instance)
      : false;

    let qrcode: string | null = null;
    let pairingCode: string | null = null;

    if (!exists) {
      // Cria a instância (já retorna o QR na maioria das versões)
      const create = await evoFetch(base, `/instance/create`, apiKey, {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          number: c.numero_telefone || undefined,
        }),
      });
      if (!create.ok) {
        throw new Error(`Falha ao criar instância: ${create.status} ${JSON.stringify(create.body)}`);
      }
      qrcode = create.body?.qrcode?.base64 ?? create.body?.qrcode?.code ?? create.body?.base64 ?? null;
      pairingCode = create.body?.qrcode?.pairingCode ?? null;
    }

    // Se ainda não tem QR (instância já existia ou create não retornou), busca em /instance/connect
    if (!qrcode) {
      const conn = await evoFetch(base, `/instance/connect/${encodeURIComponent(instance)}`, apiKey);
      if (!conn.ok) {
        throw new Error(`Falha ao conectar instância: ${conn.status} ${JSON.stringify(conn.body)}`);
      }
      qrcode = conn.body?.base64 ?? conn.body?.qrcode?.base64 ?? conn.body?.code ?? null;
      pairingCode = conn.body?.pairingCode ?? pairingCode;
    }

    // Limpa prefixo data: se vier
    if (qrcode && qrcode.startsWith("data:")) {
      const idx = qrcode.indexOf(",");
      if (idx >= 0) qrcode = qrcode.slice(idx + 1);
    }

    if (!qrcode) throw new Error("Servidor não retornou o QR Code");

    await supabase
      .from("conexoes_whatsapp" as any)
      .update({
        status: "aguardando_qr",
        qr_code_base64: qrcode,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", data.conexaoId);

    return { qrcode, pairingCode };
  });

/**
 * Verifica o status atual da instância na Evolution API.
 */
export const checarStatusEvolution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ conexaoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cx } = await supabase
      .from("conexoes_whatsapp" as any)
      .select("*")
      .eq("id", data.conexaoId)
      .single();
    const c: any = cx;
    if (!c) throw new Error("Conexão não encontrada");
    if (!c.url_servidor || !c.api_key_provedor || !c.instance_name) {
      throw new Error("Conexão incompleta");
    }

    const r = await evoFetch(
      c.url_servidor,
      `/instance/connectionState/${encodeURIComponent(c.instance_name)}`,
      c.api_key_provedor,
    );
    const state: string = r.body?.instance?.state ?? r.body?.state ?? "unknown";
    let status = c.status;
    if (state === "open") status = "conectado";
    else if (state === "connecting") status = "aguardando_qr";
    else if (state === "close") status = "desconectado";

    const patch: any = { status, atualizado_em: new Date().toISOString() };
    if (status === "conectado") patch.qr_code_base64 = null;
    await supabase.from("conexoes_whatsapp" as any).update(patch).eq("id", data.conexaoId);

    return { state, status };
  });
