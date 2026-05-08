// Mock realistic data used when no API key is configured (demo mode)

export const mockAtendentes = [
  { id: "a1", nome: "Ana Beatriz Silva", equipe: "Suporte N1", email: "ana.silva@empresa.com", tickets: 142, tma: 2.1, csat: 96, pos: 1, status: "destaque" as const, score: 94 },
  { id: "a2", nome: "Carlos Eduardo Mendes", equipe: "Suporte N2", email: "carlos.mendes@empresa.com", tickets: 128, tma: 2.8, csat: 92, pos: 2, status: "destaque" as const, score: 89 },
  { id: "a3", nome: "Juliana Ferreira", equipe: "Suporte N1", email: "juliana.f@empresa.com", tickets: 119, tma: 3.2, csat: 89, pos: 3, status: "regular" as const, score: 84 },
  { id: "a4", nome: "Rafael Santos", equipe: "Suporte N2", email: "rafael.s@empresa.com", tickets: 110, tma: 3.7, csat: 87, pos: 4, status: "regular" as const, score: 79 },
  { id: "a5", nome: "Mariana Costa", equipe: "Suporte N1", email: "mariana.c@empresa.com", tickets: 98, tma: 4.1, csat: 84, pos: 5, status: "regular" as const, score: 74 },
  { id: "a6", nome: "Pedro Henrique Alves", equipe: "Suporte N2", email: "pedro.a@empresa.com", tickets: 85, tma: 5.4, csat: 76, pos: 6, status: "atencao" as const, score: 62 },
  { id: "a7", nome: "Larissa Oliveira", equipe: "Suporte N1", email: "larissa.o@empresa.com", tickets: 72, tma: 6.1, csat: 71, pos: 7, status: "atencao" as const, score: 55 },
];

export const mockMetricasGerais = {
  ticketsAbertos: 184,
  ticketsResolvidos: 754,
  tmaMedio: 3.4,
  csatMedio: 87,
  resolucaoPrimeiroContato: 68,
  dentroSLA: 91,
};

export const mockTicketsPorDia = [
  { dia: "Seg", tickets: 124 },
  { dia: "Ter", tickets: 142 },
  { dia: "Qua", tickets: 138 },
  { dia: "Qui", tickets: 165 },
  { dia: "Sex", tickets: 178 },
  { dia: "Sáb", tickets: 84 },
  { dia: "Dom", tickets: 51 },
];

export const mockEvolucaoCsat = Array.from({ length: 30 }, (_, i) => ({
  dia: i + 1,
  csat: Math.round(82 + Math.sin(i / 4) * 5 + Math.random() * 4),
}));

export const mockCategorias = [
  { categoria: "Login / Acesso", count: 187, variacao: 12 },
  { categoria: "Pagamento", count: 142, variacao: -8 },
  { categoria: "Integração API", count: 98, variacao: 4 },
  { categoria: "Bug Plataforma", count: 87, variacao: 21 },
  { categoria: "Dúvida de uso", count: 72, variacao: -3 },
  { categoria: "Importação", count: 64, variacao: 18 },
  { categoria: "Relatórios", count: 41, variacao: -12 },
  { categoria: "Outros", count: 35, variacao: 2 },
];

export const mockClientes = [
  { id: "c1", nome: "TechCorp Ltda", tickets: 28, categorias: ["Bug", "Integração"], atendente: "Carlos Mendes", tendencia: "up" as const },
  { id: "c2", nome: "Acme Industries", tickets: 22, categorias: ["Pagamento", "Login"], atendente: "Ana Silva", tendencia: "up" as const },
  { id: "c3", nome: "Globex SA", tickets: 19, categorias: ["Integração"], atendente: "Rafael Santos", tendencia: "down" as const },
  { id: "c4", nome: "Initech", tickets: 17, categorias: ["Importação", "Dúvida"], atendente: "Juliana Ferreira", tendencia: "up" as const },
  { id: "c5", nome: "Umbrella Co", tickets: 14, categorias: ["Bug"], atendente: "Mariana Costa", tendencia: "down" as const },
  { id: "c6", nome: "Hooli Inc", tickets: 12, categorias: ["Login"], atendente: "Ana Silva", tendencia: "up" as const },
];

export const mockDimensoesIA = [
  { nome: "Escuta ativa", nota: 8.4, ponto_forte: "Reformula a dúvida do cliente confirmando entendimento.", ponto_melhoria: "Em casos urgentes, pula direto para a solução." },
  { nome: "Clareza", nota: 9.1, ponto_forte: "Respostas curtas, em passos numerados.", ponto_melhoria: "Pode incluir links de FAQ com mais frequência." },
  { nome: "Conhecimento técnico", nota: 7.8, ponto_forte: "Domina a maioria dos fluxos de pagamento.", ponto_melhoria: "Integrações via API ainda exigem escalação." },
  { nome: "Empatia / tom", nota: 9.0, ponto_forte: "Linguagem acolhedora mesmo em casos críticos.", ponto_melhoria: "Evitar tratamentos formais demais com clientes recorrentes." },
  { nome: "Agilidade", nota: 8.2, ponto_forte: "Resolve a maioria em até 3 trocas.", ponto_melhoria: "TMA aumenta em chamados fora do horário comercial." },
  { nome: "Seguimento", nota: 7.5, ponto_forte: "Confirma resolução antes de fechar.", ponto_melhoria: "Falta follow-up em casos com solução de contorno." },
];

export const mockTicketsAnalisados = [
  { id: "T-1042", assunto: "Erro ao processar pagamento", categoria: "Pagamento", status: "Resolvido", trecho: "Cliente relatou que o cartão foi recusado mesmo com saldo...", comentario: "Excelente diagnóstico. Identificou problema de gateway em 2 mensagens.", badge: "Bem resolvido" as const },
  { id: "T-1039", assunto: "API retornando 500", categoria: "Integração", status: "Escalado", trecho: "Endpoint /v1/orders está falhando intermitentemente...", comentario: "Escalação poderia ter sido evitada — bastava reiniciar a sessão do token.", badge: "Escalação evitável" as const },
  { id: "T-1031", assunto: "Não consigo logar", categoria: "Login", status: "Resolvido", trecho: "Tenho certeza que a senha está correta mas o sistema...", comentario: "Solução correta mas TMA acima da meta (8h). Faltou priorização.", badge: "TMA alto" as const },
  { id: "T-1024", assunto: "Importação travada", categoria: "Importação", status: "Resolvido", trecho: "Subi um CSV de 12k linhas e não terminou em 1h...", comentario: "Ótima comunicação durante a espera. Cliente saiu satisfeito.", badge: "Bem resolvido" as const },
];

export const mockAnaliseIaGeral = `**Visão geral do período**
A operação processou 938 tickets nas últimas 4 semanas, mantendo CSAT médio de 87% — estável vs período anterior. O TMA médio caiu de 3.9h para 3.4h, indicando melhora consistente após ajuste de escala.

**Pontos críticos identificados**
1. Categoria "Bug Plataforma" cresceu 21% — sugere regressão recente em produção.
2. Pico de chamados às quintas e sextas indica necessidade de reforço de equipe nesses dias.
3. 12% dos chamados de "Integração API" precisaram escalar para N3 — gap de conhecimento técnico.

**Atendentes que precisam de atenção**
- **Larissa Oliveira** e **Pedro Alves** estão com CSAT abaixo de 80% e TMA acima de 5h.
- Recomenda-se sessão de coaching focada em diagnóstico inicial.

**Clientes em risco**
- TechCorp Ltda (28 tickets, +60% vs mês anterior) — alto risco de churn.
- Acme Industries com problemas recorrentes em pagamento.

**Oportunidades de melhoria**
- Criar artigo de FAQ sobre erros 500 da API (47 chamados no mês).
- Automatizar reset de senha — 23% dos chamados de Login.
- Treinamento técnico em integrações para a equipe N1.

**Sugestões de self-service**
- "Como resolver erro 500 ao chamar /orders"
- "Guia de troubleshooting de pagamentos recusados"
- "Importação de CSV: limites e boas práticas"`;

export const mockMetas = [
  { id: "m1", metrica: "tickets_mes" as const, label: "Tickets resolvidos / mês", meta: 800, atual: 754, unidade: "" },
  { id: "m2", metrica: "tma_horas" as const, label: "TMA máximo (horas)", meta: 4, atual: 3.4, unidade: "h" },
  { id: "m3", metrica: "csat" as const, label: "CSAT mínimo", meta: 90, atual: 87, unidade: "%" },
  { id: "m4", metrica: "resolucao_primeiro_contato" as const, label: "Resolução 1º contato", meta: 75, atual: 68, unidade: "%" },
  { id: "m5", metrica: "primeira_resposta" as const, label: "Tempo 1ª resposta máx", meta: 1, atual: 0.8, unidade: "h" },
];

export const mockHistoricoAnalises = [
  { id: "h1", data: "2026-05-07", tipo: "geral", provedor: "gemini", modelo: "gemini-2.0-flash" },
  { id: "h2", data: "2026-05-01", tipo: "atendente", provedor: "claude", modelo: "claude-sonnet-4" },
  { id: "h3", data: "2026-04-23", tipo: "geral", provedor: "openai", modelo: "gpt-4o" },
];

export const mockSyncLog = [
  { data: "2026-05-08 14:22", registros: 184, status: "ok" },
  { data: "2026-05-08 13:22", registros: 142, status: "ok" },
  { data: "2026-05-08 12:22", registros: 167, status: "ok" },
  { data: "2026-05-08 11:22", registros: 0, status: "erro" },
];
