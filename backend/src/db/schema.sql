-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_login INTEGER,
  preferences TEXT DEFAULT '{}',
  reputation_score INTEGER DEFAULT 0
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  is_public INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Graphs table (stores ontology data as JSON)
CREATE TABLE IF NOT EXISTS graphs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  archetype TEXT NOT NULL DEFAULT 'general',
  archetype_config TEXT DEFAULT '{}',
  ontology_data TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  is_archived INTEGER DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Graph versions table (for undo/history)
CREATE TABLE IF NOT EXISTS graph_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  graph_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  ontology_data TEXT NOT NULL,
  change_description TEXT,
  created_by INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Clarification sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  graph_id INTEGER,
  clarification_state TEXT NOT NULL DEFAULT '{"messages":[],"extractedEntities":[],"extractedRelationships":[]}',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (graph_id) REFERENCES graphs(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_graphs_project_id ON graphs(project_id);
CREATE INDEX IF NOT EXISTS idx_graphs_user_id ON graphs(user_id);
CREATE INDEX IF NOT EXISTS idx_graphs_created_at ON graphs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_graphs_is_archived ON graphs(is_archived);
CREATE INDEX IF NOT EXISTS idx_graphs_archetype ON graphs(archetype);

CREATE INDEX IF NOT EXISTS idx_graph_versions_graph_id ON graph_versions(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_versions_version ON graph_versions(graph_id, version);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- Note: Demo user removed. Users must register to use the system.
