import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Ticket = {
  id: string;
  movidesk_ticket_id: string | null;
  assunto: string | null;
  status: string | null;
  prioridade: string | null;
  categoria: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  atendente_id: string | null;
  criado_em: string | null;
  resolvido_em: string | null;
  atualizado_em: string | null;
  reaberto_em: string | null;
  reaberto: boolean | null;
  tma_minutos: number | null;
  csat_nota: number | null;
  tme_minutos: number | null;
  frt_minutos: number | null;
  abandonado: boolean | null;
};

const SELECT =
  "id,movidesk_ticket_id,assunto,status,prioridade,categoria,cliente_id,cliente_nome,atendente_id,criado_em,resolvido_em,atualizado_em,reaberto_em,reaberto,tma_minutos,csat_nota,tme_minutos,frt_minutos,abandonado";

async function fetchRange(dataInicio: string, dataFim: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("tickets_cache")
    .select(SELECT)
    .gte("criado_em", `${dataInicio}T00:00:00.000Z`)
    .lte("criado_em", `${dataFim}T23:59:59.999Z`)
    .order("criado_em", { ascending: false })
    .limit(2000);
  if (error || !data) return [];
  return data as any;
}

export function useTickets(from?: string, to?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString().slice(0, 10);
      const dataInicio = from ?? inicioMes;
      const dataFim = to ?? hoje.toISOString().slice(0, 10);
      const rows = await fetchRange(dataInicio, dataFim);
      setTickets(rows);
      setLoading(false);
    })();
  }, [from, to]);

  return { tickets, loading };
}

/** Retorna tickets do período imediatamente anterior e de mesma duração ao informado. */
export function useTicketsPrevious(from?: string, to?: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!from || !to) { setTickets([]); setLoading(false); return; }
      setLoading(true);
      const fromD = new Date(`${from}T00:00:00`);
      const toD = new Date(`${to}T00:00:00`);
      const dias = Math.max(1, Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1);
      const prevTo = new Date(fromD); prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (dias - 1));
      const rows = await fetchRange(
        prevFrom.toISOString().slice(0, 10),
        prevTo.toISOString().slice(0, 10),
      );
      setTickets(rows);
      setLoading(false);
    })();
  }, [from, to]);

  return { tickets, loading };
}

export type Atendente = { id: string; nome: string; equipe: string | null; email: string | null };
export function useAtendentes() {
  const [atendentes, setAtendentes] = useState<Atendente[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("atendentes").select("id,nome,equipe,email").eq("ativo", true);
      if (data) setAtendentes(data as any);
    })();
  }, []);
  return atendentes;
}
