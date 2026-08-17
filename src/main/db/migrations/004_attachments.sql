-- 004_attachments.sql
-- Arquivos anexados a um card. O arquivo em si é copiado pra
-- %APPDATA%/LearnDeck/attachments/<card_id>/<uuid>-<nome> (stored_path);
-- essa tabela só guarda os metadados.

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_attachments_card ON attachments(card_id);
