# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Human-in-the-Loop Knowledge Graph System - transforms natural language ideas into interactive knowledge graphs through conversational AI clarification and visual editing.

**Status**: Phase 1 complete, Phase 2 in progress. Core features working: Express API, SQLite persistence, Claude API streaming, React Flow canvas with CRUD, clarification dialog, undo/redo, multiple layout algorithms.

## Development Commands

### Quick Start
```bash
# Install all workspaces (root, shared, backend, frontend)
npm install

# Run backend (port 3000) + frontend (port 5173) concurrently
npm run dev

# Build everything (shared → backend → frontend)
npm run build
```

### Backend (`backend/`)
```bash
npm run dev          # Start with nodemon + tsx (auto-reload)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled version
npm run db:init      # Initialize SQLite database schema
npm test             # Run vitest tests
npm test:watch       # Watch mode
npm run lint         # ESLint
```

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server
npm run build        # TypeScript check + Vite build
npm run preview      # Serve production build locally
npm run lint         # ESLint
```

### Testing
```bash
npm test                   # Run all workspace tests
npm run test:integration   # Integration tests (vitest)
npm run test:e2e          # Playwright E2E tests
```

## Architecture

### Monorepo Structure
```
/shared              # Shared TypeScript types (@kgs/shared)
/backend             # Express API + Socket.io + SQLite
/frontend            # React + Vite + React Flow + Zustand
```

### Key Data Flow
1. User input → Clarification dialog (Claude API streaming via SSE)
2. Finalized conversation → NLP pipeline extracts entities/relations
3. Ontology JSON → React Flow nodes/edges → Interactive canvas
4. User edits → WebSocket sync → SQLite persistence with version history

### Two-Protocol Real-time Strategy
- **WebSocket (Socket.io)**: Bidirectional for graph edits, presence, collaborative updates
- **SSE**: Unidirectional streaming for Claude API responses during clarification

### Backend Services (`backend/src/services/`)
- `ClaudeService.ts` - Anthropic API integration with streaming
- `GraphService.ts` - Graph CRUD and version management
- `ClarificationService.ts` - Dialog session management
- `nlp/OntologyBuilder.ts` - Text → structured ontology conversion
- `nlp/EntityExtractor.ts`, `RelationExtractor.ts` - NLP extraction

### Frontend State (`frontend/src/store/`)
- `GraphContext.tsx` - Graph state, undo/redo stack, CRUD operations
- `UIContext.tsx` - Selection state, panel visibility, archetype config

### Graph Archetypes (6 types)
- `general`, `knowledge-mining`, `explanation`, `goal-achievement`, `decision`, `prediction`
- Each has specialized node/edge types and layout algorithms

## Environment Setup

Copy `backend/.env.example` to `backend/.env`:
```
PORT=3000
SQLITE_DB_PATH=./data/kgs.db
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
FRONTEND_URL=http://localhost:5173
```

Initialize database before first run:
```bash
cd backend && npm run db:init
```

## API Endpoints

**Graphs**: `GET|POST /api/graphs`, `GET|PUT|DELETE /api/graphs/:id`, `GET /api/graphs/:id/versions`

**Clarification**: `POST /api/clarify/start`, `POST /api/clarify/message` (streams SSE), `POST /api/clarify/finalize`

**Ontology**: `POST /api/ontology/convert`, `POST /api/ontology/causal-chains`

**Projects**: `GET|POST /api/projects`, `PUT|DELETE /api/projects/:id`

**Chat**: `POST /api/chat`, `GET /api/chat/stream`, `GET /api/chat/history/:graphId`

## Key Files

**Backend entry**: `backend/src/index.ts` → `server.ts` (Express + Socket.io setup)

**Claude config**: `backend/src/config/claude.ts` (system prompts, model settings)

**Database**: `backend/src/config/database.ts`, `backend/src/db/schema.sql`

**Graph canvas**: `frontend/src/components/graph/GraphCanvas.tsx`

**Main state**: `frontend/src/store/GraphContext.tsx` (521 lines, central graph logic)

**API client**: `frontend/src/services/api.ts`

## Docker

```bash
docker build -t kgs .
docker-compose up    # Uses ANTHROPIC_API_KEY from environment
```

## Notes

- `Claude.md` (capital C) is the full app specification document
- Phase 3 will add Neo4j and Vector DB (not yet implemented)
- Authentication is mocked (single demo user id=1)
