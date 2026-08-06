# DevPilot

DevPilot is a full-stack **RAG (Retrieval-Augmented Generation) codebase assistant**. Connect your GitHub account, sync repositories, index source code into vector embeddings, and chat with your codebase using AI-powered answers with file citations.

## Features

- **GitHub OAuth login** — sign in with GitHub; access tokens stored encrypted
- **Repository sync** — fetch and persist your GitHub repos
- **Async code indexing** — chunk source files, embed with OpenAI, store in pgvector
- **RAG chat** — ask questions about your repo with context-aware answers
- **SSE streaming** — token-by-token responses in the chat UI
- **Citations** — answers link back to relevant source files
- **Dashboard** — overview, repository management, settings

## Architecture

```text
┌─────────────┐     REST + SSE      ┌──────────────────┐     GitHub API
│  Next.js    │ ◄─────────────────► │  Spring Boot     │ ◄──────────────► GitHub
│  (client)   │   session cookie    │  (backend)       │
└─────────────┘                     └────────┬─────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         ▼                   ▼                   ▼
                   PostgreSQL            pgvector             OpenAI
                   (app data)         (embeddings)      (chat + embeddings)
```

### RAG pipeline

1. **Index** — fetch repo files from GitHub → chunk → embed → store in pgvector
2. **Retrieve** — embed the user's question → similarity search for top-K code chunks
3. **Generate** — build prompts with retrieved context → stream OpenAI reply

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16, React 19, TanStack Query, Tailwind CSS 4, shadcn/ui, Streamdown |
| Backend | Spring Boot 4.1, Java 17, Spring Security OAuth2, Spring AI 2.0 |
| Database | PostgreSQL 16 + pgvector (Docker) |
| Migrations | Flyway |
| AI | OpenAI `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings) |

## Prerequisites

- **Java 17+**
- **Node.js 20+**
- **Docker Desktop** (for PostgreSQL)
- **GitHub account** + OAuth App
- **OpenAI API key**

## Project structure

```text
devPilot/
├── backend/          # Spring Boot API
├── client/           # Next.js frontend
├── docker/           # Postgres init scripts
└── docker-compose.yml
```

## Getting started

### 1. Clone and start the database

```bash
git clone <your-repo-url>
cd devPilot
docker compose up -d
```

Postgres runs on **host port `5433`** with database `devpilot`.

Verify:

```bash
docker exec devpilot-postgres psql -U postgres -d devpilot -c "SELECT 1;"
```

### 2. Create a GitHub OAuth App

Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers) and create a new app:

| Field | Value |
|---|---|
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:8080/login/oauth2/code/github` |

Note the **Client ID** and **Client Secret**.

### 3. Configure the backend

Create `backend/src/main/resources/application-local.properties` (this file is gitignored):

```properties
OPENAI_API_KEY=sk-your-openai-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

Or set environment variables instead:

```bash
export OPENAI_API_KEY=sk-your-openai-key
export GITHUB_CLIENT_ID=your-github-client-id
export GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 4. Configure the frontend

```bash
cd client
cp .env.local.example .env.local
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 5. Run the backend

```bash
cd backend
./mvnw spring-boot:run        # Linux / macOS
.\mvnw.cmd spring-boot:run    # Windows
```

Backend starts at **http://localhost:8080**.

### 6. Run the frontend

```bash
cd client
npm install
npm run dev
```

Frontend starts at **http://localhost:3000**.

### 7. Use the app

1. Open **http://localhost:3000**
2. Click **Continue with GitHub**
3. Go to **Dashboard → Repositories**
4. Sync repos, then click **Index** on a repository
5. Wait until status is **READY**
6. Open **Chat** and ask questions about your codebase

## Environment variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5433/devpilot` | Postgres JDBC URL |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `OPENAI_API_KEY` | — | OpenAI API key (required) |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth client secret |
| `FRONTEND_URL` | `http://localhost:3000` | OAuth redirect target |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend API base URL |

## API overview

All `/api/**` routes require authentication (session cookie), except where noted.

### Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/auth/login-url` | GitHub OAuth URL |
| `POST` | `/api/auth/logout` | End session |
| `GET` | `/oauth2/authorization/github` | Start GitHub login |

### Repositories

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/repos?refresh=true` | Sync from GitHub and list repos |
| `GET` | `/api/repos/{id}` | Get one repo |
| `POST` | `/api/repos/{id}/index` | Start indexing (async) |
| `GET` | `/api/repos/{id}/status` | Indexing progress |

### Chat

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/sessions` | Create chat session |
| `GET` | `/api/chat/sessions?repositoryId=` | List sessions |
| `GET` | `/api/chat/sessions/{id}` | Get message history |
| `POST` | `/api/chat/sessions/{id}/messages` | Send message (SSE stream) |

## Development

### Backend

```bash
cd backend
./mvnw test
./mvnw compile
```

- Schema migrations live in `backend/src/main/resources/db/migration/`
- JPA uses `ddl-auto=validate` — Flyway owns the schema
- Vector store table is auto-created by Spring AI pgvector

### Frontend

```bash
cd client
npm run lint
npm run build
```

### Common issues

**`Unable to determine Dialect` / HikariCP connection error**

Postgres is not running. Start it first:

```bash
docker compose up -d
```

**OAuth redirect fails**

Ensure the GitHub OAuth callback URL is exactly:

```text
http://localhost:8080/login/oauth2/code/github
```

**Chat returns "Repository must be indexed"**

Wait for indexing to finish (`indexStatus: READY`) before creating a chat session.

## Security notes

- Never commit `.env`, `application-local.properties`, or API keys
- GitHub access tokens are encrypted at rest before saving to the database
- Session cookies are HttpOnly; CSRF is disabled for the SPA + cookie session pattern
- Use strong values for `TOKEN_ENCRYPTOR_PASSWORD` and `TOKEN_ENCRYPTOR_SALT` in production

## License

This project is for educational purposes.
