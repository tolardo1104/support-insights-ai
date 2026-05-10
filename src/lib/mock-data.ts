// Demo/mock data has been removed. Arrays are empty so the UI shows real
// (or empty) state from the database. Typed shapes are kept for compatibility.

export type MockAtendente = {
  id: string; nome: string; equipe: string; email: string;
  tickets: number; tma: number; csat: number; pos: number;
  status: "destaque" | "regular" | "atencao"; score: number;
};
export const mockAtendentes: MockAtendente[] = [];

export const mockMetricasGerais = {
  ticketsAbertos: 0, ticketsResolvidos: 0, tmaMedio: 0,
  csatMedio: 0, resolucaoPrimeiroContato: 0, dentroSLA: 0,
};

export type MockTicketDia = { dia: string; tickets: number };
export const mockTicketsPorDia: MockTicketDia[] = [];

export type MockCsat = { dia: number; csat: number };
export const mockEvolucaoCsat: MockCsat[] = [];

export type MockCategoria = { categoria: string; count: number; variacao: number };
export const mockCategorias: MockCategoria[] = [];

export type MockCliente = {
  id: string; nome: string; tickets: number; categorias: string[];
  atendente: string; tendencia: "up" | "down";
};
export const mockClientes: MockCliente[] = [];

export type MockDimensaoIA = {
  nome: string; nota: number; ponto_forte: string; ponto_melhoria: string;
};
export const mockDimensoesIA: MockDimensaoIA[] = [];

export type MockTicketAnalisado = {
  id: string; assunto: string; categoria: string; status: string;
  trecho: string; comentario: string;
  badge: "Bem resolvido" | "Escalação evitável" | "TMA alto";
};
export const mockTicketsAnalisados: MockTicketAnalisado[] = [];

export const mockAnaliseIaGeral = "";

export type MockMeta = {
  id: string; metrica: "tickets_mes" | "tma_horas" | "csat" | "resolucao_primeiro_contato" | "primeira_resposta";
  label: string; meta: number; atual: number; unidade: string;
};
export const mockMetas: MockMeta[] = [];

export type MockHistoricoAnalise = {
  id: string; data: string; tipo: string; provedor: string; modelo: string;
};
export const mockHistoricoAnalises: MockHistoricoAnalise[] = [];

export type MockSyncLog = { data: string; registros: number; status: string };
export const mockSyncLog: MockSyncLog[] = [];
