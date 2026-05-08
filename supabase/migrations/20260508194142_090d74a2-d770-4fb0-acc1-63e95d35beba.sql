
-- Organizacoes
CREATE TABLE public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plano TEXT NOT NULL DEFAULT 'free' CHECK (plano IN ('free','pro','enterprise')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (liga auth.users a organizacao)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL,
  nome TEXT,
  email TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper function to get user's org
CREATE OR REPLACE FUNCTION public.get_user_org(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organizacao_id FROM public.profiles WHERE id = _user_id
$$;

-- Auto-create profile + org on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  org_name := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));
  INSERT INTO public.organizacoes (nome, slug)
  VALUES (org_name || '''s Org', lower(replace(org_name, ' ', '-')) || '-' || substr(NEW.id::text, 1, 8))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organizacao_id, nome, email)
  VALUES (NEW.id, new_org_id, org_name, NEW.email);

  -- default config
  INSERT INTO public.configuracoes (organizacao_id) VALUES (new_org_id);
  INSERT INTO public.peso_ranking (organizacao_id) VALUES (new_org_id);

  RETURN NEW;
END;
$$;

-- Configuracoes
CREATE TABLE public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE UNIQUE,
  movidesk_api_key TEXT,
  ia_provedor TEXT DEFAULT 'gemini' CHECK (ia_provedor IN ('claude','openai','gemini','groq')),
  ia_api_key TEXT,
  ia_modelo TEXT DEFAULT 'gemini-2.0-flash',
  ia_prompt_analise_geral TEXT DEFAULT 'Você é um especialista em gestão de suporte ao cliente. Analise os dados abaixo referentes ao período e identifique: 1) Visão geral do desempenho 2) Padrões de problemas recorrentes por categoria 3) Atendentes que merecem destaque e os que precisam de atenção 4) Clientes com alto volume de chamados (risco de churn) 5) Oportunidades de melhoria de processo 6) Sugestões de conteúdo self-service para reduzir volume. Seja direto, use linguagem simples, com recomendações práticas e acionáveis. Responda em português do Brasil.',
  ia_prompt_analise_atendente TEXT DEFAULT 'Você é um especialista em qualidade de atendimento. Analise as conversas abaixo do atendente {NOME} e avalie de 0 a 10 cada dimensão: 1) Escuta ativa 2) Clareza 3) Conhecimento técnico 4) Empatia/tom 5) Agilidade 6) Seguimento. Para cada dimensão: nota (0-10), 1 ponto forte, 1 ponto de melhoria com exemplo real. Classificação final: Destaque / Regular / Atenção necessária. Retorne JSON com estrutura: {classificacao, dimensoes: [{nome, nota, ponto_forte, ponto_melhoria, exemplo}], resumo, plano_desenvolvimento: [{prioridade, titulo, descricao}]}.',
  ia_analise_automatica TEXT DEFAULT 'manual' CHECK (ia_analise_automatica IN ('manual','diaria','sync')),
  ia_tickets_analisados INT DEFAULT 20,
  ia_idioma TEXT DEFAULT 'pt-BR',
  sync_intervalo_minutos INT DEFAULT 60,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.atendentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  movidesk_id TEXT,
  nome TEXT NOT NULL,
  email TEXT,
  equipe TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tickets_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  movidesk_ticket_id TEXT,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_id TEXT,
  assunto TEXT,
  categoria TEXT,
  status TEXT,
  prioridade TEXT,
  criado_em TIMESTAMPTZ,
  resolvido_em TIMESTAMPTZ,
  tma_minutos INT,
  mensagens JSONB DEFAULT '[]'::jsonb,
  csat_nota INT,
  sincronizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analises_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('geral','atendente','cliente','periodo')),
  periodo_inicio DATE,
  periodo_fim DATE,
  resultado JSONB NOT NULL,
  ia_provedor TEXT,
  ia_modelo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES public.atendentes(id) ON DELETE CASCADE,
  metrica TEXT NOT NULL CHECK (metrica IN ('tickets_mes','tma_horas','csat','resolucao_primeiro_contato','primeira_resposta')),
  valor_meta NUMERIC NOT NULL,
  periodo TEXT NOT NULL DEFAULT 'mensal' CHECK (periodo IN ('mensal','semanal')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ranking_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  atendente_id UUID NOT NULL REFERENCES public.atendentes(id) ON DELETE CASCADE,
  periodo_mes DATE NOT NULL,
  score_total NUMERIC,
  score_csat NUMERIC,
  score_volume NUMERIC,
  score_tma NUMERIC,
  score_ia NUMERIC,
  score_metas NUMERIC,
  posicao INT,
  calculado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.peso_ranking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE UNIQUE,
  peso_csat INT DEFAULT 30,
  peso_volume INT DEFAULT 25,
  peso_tma INT DEFAULT 20,
  peso_score_ia INT DEFAULT 15,
  peso_metas INT DEFAULT 10,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger after the configuracoes table exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peso_ranking ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Organizacoes - members can read their org
CREATE POLICY "members read org" ON public.organizacoes FOR SELECT USING (id = public.get_user_org(auth.uid()));
CREATE POLICY "members update org" ON public.organizacoes FOR UPDATE USING (id = public.get_user_org(auth.uid()));

-- Generic org-scoped policies for the rest
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['configuracoes','atendentes','tickets_cache','analises_ia','metas','ranking_scores','peso_ranking']) LOOP
    EXECUTE format('CREATE POLICY "org members select" ON public.%I FOR SELECT USING (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members insert" ON public.%I FOR INSERT WITH CHECK (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members update" ON public.%I FOR UPDATE USING (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members delete" ON public.%I FOR DELETE USING (organizacao_id = public.get_user_org(auth.uid()))', t);
  END LOOP;
END $$;
