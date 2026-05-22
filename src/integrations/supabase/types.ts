export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analises_ia: {
        Row: {
          atendente_id: string | null
          criado_em: string
          ia_modelo: string | null
          ia_provedor: string | null
          id: string
          organizacao_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          resultado: Json
          tipo: string
        }
        Insert: {
          atendente_id?: string | null
          criado_em?: string
          ia_modelo?: string | null
          ia_provedor?: string | null
          id?: string
          organizacao_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          resultado: Json
          tipo: string
        }
        Update: {
          atendente_id?: string | null
          criado_em?: string
          ia_modelo?: string | null
          ia_provedor?: string | null
          id?: string
          organizacao_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          resultado?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_ia_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_ia_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      atendentes: {
        Row: {
          ativo: boolean | null
          criado_em: string
          email: string | null
          equipe: string | null
          id: string
          movidesk_id: string | null
          nome: string
          organizacao_id: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string
          email?: string | null
          equipe?: string | null
          id?: string
          movidesk_id?: string | null
          nome: string
          organizacao_id: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string
          email?: string | null
          equipe?: string | null
          id?: string
          movidesk_id?: string | null
          nome?: string
          organizacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendentes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conhecimento: {
        Row: {
          ativo: boolean | null
          conteudo: string | null
          criado_em: string
          id: string
          nome: string
          organizacao_id: string
          storage_path: string | null
          tipo: string
          url_fonte: string | null
        }
        Insert: {
          ativo?: boolean | null
          conteudo?: string | null
          criado_em?: string
          id?: string
          nome: string
          organizacao_id: string
          storage_path?: string | null
          tipo: string
          url_fonte?: string | null
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string | null
          criado_em?: string
          id?: string
          nome?: string
          organizacao_id?: string
          storage_path?: string | null
          tipo?: string
          url_fonte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conhecimento_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversas: {
        Row: {
          canal: string
          categoria_identificada: string | null
          conexao_id: string | null
          cpf_cnpj: string | null
          criado_em: string
          curadoria_nota: string | null
          curadoria_status: string | null
          email_cliente: string | null
          encerrado_em: string | null
          id: string
          nome_cliente: string | null
          numero_telefone: string | null
          organizacao_id: string
          pessoa_movidesk_id: string | null
          resolvido_por: string | null
          resumo_ia: string | null
          status: string | null
          tags_identificadas: string[] | null
          tentativas_ia: number | null
          ticket_movidesk_id: string | null
          ticket_movidesk_numero: number | null
          urgencia_identificada: string | null
        }
        Insert: {
          canal?: string
          categoria_identificada?: string | null
          conexao_id?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          curadoria_nota?: string | null
          curadoria_status?: string | null
          email_cliente?: string | null
          encerrado_em?: string | null
          id?: string
          nome_cliente?: string | null
          numero_telefone?: string | null
          organizacao_id: string
          pessoa_movidesk_id?: string | null
          resolvido_por?: string | null
          resumo_ia?: string | null
          status?: string | null
          tags_identificadas?: string[] | null
          tentativas_ia?: number | null
          ticket_movidesk_id?: string | null
          ticket_movidesk_numero?: number | null
          urgencia_identificada?: string | null
        }
        Update: {
          canal?: string
          categoria_identificada?: string | null
          conexao_id?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          curadoria_nota?: string | null
          curadoria_status?: string | null
          email_cliente?: string | null
          encerrado_em?: string | null
          id?: string
          nome_cliente?: string | null
          numero_telefone?: string | null
          organizacao_id?: string
          pessoa_movidesk_id?: string | null
          resolvido_por?: string | null
          resumo_ia?: string | null
          status?: string | null
          tags_identificadas?: string[] | null
          tentativas_ia?: number | null
          ticket_movidesk_id?: string | null
          ticket_movidesk_numero?: number | null
          urgencia_identificada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversas_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_faq: {
        Row: {
          ativo: boolean | null
          criado_em: string
          id: string
          ordem: number | null
          organizacao_id: string
          pergunta: string
          resposta: string
          tags: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string
          id?: string
          ordem?: number | null
          organizacao_id: string
          pergunta: string
          resposta: string
          tags?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string
          id?: string
          ordem?: number | null
          organizacao_id?: string
          pergunta?: string
          resposta?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_faq_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_mapeamento_tickets: {
        Row: {
          atualizado_em: string
          categoria_padrao: string | null
          criado_em: string
          id: string
          organizacao_id: string
          prompt_descricao: string | null
          prompt_titulo: string | null
          responsavel_bot: string | null
          servico_padrao: string | null
          status_resolvido: string | null
          status_transbordo: string | null
          tags_bot: string[] | null
          ticket_status_ia_resolve: string | null
          urgencia_padrao: string | null
        }
        Insert: {
          atualizado_em?: string
          categoria_padrao?: string | null
          criado_em?: string
          id?: string
          organizacao_id: string
          prompt_descricao?: string | null
          prompt_titulo?: string | null
          responsavel_bot?: string | null
          servico_padrao?: string | null
          status_resolvido?: string | null
          status_transbordo?: string | null
          tags_bot?: string[] | null
          ticket_status_ia_resolve?: string | null
          urgencia_padrao?: string | null
        }
        Update: {
          atualizado_em?: string
          categoria_padrao?: string | null
          criado_em?: string
          id?: string
          organizacao_id?: string
          prompt_descricao?: string | null
          prompt_titulo?: string | null
          responsavel_bot?: string | null
          servico_padrao?: string | null
          status_resolvido?: string | null
          status_transbordo?: string | null
          tags_bot?: string[] | null
          ticket_status_ia_resolve?: string | null
          urgencia_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_mapeamento_tickets_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          criado_em: string
          id: string
          metadata: Json | null
          remetente: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          criado_em?: string
          id?: string
          metadata?: Json | null
          remetente: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          criado_em?: string
          id?: string
          metadata?: Json | null
          remetente?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_regras: {
        Row: {
          ativo: boolean | null
          criado_em: string
          id: string
          organizacao_id: string
          palavras_chave: string[]
          tipo: string
          valor: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string
          id?: string
          organizacao_id: string
          palavras_chave: string[]
          tipo: string
          valor: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string
          id?: string
          organizacao_id?: string
          palavras_chave?: string[]
          tipo?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_regras_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_whatsapp: {
        Row: {
          api_key_provedor: string | null
          ativo: boolean | null
          atualizado_em: string
          criado_em: string
          id: string
          instance_name: string | null
          nome: string
          numero_telefone: string | null
          organizacao_id: string
          provedor: string
          qr_code_base64: string | null
          status: string | null
          url_servidor: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_provedor?: string | null
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          id?: string
          instance_name?: string | null
          nome: string
          numero_telefone?: string | null
          organizacao_id: string
          provedor: string
          qr_code_base64?: string | null
          status?: string | null
          url_servidor?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_provedor?: string | null
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          id?: string
          instance_name?: string | null
          nome?: string
          numero_telefone?: string | null
          organizacao_id?: string
          provedor?: string
          qr_code_base64?: string | null
          status?: string | null
          url_servidor?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_whatsapp_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string
          criado_em: string
          ia_analise_automatica: string | null
          ia_api_key: string | null
          ia_idioma: string | null
          ia_modelo: string | null
          ia_prompt_analise_atendente: string | null
          ia_prompt_analise_geral: string | null
          ia_provedor: string | null
          ia_tickets_analisados: number | null
          id: string
          movidesk_api_key: string | null
          organizacao_id: string
          sync_intervalo_minutos: number | null
          sync_periodo_fim: string | null
          sync_periodo_inicio: string | null
          sync_total_importado: number | null
          sync_ultimo_em: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          ia_analise_automatica?: string | null
          ia_api_key?: string | null
          ia_idioma?: string | null
          ia_modelo?: string | null
          ia_prompt_analise_atendente?: string | null
          ia_prompt_analise_geral?: string | null
          ia_provedor?: string | null
          ia_tickets_analisados?: number | null
          id?: string
          movidesk_api_key?: string | null
          organizacao_id: string
          sync_intervalo_minutos?: number | null
          sync_periodo_fim?: string | null
          sync_periodo_inicio?: string | null
          sync_total_importado?: number | null
          sync_ultimo_em?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          ia_analise_automatica?: string | null
          ia_api_key?: string | null
          ia_idioma?: string | null
          ia_modelo?: string | null
          ia_prompt_analise_atendente?: string | null
          ia_prompt_analise_geral?: string | null
          ia_provedor?: string | null
          ia_tickets_analisados?: number | null
          id?: string
          movidesk_api_key?: string | null
          organizacao_id?: string
          sync_intervalo_minutos?: number | null
          sync_periodo_fim?: string | null
          sync_periodo_inicio?: string | null
          sync_total_importado?: number | null
          sync_ultimo_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_chatbot: {
        Row: {
          acao_fora_horario: string | null
          ativo: boolean | null
          atualizado_em: string
          criado_em: string
          dias_semana: string[] | null
          fontes_conhecimento: string[] | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          max_tentativas: number | null
          mensagem_boas_vindas: string | null
          mensagem_cliente_nao_encontrado: string | null
          mensagem_fora_horario: string | null
          mensagem_transbordo: string | null
          nome_assistente: string | null
          organizacao_id: string
          palavras_urgencia: string[] | null
          prompt_sistema: string | null
          transbordo_palavra_chave: boolean | null
          url_conhecimento: string | null
        }
        Insert: {
          acao_fora_horario?: string | null
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          dias_semana?: string[] | null
          fontes_conhecimento?: string[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          max_tentativas?: number | null
          mensagem_boas_vindas?: string | null
          mensagem_cliente_nao_encontrado?: string | null
          mensagem_fora_horario?: string | null
          mensagem_transbordo?: string | null
          nome_assistente?: string | null
          organizacao_id: string
          palavras_urgencia?: string[] | null
          prompt_sistema?: string | null
          transbordo_palavra_chave?: boolean | null
          url_conhecimento?: string | null
        }
        Update: {
          acao_fora_horario?: string | null
          ativo?: boolean | null
          atualizado_em?: string
          criado_em?: string
          dias_semana?: string[] | null
          fontes_conhecimento?: string[] | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          max_tentativas?: number | null
          mensagem_boas_vindas?: string | null
          mensagem_cliente_nao_encontrado?: string | null
          mensagem_fora_horario?: string | null
          mensagem_transbordo?: string | null
          nome_assistente?: string | null
          organizacao_id?: string
          palavras_urgencia?: string[] | null
          prompt_sistema?: string | null
          transbordo_palavra_chave?: boolean | null
          url_conhecimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_chatbot_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          atendente_id: string | null
          ativo: boolean | null
          criado_em: string
          id: string
          metrica: string
          organizacao_id: string
          periodo: string
          valor_meta: number
        }
        Insert: {
          atendente_id?: string | null
          ativo?: boolean | null
          criado_em?: string
          id?: string
          metrica: string
          organizacao_id: string
          periodo?: string
          valor_meta: number
        }
        Update: {
          atendente_id?: string | null
          ativo?: boolean | null
          criado_em?: string
          id?: string
          metrica?: string
          organizacao_id?: string
          periodo?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          criado_em: string
          id: string
          nome: string
          plano: string
          slug: string
        }
        Insert: {
          criado_em?: string
          id?: string
          nome: string
          plano?: string
          slug: string
        }
        Update: {
          criado_em?: string
          id?: string
          nome?: string
          plano?: string
          slug?: string
        }
        Relationships: []
      }
      peso_ranking: {
        Row: {
          atualizado_em: string
          id: string
          organizacao_id: string
          peso_csat: number | null
          peso_metas: number | null
          peso_score_ia: number | null
          peso_tma: number | null
          peso_volume: number | null
        }
        Insert: {
          atualizado_em?: string
          id?: string
          organizacao_id: string
          peso_csat?: number | null
          peso_metas?: number | null
          peso_score_ia?: number | null
          peso_tma?: number | null
          peso_volume?: number | null
        }
        Update: {
          atualizado_em?: string
          id?: string
          organizacao_id?: string
          peso_csat?: number | null
          peso_metas?: number | null
          peso_score_ia?: number | null
          peso_tma?: number | null
          peso_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "peso_ranking_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: true
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          nome: string | null
          organizacao_id: string | null
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id: string
          nome?: string | null
          organizacao_id?: string | null
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
          organizacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_scores: {
        Row: {
          atendente_id: string
          calculado_em: string
          id: string
          organizacao_id: string
          periodo_mes: string
          posicao: number | null
          score_csat: number | null
          score_ia: number | null
          score_metas: number | null
          score_tma: number | null
          score_total: number | null
          score_volume: number | null
        }
        Insert: {
          atendente_id: string
          calculado_em?: string
          id?: string
          organizacao_id: string
          periodo_mes: string
          posicao?: number | null
          score_csat?: number | null
          score_ia?: number | null
          score_metas?: number | null
          score_tma?: number | null
          score_total?: number | null
          score_volume?: number | null
        }
        Update: {
          atendente_id?: string
          calculado_em?: string
          id?: string
          organizacao_id?: string
          periodo_mes?: string
          posicao?: number | null
          score_csat?: number | null
          score_ia?: number | null
          score_metas?: number | null
          score_tma?: number | null
          score_total?: number | null
          score_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_scores_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_scores_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_log: {
        Row: {
          executado_em: string
          id: string
          mensagem_erro: string | null
          organizacao_id: string
          periodo_fim: string | null
          periodo_inicio: string | null
          status: string
          total_importado: number | null
        }
        Insert: {
          executado_em?: string
          id?: string
          mensagem_erro?: string | null
          organizacao_id: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          status: string
          total_importado?: number | null
        }
        Update: {
          executado_em?: string
          id?: string
          mensagem_erro?: string | null
          organizacao_id?: string
          periodo_fim?: string | null
          periodo_inicio?: string | null
          status?: string
          total_importado?: number | null
        }
        Relationships: []
      }
      tickets_cache: {
        Row: {
          abandonado: boolean | null
          assunto: string | null
          atendente_id: string | null
          atualizado_em: string | null
          categoria: string | null
          cliente_id: string | null
          cliente_nome: string | null
          criado_em: string | null
          csat_nota: number | null
          frt_minutos: number | null
          id: string
          mensagens: Json | null
          movidesk_ticket_id: string | null
          nps_nota: number | null
          organizacao_id: string
          prioridade: string | null
          reaberto: boolean | null
          reaberto_em: string | null
          resolvido_em: string | null
          sincronizado_em: string
          status: string | null
          tma_minutos: number | null
          tme_minutos: number | null
        }
        Insert: {
          abandonado?: boolean | null
          assunto?: string | null
          atendente_id?: string | null
          atualizado_em?: string | null
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          criado_em?: string | null
          csat_nota?: number | null
          frt_minutos?: number | null
          id?: string
          mensagens?: Json | null
          movidesk_ticket_id?: string | null
          nps_nota?: number | null
          organizacao_id: string
          prioridade?: string | null
          reaberto?: boolean | null
          reaberto_em?: string | null
          resolvido_em?: string | null
          sincronizado_em?: string
          status?: string | null
          tma_minutos?: number | null
          tme_minutos?: number | null
        }
        Update: {
          abandonado?: boolean | null
          assunto?: string | null
          atendente_id?: string | null
          atualizado_em?: string | null
          categoria?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          criado_em?: string | null
          csat_nota?: number | null
          frt_minutos?: number | null
          id?: string
          mensagens?: Json | null
          movidesk_ticket_id?: string | null
          nps_nota?: number | null
          organizacao_id?: string
          prioridade?: string | null
          reaberto?: boolean | null
          reaberto_em?: string | null
          resolvido_em?: string | null
          sincronizado_em?: string
          status?: string | null
          tma_minutos?: number | null
          tme_minutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cache_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "atendentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cache_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
