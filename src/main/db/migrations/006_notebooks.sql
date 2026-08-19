-- 006_notebooks.sql
-- Caderno do card: documentação técnica em Markdown, um caderno por card
-- (1:1, criado sob demanda no primeiro save). `version` sobe a cada save e
-- serve de trava otimista (evita sobrescrever silenciosamente uma edição
-- concorrente da mesma tela aberta em duas janelas). `notebook_versions`
-- guarda um snapshot por save, para o histórico/restauração.

CREATE TABLE notebooks (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
  content_markdown TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE notebook_versions (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content_markdown TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_notebook_versions_notebook ON notebook_versions(notebook_id, version DESC);
