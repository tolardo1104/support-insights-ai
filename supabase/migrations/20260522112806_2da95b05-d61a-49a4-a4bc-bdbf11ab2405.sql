-- Conexões WhatsApp
CREATE TABLE IF NOT EXISTS public.conexoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  provedor TEXT NOT NULL CHECK (provedor IN ('evolution_qr','evolution_official','zapi','meta_oficial','sidobe','outro')),
  status TEXT DEFAULT 'desconectado' CHECK (status IN ('conectado','desconectado','aguardando_qr','erro')),
  numero_telefone TEXT,
  url_servidor TEXT,
  api_key_provedor TEXT,
  instance_name TEXT,
  qr_code_base64 TEXT,
  ativo BOOLEAN DEFAULT false,
  webhook_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracoes_chatbot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE UNIQUE,
  ativo BOOLEAN DEFAULT false,
  nome_assistente TEXT DEFAULT 'Sofia',
  prompt_sistema TEXT DEFAULT 'Você é {nome_assistente}, assistente virtual de atendimento. Seja cordial, empático e objetivo. Fale em português do Brasil de forma natural e humana. Solicite o CPF ou CNPJ para identificar o cliente antes de prosseguir.',
  mensagem_boas_vindas TEXT DEFAULT 'Olá! Sou a Sofia, assistente virtual. Como posso te ajudar hoje? 😊',
  mensagem_transbordo TEXT DEFAULT 'Vou acionar um dos nossos especialistas para te ajudar melhor. Um momento!',
  mensagem_fora_horario TEXT DEFAULT 'Nosso atendimento humano está indisponível no momento. Vou registrar seu contato e retornaremos em breve.',
  mensagem_cliente_nao_encontrado TEXT DEFAULT 'Não encontrei seu cadastro. Poderia me informar seu nome completo e telefone para prosseguirmos?',
  max_tentativas INTEGER DEFAULT 3,
  transbordo_palavra_chave BOOLEAN DEFAULT true,
  palavras_urgencia TEXT[] DEFAULT ARRAY['urgente','crítico','parado','fora do ar','emergência','urgência'],
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  dias_semana TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex'],
  acao_fora_horario TEXT DEFAULT 'ticket' CHECK (acao_fora_horario IN ('ticket','mensagem')),
  fontes_conhecimento TEXT[] DEFAULT ARRAY['arquivos'],
  url_conhecimento TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_conhecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('arquivo','url','texto')),
  conteudo TEXT,
  url_fonte TEXT,
  storage_path TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tags TEXT[],
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_regras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('urgencia','tag','categoria')),
  palavras_chave TEXT[] NOT NULL,
  valor TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_mapeamento_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE UNIQUE,
  categoria_padrao TEXT,
  servico_padrao TEXT,
  urgencia_padrao TEXT DEFAULT 'Normal',
  responsavel_bot TEXT DEFAULT 'Atendimento Bot',
  status_resolvido TEXT DEFAULT 'Resolvido',
  status_transbordo TEXT DEFAULT 'Em atendimento',
  prompt_titulo TEXT DEFAULT 'Com base no atendimento abaixo, gere um título objetivo em até 10 palavras para o ticket de suporte:',
  prompt_descricao TEXT DEFAULT 'Formate o histórico abaixo em uma descrição estruturada para o ticket com: problema relatado, dados do cliente, passos realizados e resultado:',
  tags_bot TEXT[] DEFAULT ARRAY['bot'],
  ticket_status_ia_resolve TEXT DEFAULT 'fechado' CHECK (ticket_status_ia_resolve IN ('fechado','aberto')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  conexao_id UUID REFERENCES public.conexoes_whatsapp(id) ON DELETE SET NULL,
  canal TEXT NOT NULL DEFAULT 'whatsapp',
  numero_telefone TEXT,
  nome_cliente TEXT,
  cpf_cnpj TEXT,
  email_cliente TEXT,
  pessoa_movidesk_id TEXT,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','resolvido','transbordado','falha')),
  resolvido_por TEXT DEFAULT 'ia' CHECK (resolvido_por IN ('ia','humano')),
  ticket_movidesk_id TEXT,
  ticket_movidesk_numero INTEGER,
  resumo_ia TEXT,
  tags_identificadas TEXT[],
  urgencia_identificada TEXT,
  categoria_identificada TEXT,
  tentativas_ia INTEGER DEFAULT 0,
  curadoria_status TEXT DEFAULT 'pendente' CHECK (curadoria_status IN ('pendente','ok','ajuste_necessario')),
  curadoria_nota TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerrado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.chatbot_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES public.chatbot_conversas(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL CHECK (remetente IN ('cliente','ia','atendente','sistema')),
  conteudo TEXT NOT NULL,
  metadata JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conexoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_chatbot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_mapeamento_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_mensagens ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'conexoes_whatsapp','configuracoes_chatbot','chatbot_conhecimento',
    'chatbot_faq','chatbot_regras','chatbot_mapeamento_tickets',
    'chatbot_conversas'
  ]) LOOP
    EXECUTE format('CREATE POLICY "org members select" ON public.%I FOR SELECT USING (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members insert" ON public.%I FOR INSERT WITH CHECK (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members update" ON public.%I FOR UPDATE USING (organizacao_id = public.get_user_org(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "org members delete" ON public.%I FOR DELETE USING (organizacao_id = public.get_user_org(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "org members select msgs" ON public.chatbot_mensagens
  FOR SELECT USING (
    conversa_id IN (SELECT id FROM public.chatbot_conversas WHERE organizacao_id = public.get_user_org(auth.uid()))
  );
CREATE POLICY "org members insert msgs" ON public.chatbot_mensagens
  FOR INSERT WITH CHECK (
    conversa_id IN (SELECT id FROM public.chatbot_conversas WHERE organizacao_id = public.get_user_org(auth.uid()))
  );
CREATE POLICY "org members delete msgs" ON public.chatbot_mensagens
  FOR DELETE USING (
    conversa_id IN (SELECT id FROM public.chatbot_conversas WHERE organizacao_id = public.get_user_org(auth.uid()))
  );

-- Bucket de storage para arquivos de conhecimento
INSERT INTO storage.buckets (id, name, public) VALUES ('chatbot-conhecimento', 'chatbot-conhecimento', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org members read knowledge files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chatbot-conhecimento' AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text);

CREATE POLICY "org members upload knowledge files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chatbot-conhecimento' AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text);

CREATE POLICY "org members delete knowledge files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chatbot-conhecimento' AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text);

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

  INSERT INTO public.configuracoes (organizacao_id) VALUES (new_org_id);
  INSERT INTO public.peso_ranking (organizacao_id) VALUES (new_org_id);
  INSERT INTO public.configuracoes_chatbot (organizacao_id) VALUES (new_org_id);
  INSERT INTO public.chatbot_mapeamento_tickets (organizacao_id) VALUES (new_org_id);

  RETURN NEW;
END;
$$;

-- Backfill: garante configuracoes_chatbot e chatbot_mapeamento_tickets para orgs existentes
INSERT INTO public.configuracoes_chatbot (organizacao_id)
SELECT id FROM public.organizacoes
WHERE id NOT IN (SELECT organizacao_id FROM public.configuracoes_chatbot);

INSERT INTO public.chatbot_mapeamento_tickets (organizacao_id)
SELECT id FROM public.organizacoes
WHERE id NOT IN (SELECT organizacao_id FROM public.chatbot_mapeamento_tickets);