-- 006_columns_per_group.sql
-- Colunas deixam de ser compartilhadas por todo o workspace e passam a
-- pertencer a uma matéria (grupo) específica: cada matéria tem seu próprio
-- conjunto de colunas, e excluir uma coluna afeta só aquela matéria. A
-- validação "coluna tem card" também passa a olhar só os cards daquela
-- matéria — cada coluna agora pertence a uma matéria só, então isso já
-- vem de graça.

CREATE TABLE board_columns_new (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_done INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Cada matéria (mesmo já excluída — cards antigos podem apontar pra ela)
-- ganha uma cópia do conjunto de colunas do workspace a que pertencia.
INSERT INTO board_columns_new (id, group_id, name, position, is_done, color, created_at, updated_at)
SELECT lower(hex(randomblob(16))), g.id, bc.name, bc.position, bc.is_done, bc.color, bc.created_at, bc.updated_at
FROM groups g
JOIN board_columns bc ON bc.workspace_id = g.workspace_id;

-- Mapa (coluna antiga, matéria) -> nova coluna, pra reapontar cards e histórico
-- antes que a tabela antiga suma.
CREATE TEMP TABLE _column_migration_map AS
SELECT bc.id AS old_column_id, g.id AS group_id, bcn.id AS new_column_id
FROM board_columns bc
JOIN groups g ON g.workspace_id = bc.workspace_id
JOIN board_columns_new bcn ON bcn.group_id = g.id AND bcn.position = bc.position;

-- board_columns_new assume o nome final já aqui: a FK de cards.column_id
-- resolve por nome de tabela, então a cópia precisa se chamar "board_columns"
-- antes de gravarmos os novos ids em cards.
DROP TABLE board_columns;
ALTER TABLE board_columns_new RENAME TO board_columns;
CREATE INDEX idx_board_columns_group ON board_columns(group_id);

-- Reconstrói `cards` apontando column_id para a cópia da matéria certa
-- (mesmo truque de rebuild da migration 002, dessa vez sem mexer no resto
-- das colunas da tabela).
CREATE TABLE cards_new (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0,
  total_study_seconds INTEGER NOT NULL DEFAULT 0,
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  due_time TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

INSERT INTO cards_new (id, group_id, title, description, column_id, position, total_study_seconds,
    pomodoros_completed, due_date, due_time, created_at, updated_at, deleted_at)
SELECT c.id, c.group_id, c.title, c.description, m.new_column_id, c.position, c.total_study_seconds,
    c.pomodoros_completed, c.due_date, c.due_time, c.created_at, c.updated_at, c.deleted_at
FROM cards c
JOIN _column_migration_map m ON m.old_column_id = c.column_id AND m.group_id = c.group_id;

DROP TABLE cards;
ALTER TABLE cards_new RENAME TO cards;
CREATE INDEX idx_cards_group ON cards(group_id);
CREATE INDEX idx_cards_column ON cards(column_id);
CREATE INDEX idx_cards_due_date ON cards(due_date);

-- status_history.from_status/to_status também guardam id de coluna (ver
-- migration 002) — remapeia usando a matéria do card dono de cada linha.
UPDATE status_history
SET to_status = (
  SELECT m.new_column_id FROM _column_migration_map m
  JOIN cards c ON c.id = status_history.card_id
  WHERE m.old_column_id = status_history.to_status AND m.group_id = c.group_id
)
WHERE to_status IS NOT NULL;

UPDATE status_history
SET from_status = (
  SELECT m.new_column_id FROM _column_migration_map m
  JOIN cards c ON c.id = status_history.card_id
  WHERE m.old_column_id = status_history.from_status AND m.group_id = c.group_id
)
WHERE from_status IS NOT NULL;

DROP TABLE _column_migration_map;
