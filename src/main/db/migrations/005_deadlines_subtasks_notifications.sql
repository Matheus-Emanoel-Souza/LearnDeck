-- 005_deadlines_subtasks_notifications.sql
-- Prazo (opcional) em cards, subtarefas com prazo próprio, e notificações de
-- atraso (deduplicadas por vencimento exato via índice único).

ALTER TABLE cards ADD COLUMN due_date TEXT;
ALTER TABLE cards ADD COLUMN due_time TEXT;

CREATE INDEX idx_cards_due_date ON cards(due_date);

CREATE TABLE subtasks (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  due_time TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_subtasks_card ON subtasks(card_id);
CREATE INDEX idx_subtasks_due_date ON subtasks(due_date);

-- kind: 'card' | 'subtask'. due_at é o vencimento exato (ISO) que gerou o
-- alerta — junto com card_id/subtask_id forma a chave de deduplicação: se o
-- prazo não mudou, escanear de novo nunca insere uma segunda notificação
-- pro mesmo vencimento (ver notificationService.scanForOverdue).
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('card', 'subtask')),
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  due_at TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_notifications_dedupe
  ON notifications(kind, card_id, COALESCE(subtask_id, ''), due_at);

CREATE INDEX idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX idx_notifications_unread ON notifications(workspace_id, is_read);
