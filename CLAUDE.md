# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Human-in-the-Loop Knowledge Graph System** - an interactive conversational AI system that transforms human thoughts into structured knowledge graphs through iterative dialogue, visual editing, and pattern recognition.

**Current Status**: Phase 1 complete, Phase 2 in progress. Core features implemented: Express API, SQLite persistence, Claude API streaming, React Flow canvas with CRUD operations, clarification dialog, undo/redo, multiple layout algorithms.

**Core Concept**: Users input ideas in natural language → AI clarifies through conversation → System extracts ontology → Visual graph editor → Compare against knowledge bases → Discover patterns → Store and reuse.

## Technology Stack

### Frontend
- **React + Vite** - Modern React framework with fast HMR
- **Tailwind CSS** (CDN) - Utility-first styling
- **React Flow** - Interactive graph visualization and editing
- **Zustand** - State management for graphs and UI
- **React Router** - Client-side routing
- **React Markdown** - Markdown rendering

### Backend
- **Node.js + Express** - REST API server
- **SQLite + better-sqlite3** - Metadata, users, sessions
- **Anthropic Claude API** - Conversational AI with SSE streaming
- **Neo4j** (Phase 3) - Graph database for ontology storage
- **Qdrant/Pinecone** (Phase 3) - Vector database for semantic search
- **n8n MCP Server** (Phase 4+) - Workflow orchestration

## Project Architecture

### Multi-Database Strategy (Critical Architectural Decision)
The system deliberately uses three specialized databases:
- **SQLite**: Application data (users, projects, metadata, sessions, comments). Lightweight, embedded, simple backup.
- **Neo4j**: Graph database for ontology storage. Enables Cypher queries, subgraph isomorphism, path similarity, transitive relationship inference.
- **Vector DB** (Qdrant/Pinecone): Semantic embeddings. Enables "find similar concepts" via cosine similarity, even when terminology differs.

**Why three databases?** Each comparison method reveals different insights:
- Neo4j: "This exact relationship pattern exists in philosophy domain"
- Vector DB: "This concept is semantically similar to X, Y, Z"
- LLM: "These ideas contradict/support each other because..."

All three run in parallel and results merge for comprehensive knowledge comparison.

### Key Architectural Patterns

#### 1. Clarification Dialog Pipeline
User input → Claude API conversation → Entity extraction → Ontology generation → Graph visualization

#### 2. Knowledge Comparison Engine
User graph → Parallel queries (Neo4j + Vector DB + LLM) → Results merge → Overlay visualization with color-coded matches

#### 3. Real-time Collaboration
WebSocket events synchronize graph edits, comments, and insights across multiple users with operational transformation for conflict resolution.

#### 4. n8n Workflow Orchestration via MCP
The system uses n8n for complex multi-step operations, exposed through Model Context Protocol (MCP):

**Example workflow**: User finalizes graph → Webhook trigger → Extract entities (Claude API) → Store graph (Neo4j) → Generate embeddings (parallel) → Vector DB insert → Find similar patterns → Send suggestions (WebSocket) → Log analytics

**MCP Integration**: Claude can search workflows (`search_workflows`), execute them (`execute_workflow`), and even modify workflow structure dynamically via the n8n MCP server.

**Critical**: The AI assistant itself can orchestrate workflows, not just trigger them. This enables adaptive processing pipelines based on graph complexity.

### Core Data Flow

1. **Input → Structure**: Text/voice → Clarification dialog → Extracted entities/relations → JSON ontology
2. **Structure → Visual**: JSON ontology → React Flow nodes/edges → Interactive graph canvas
3. **Compare → Insights**: User graph → DB comparisons → Similarity scores → AI-generated suggestions
4. **Edit → Store**: User edits → Real-time sync → Version control → Multi-DB persistence

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start dev server (port specified in spec as {frontend_port})
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development
```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run API tests
npm test

# Database migrations
npm run migrate
```

### Database Setup
```bash
# Initialize SQLite database with schema
npm run db:init

# Start Neo4j (Docker recommended)
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest

# Start Qdrant (if using Qdrant)
docker run -d --name qdrant \
  -p 6333:6333 \
  qdrant/qdrant:latest
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Test graph algorithms
npm run test:graph

# Test real-time sync
npm run test:realtime
```

## Critical Implementation Details

### API Key Management
- Claude API key stored in environment variables (`ANTHROPIC_API_KEY`)
- Neo4j connection: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
- Vector DB: `QDRANT_URL` and `QDRANT_API_KEY` (or Pinecone equivalents)
- n8n webhook: `N8N_WEBHOOK_URL`, `N8N_API_KEY`
- Spec mentions `/tmp/api-key` - this is for reference/testing only, never use in implementation

### Graph Rendering Performance
- React Flow can handle 100+ nodes, but requires optimization:
  - Use `nodesDraggable={false}` for large graphs when not editing
  - Implement virtualization for 500+ nodes
  - Lazy load node details on selection
  - Debounce layout recalculations

### Ontology Schema Structure
Nodes:
```javascript
{
  id: string,
  label: string,
  type: 'entity' | 'event' | 'attribute' | 'process',
  properties: object,
  confidence: number (0-1),
  source: 'user-stated' | 'inferred'
}
```

Edges:
```javascript
{
  source: string,
  target: string,
  relation: string, // 'is-a', 'part-of', 'causes', 'enables', 'requires', 'influences'
  strength: number (0-1),
  temporal: boolean,
  properties: object
}
```

### Real-time Synchronization (Two-Protocol Strategy)
- **WebSocket (Socket.io)**: Bidirectional for graph edits, comments, cursor positions, presence. Required for collaborative editing with multiple simultaneous users.
- **Server-Sent Events (SSE)**: Unidirectional streaming for AI responses during clarification dialog. Allows displaying responses token-by-token as Claude generates them.

**Conflict Resolution**: When two users edit the same node simultaneously:
1. Last-write-wins for independent properties
2. Operational transformation for text fields (collaborative editing)
3. Prompt user for conflict resolution on contradictory relationship changes
4. Automatic versioning preserves both edits in history

### n8n MCP Integration
Available MCP tools when implementing workflow features:
- `search_workflows` - Find workflows by name/tags
- `execute_workflow` - Trigger workflow execution
- `get_workflow_details` - Retrieve workflow configuration

### Causal Chain Detection (Complex NLP Task)
Causal chains are a core differentiator. Users describe processes/arguments, system builds cause-effect graphs.

**Algorithm pipeline**:
1. **Marker detection**: Regex + NLP for "because", "therefore", "leads to", "enables", "causes", "requires", "influences"
2. **Temporal extraction**: Identify before/after relationships from tense and time expressions
3. **DAG construction**: Build directed graph, detect cycles (logical contradictions)
4. **Transitive reduction**: Remove redundant edges (if A→B and B→C and A→C, remove A→C)
5. **Strength scoring**: Confidence based on linguistic certainty markers

**Visualization**: Flowchart-style with probability annotations, branch points for alternative outcomes, feedback loops highlighted.

**Interactive editing**: Users can adjust causation strength, insert mediating variables, test "what-if" scenarios by temporarily removing edges.

## Implementation Phases

**Phase 1 (Complete)**: Express + SQLite + Claude API + React Flow canvas + Clarification dialog
**Phase 2 (In Progress)**: Interactive editing (CRUD, undo/redo, layout algorithms) + Save/load + Graph notes
**Phase 3 (Planned)**: Neo4j + Vector DB + Comparison engine
**Phases 4-8**: Patterns, causal analysis, n8n, advanced features, polish

## Code Organization (When Implementing)

Recommended structure:
```
/frontend
  /src
    /components
      /Graph          # React Flow components
      /Dialog         # Clarification UI
      /Panels         # Side panels (properties, insights)
      /Modals         # Comparison, export, settings
    /hooks            # Custom React hooks
    /services         # API clients
    /store            # State management
    /utils            # Helpers

/backend
  /src
    /routes           # Express routes
    /controllers      # Business logic
    /services
      /nlp            # Entity extraction
      /comparison     # Multi-DB comparison
      /causal         # Chain analysis
    /models           # Database schemas
    /middleware       # Auth, validation
    /workers          # Background jobs
```

## Testing Strategy

Focus areas:
- **Ontology conversion**: Test entity/relation extraction accuracy
- **Graph algorithms**: Verify causal chain detection, pattern matching
- **Real-time sync**: Test concurrent edits, conflict resolution
- **Database queries**: Performance test Neo4j subgraph queries
- **n8n integration**: Mock MCP calls, test workflow execution
- **E2E flows**: Complete idea-to-graph flow from spec example

## Performance Considerations

Target metrics from spec:
- Initial load: < 2s
- Graph render (100 nodes): < 500ms
- Real-time update latency: < 100ms
- Comparison query: < 3s
- Pattern search: < 1s

Optimization strategies:
- Index SQLite on user_id, project_id, created_at
- Use Neo4j indexes on node labels and properties
- Cache vector DB embeddings
- Debounce graph layout calculations
- Use React.memo for graph components
- Implement pagination for large result sets

## Reference Implementation & Benchmark

The spec includes a complete use case: **"Consciousness is Not Material" philosophical argument**

This serves as the gold standard integration test:
1. User inputs vague initial idea about consciousness
2. AI conducts 3-4 turn clarification dialog (probing definitions, assumptions, relationships)
3. System extracts 8+ nodes (Qualia, Subjective Experience, Physical Processes, etc.) and 8+ edges
4. React Flow renders with auto-layout
5. Comparison results: Neo4j finds 47 similar philosophical concepts, Vector DB finds 4 semantically similar arguments, LLM identifies 7 related concepts
6. System suggests adding: Hard Problem of Consciousness, Explanatory Gap, Physicalism
7. Causal chain visualizer shows: Physical brain activity → (?) → Subjective experience (highlighting the explanatory gap)
8. User refines, stores as pattern under "Philosophy/Mind-Body Problem"
9. System recommends 5 similar patterns with similarity scores
10. **Total user interaction time: ~20 minutes**

**Success criteria**: If this flow works smoothly, everything else will work. It exercises every major component.

## Notes

- The `Claude.md` file is the app specification, not implementation guidance
- Prioritize user experience and smooth real-time interactions
- Graph visualization is the core UX element - make it beautiful and responsive
- AI clarification quality determines ontology quality - invest time here
