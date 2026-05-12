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
  tme_minutos: number | null;       // Tempo médio de espera (1ª resposta)
  frt_minutos: number | null;       // First Response Time
  abandonado: boolean | null;       // Se o ticket foi abandonado/sem resposta
};

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

      const { data, error } = await supabase
        .from("tickets_cache")
        .select("id,movidesk_ticket_id,assunto,status,prioridade,categoria,cliente_id,cliente_nome,atendente_id,criado_em,resolvido_em,tma_minutos,csat_nota,tme_minutos,frt_minutos,abandonado")
        .gte("criado_em", `${dataInicio}T00:00:00.000Z`)
        .lte("criado_em", `${dataFim}T23:59:59.999Z`)
        .order("criado_em", { ascending: false })
        .limit(2000);
      if (!error && data) setTickets(data as any);
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
