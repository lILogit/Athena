<div style="text-align: center;">
  <img
    width="300"
    height="300"
    alt="image"
    src="https://github.com/user-attachments/assets/096fdf5c-69b6-4bff-a6c9-e5272cf64153](https://github.com/user-attachments/assets/0bcef673-df2f-4898-976f-8d1a82372ecc"
  />
</div>



# Interactive Knowledge Graph System

A Human-in-the-Loop conversational AI system that transforms thoughts into structured knowledge graphs through iterative dialogue, visual editing, and pattern recognition.

## Project Structure

This is a monorepo containing:
- `shared/` - Shared TypeScript types and utilities
- `backend/` - Node.js/Express API server
- `frontend/` - React/Vite web application

## Quick Start

### Prerequisites
- Node.js 20 LTS or higher
- npm 10 or higher
- Anthropic API key

### Installation

```bash
# Install all dependencies
npm install

# Setup backend environment
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
cd ..

# Initialize database
cd backend && npm run db:init && cd ..
```

### Development

```bash
# Start both backend and frontend dev servers
npm run dev

# Or run separately:
# Terminal 1: Backend (port 3000)
cd backend && npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend && npm run dev
```

### Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Health Check: http://localhost:3000/api/health

## Architecture

### Backend
- Express.js with TypeScript
- SQLite for metadata storage
- Claude API for conversational AI
- Socket.io for real-time updates
- SSE for streaming AI responses

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- React Flow for graph visualization
- Socket.io client for real-time updates

## Development Commands

```bash
# Install dependencies for all workspaces
npm install

# Run development servers
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Guidance for Claude Code
- [Claude.md](./Claude.md) - Complete app specification
- [Implementation Plan](~/.claude/plans/reactive-petting-tarjan.md) - Phase 1 plan

## License

MIT
