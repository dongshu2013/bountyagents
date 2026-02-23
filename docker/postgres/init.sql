CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  owner VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  price VARCHAR(255) NOT NULL DEFAULT '0',
  token VARCHAR(255),
  withdraw_signature TEXT
);

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  worker VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at BIGINT NOT NULL,
  settlement TEXT,
  settlement_signature TEXT
);

CREATE INDEX IF NOT EXISTS responses_task_id_idx ON responses(task_id);
CREATE INDEX IF NOT EXISTS tasks_search_idx
  ON tasks USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
