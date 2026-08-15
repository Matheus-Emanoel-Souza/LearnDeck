-- 001_init.sql
-- Schema inicial do LearnDeck. Ver docs/database.md para a descrição de cada tabela.

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_group_id TEXT REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_groups_workspace ON groups(workspace_id);
CREATE INDEX idx_groups_parent ON groups(parent_group_id);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'to_study', 'studying', 'paused', 'review', 'done')),
  position INTEGER NOT NULL DEFAULT 0,
  total_study_seconds INTEGER NOT NULL DEFAULT 0,
  pomodoros_completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX idx_cards_group ON cards(group_id);
CREATE INDEX idx_cards_status ON cards(status);

CREATE TABLE status_history (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_status_history_card ON status_history(card_id);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_comments_card ON comments(card_id);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE card_tags (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pomodoro'))
);

CREATE INDEX idx_study_sessions_card ON study_sessions(card_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at);

CREATE TABLE pomodoro_configs (
  id TEXT PRIMARY KEY,
  card_id TEXT REFERENCES cards(id) ON DELETE CASCADE,
  focus_minutes INTEGER NOT NULL DEFAULT 25,
  short_break_minutes INTEGER NOT NULL DEFAULT 5,
  long_break_minutes INTEGER NOT NULL DEFAULT 15,
  cycles_before_long_break INTEGER NOT NULL DEFAULT 4
);

CREATE UNIQUE INDEX idx_pomodoro_configs_global ON pomodoro_configs(card_id)
  WHERE card_id IS NULL;

CREATE TABLE pomodoros (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('focus', 'short_break', 'long_break')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  study_session_id TEXT REFERENCES study_sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_pomodoros_card ON pomodoros(card_id);

CREATE TABLE card_relations (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  related_card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN ('prerequisite_of', 'blocks', 'related_to', 'part_of')),
  created_at TEXT NOT NULL,
  UNIQUE (card_id, related_card_id, relation_type)
);

CREATE INDEX idx_card_relations_card ON card_relations(card_id);
CREATE INDEX idx_card_relations_related ON card_relations(related_card_id);

-- Config global de Pomodoro (linha única, card_id = NULL)
INSERT INTO pomodoro_configs (id, card_id, focus_minutes, short_break_minutes, long_break_minutes, cycles_before_long_break)
VALUES (lower(hex(randomblob(16))), NULL, 25, 5, 15, 4);
