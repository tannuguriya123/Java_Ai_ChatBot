-- Enable extensions required by pgvector / Spring AI
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    github_id BIGINT NOT NULL UNIQUE,
    github_username VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    avatar_url VARCHAR(500),
    access_token TEXT NOT NULL,
    token_scopes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    owner VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(300) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(100) NOT NULL,
    language VARCHAR(100),
    html_url VARCHAR(500),
    description TEXT,
    index_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    indexed_at TIMESTAMPTZ,
    chunk_count INT NOT NULL DEFAULT 0,
    files_total INT NOT NULL DEFAULT 0,
    files_processed INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_repositories_user_github UNIQUE (user_id, github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories (user_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    repository_id UUID NOT NULL REFERENCES repositories (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_repo ON chat_sessions (user_id, repository_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    citations TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages (session_id);
