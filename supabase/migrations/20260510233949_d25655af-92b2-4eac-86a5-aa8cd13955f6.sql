
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS sync_periodo_inicio date,
  ADD COLUMN IF NOT EXISTS sync_periodo_fim date,
  ADD COLUMN IF NOT EXISTS sync_ultimo_em timestamptz,
  ADD COLUMN IF NOT EXISTS sync_total_importado integer;

CREATE TABLE IF NOT EXISTS public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL,
  periodo_inicio date,
  periodo_fim date,
  total_importado integer DEFAULT 0,
  status text NOT NULL,
  mensagem_erro text,
  executado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members select sync_log" ON public.sync_log FOR SELECT USING (organizacao_id = public.get_user_org(auth.uid()));
CREATE POLICY "org members insert sync_log" ON public.sync_log FOR INSERT WITH CHECK (organizacao_id = public.get_user_org(auth.uid()));
CREATE POLICY "org members update sync_log" ON public.sync_log FOR UPDATE USING (organizacao_id = public.get_user_org(auth.uid()));
CREATE POLICY "org members delete sync_log" ON public.sync_log FOR DELETE USING (organizacao_id = public.get_user_org(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sync_log_org_executado ON public.sync_log(organizacao_id, executado_em DESC);
