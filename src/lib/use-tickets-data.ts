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
  tma_minutos: number | null;
  csat_nota: number | null;
};

export function useTickets(periodoDias = 30) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - periodoDias * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("tickets_cache")
        .select("id,movidesk_ticket_id,assunto,status,prioridade,categoria,cliente_id,cliente_nome,atendente_id,criado_em,resolvido_em,tma_minutos,csat_nota")
        .gte("criado_em", since)
        .order("criado_em", { ascending: false })
        .limit(2000);
      if (!error && data) setTickets(data as any);
      setLoading(false);
    })();
  }, [periodoDias]);

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
