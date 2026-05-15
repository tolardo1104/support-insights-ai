ALTER TABLE tickets_cache
  ADD CONSTRAINT tickets_cache_org_movidesk_unique
  UNIQUE (organizacao_id, movidesk_ticket_id);

ALTER TABLE atendentes
  ADD CONSTRAINT atendentes_org_movidesk_unique
  UNIQUE (organizacao_id, movidesk_id);
