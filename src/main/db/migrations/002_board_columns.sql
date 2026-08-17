-- 002_board_columns.sql
-- Colunas do quadro deixam de ser um enum fixo (backlog/to_study/...) e passam
-- a ser dados: tabela board_columns por workspace, com nome, posição e uma
-- flag is_done (marca a(s) coluna(s) que contam como "concluído" no dashboard).
-- cards.status (enum fixo com CHECK) vira cards.column_id (FK livre).

CREATE TABLE board_columns (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_board_columns_workspace ON board_columns(workspace_id);

-- Semeia, para cada workspace já existente, as 6 colunas fixas antigas
-- (mesmos nomes/ordem que CARD_STATUS_LABELS), preservando o que o usuário já via.
INSERT INTO board_columns (id, workspace_id, name, position, is_done, created_at, updated_at)
SELECT lower(hex(randomblob(16))), w.id, s.name, s.pos, s.is_done, datetime('now'), datetime('now')
FROM workspaces w
CROSS JOIN (
  SELECT 'backlog' AS key, 'Backlog' AS name, 0 AS pos, 0 AS is_done
  UNION ALL SELECT 'to_study', 'A estudar', 1, 0
  UNION ALL SELECT 'studying', 'Estudando', 2, 0
  UNION ALL SELECT 'paused', 'Pausado', 3, 0
  UNION ALL SELECT 'review', 'Revisar', 4, 0
  UNION ALL SELECT 'done', 'Concluído', 5, 1
) s;

-- Tabela auxiliar só para o backfill abaixo resolver status antigo -> id da nova coluna.
CREATE TEMP TABLE _status_key_map AS
SELECT c.id AS card_id, c.status AS status_key, bc.id AS column_id
FROM cards c
JOIN groups g ON g.id = c.group_id
JOIN board_columns bc ON bc.workspace_id = g.workspace_id
WHERE bc.position = CASE c.status
  WHEN 'backlog' THEN 0
  WHEN 'to_study' THEN 1
  WHEN 'studying' THEN 2
  WHEN 'paused' THEN 3
  WHEN 'review' THEN 4
  WHEN 'done' THEN 5
END;

-- Reconstrói cards sem o CHECK de status (SQLite não permite dropar CHECK direto).
CREATE TABLE cards_new (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0,
  total_study_seconds INTEGER NOT NULL DEFAULT 0,
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

INSERT INTO cards_new (id, group_id, title, description, column_id, position, total_study_seconds,
    pomodoros_completed, created_at, updated_at, deleted_at)
SELECT c.id, c.group_id, c.title, c.description, m.column_id, c.position, c.total_study_seconds,
    c.pomodoros_completed, c.created_at, c.updated_at, c.deleted_at
FROM cards c
JOIN _status_key_map m ON m.card_id = c.id;

DROP TABLE cards;
ALTER TABLE cards_new RENAME TO cards;
DROP TABLE _status_key_map;

CREATE INDEX idx_cards_group ON cards(group_id);
CREATE INDEX idx_cards_column ON cards(column_id);

-- status_history.from_status/to_status guardavam o enum; a partir de agora
-- guardam o id da coluna (texto livre, sem CHECK — nenhuma mudança de schema
-- necessária ali). Reescreve as linhas existentes para os novos ids.
CREATE TEMP TABLE _history_key_map AS
SELECT sh.id AS history_id, sh.from_status AS old_from, sh.to_status AS old_to, g.workspace_id AS workspace_id
FROM status_history sh
JOIN cards c ON c.id = sh.card_id
JOIN groups g ON g.id = c.group_id;

UPDATE status_history
SET to_status = (
  SELECT bc.id FROM board_columns bc
  JOIN _history_key_map m ON m.workspace_id = bc.workspace_id
  WHERE m.history_id = status_history.id
    AND bc.position = CASE m.old_to
      WHEN 'backlog' THEN 0 WHEN 'to_study' THEN 1 WHEN 'studying' THEN 2
      WHEN 'paused' THEN 3 WHEN 'review' THEN 4 WHEN 'done' THEN 5
    END
)
WHERE id IN (SELECT history_id FROM _history_key_map);

UPDATE status_history
SET from_status = (
  SELECT bc.id FROM board_columns bc
  JOIN _history_key_map m ON m.workspace_id = bc.workspace_id
  WHERE m.history_id = status_history.id
    AND bc.position = CASE m.old_from
      WHEN 'backlog' THEN 0 WHEN 'to_study' THEN 1 WHEN 'studying' THEN 2
      WHEN 'paused' THEN 3 WHEN 'review' THEN 4 WHEN 'done' THEN 5
    END
)
WHERE id IN (SELECT history_id FROM _history_key_map) AND from_status IS NOT NULL;

DROP TABLE _history_key_map;
