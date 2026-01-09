
# App Specification: Human-in-the-Loop Knowledge Graph System  
  
## Overview  
  
Build an interactive conversational AI system that transforms human thoughts into structured knowledge graphs through iterative dialogue, visual editing, and pattern recognition. The system enables users to input ideas, clarify context through AI conversation, visualize concepts as interactive graphs using React Flow, compare knowledge against databases (Neo4j graph DB, vector DB, and LLM), discover connections, edit collaboratively, analyze causal chains, and store patterns - all orchestrated through n8n workflows accessible via MCP (Model Context Protocol).  
  
## Technology Stack  
  
### Frontend  
  
- **Framework**: React with Vite  
- **Styling**: Tailwind CSS (via CDN)  
- **Graph Visualization**: React Flow for interactive knowledge graphs  
- **State Management**: React hooks and context  
- **Routing**: React Router for navigation  
- **Markdown**: React Markdown for text rendering  
- **Real-time Updates**: Socket.io client for WebSocket connections  
- **Port**: Launch on port {frontend_port}  
  
### Backend  
  
- **Runtime**: Node.js with Express  
- **Database**:  
    - SQLite with better-sqlite3 (metadata, users, sessions)  
    - Neo4j (graph database for ontology storage)  
    - Qdrant/Pinecone (vector database for semantic search)  
- **API Integration**:  
    - Claude API via Anthropic SDK (conversation and NLP)  
    - n8n MCP Server integration  
- **Streaming**: Server-Sent Events (SSE) and WebSocket for real-time updates  
- **Orchestration**: n8n workflows for background processing  
  
### API Communication  
  
- RESTful endpoints for CRUD operations  
- WebSocket for real-time graph updates  
- SSE for streaming AI responses  
- MCP integration for n8n workflow management  
- API key located at `/tmp/api-key` for testing (reference in code, do not read)  
  
## Core Features  
  
### 1. Conversational Context Clarification  
  
- **Multi-turn Dialog Engine**:  
    - AI-guided conversation to extract entities, relationships, and context  
    - Clarification questions for ambiguous terms  
    - Probing for missing relationships and dependencies  
    - Validation of user assumptions  
    - Suggestion of related concepts from templates  
- **Input Processing**:  
    - Free-text input field with streaming responses  
    - Support for ideas, thoughts, decisions, concepts  
    - Context-aware follow-up questions  
    - Confidence scoring for extracted information  
    - Source tracking (user-stated vs. inferred)  
  
### 2. Text-to-Ontology Conversion  
  
- **NLP Pipeline**:  
    - Entity extraction with type classification (entity/event/attribute/process)  
    - Relation extraction with semantic roles  
    - Attribute identification  
    - Hierarchy detection (is-a, part-of, causes, enables, requires, influences)  
- **Ontology Schema**:  
    - Nodes: id, label, type, properties, confidence, source  
    - Edges: source, target, relation, strength, temporal, properties  
    - JSON structure for storage and transmission  
- **Automatic Generation**:  
    - Real-time conversion during clarification dialog  
    - Preview of ontology structure before finalization  
    - Edit capability before committing to graph  
  
### 3. Interactive React Flow Graph Editor  
  
- **Visual Components**:  
    - Different node shapes/colors for entity types  
    - Edge styling (arrows, dashed for uncertainty, weighted)  
    - Auto-clustering of related concepts  
    - Multiple layout algorithms (hierarchical, force-directed, circular)  
- **Interaction Features**:  
    - Drag-and-drop node repositioning  
    - Click-to-edit properties panel  
    - Right-click context menu (add concept, find similar, add note)  
    - Double-click to expand/collapse sub-graphs  
    - Undo/redo stack  
    - Version history timeline with restore  
    - Zoom and pan controls  
    - Minimap for navigation  
- **Node Properties Panel**:  
    - Editable labels and descriptions  
    - Type selector  
    - Confidence slider  
    - Source attribution  
    - Custom metadata fields  
    - Related concepts suggestions  
  
### 4. Knowledge Comparison Engine  
  
- **Multi-Source Matching**:  
    - Graph DB queries (Neo4j) for subgraph isomorphism and path similarity  
    - Vector DB search (Qdrant/Pinecone) for semantic embedding similarity  
    - LLM reasoning (Claude) for conceptual overlap detection  
- **Comparison Output Display**:  
    - Exact matches (green highlighting)  
    - Partial overlaps (yellow highlighting)  
    - Contradictions (red highlighting)  
    - Novel concepts (blue highlighting)  
    - Similarity scores with explanations  
- **Overlay Visualization**:  
    - User graph + existing knowledge side-by-side  
    - Interactive comparison controls  
    - Filter by match type  
    - Detailed similarity reports  
  
### 5. Connection Discovery Module  
  
- **Pattern Matching**:  
    - Transitive relationship inference (A→B, B→C implies A→C)  
    - Common neighbor detection (bridge concepts)  
    - Analogical reasoning via structure mapping  
- **Insight Generation**:  
    - "Similar to existing concept X" notifications  
    - "Often connected to Y in database" suggestions  
    - "Users also explored A, B, C" recommendations  
    - Missing intermediate step identification  
- **Interactive Suggestions**:  
    - Click to add suggested nodes/edges  
    - Batch accept/reject recommendations  
    - Explanation of why suggestion was made  
  
### 6. Collaborative Ontology Editor  
  
- **Human Refinement Tools**:  
    - Merge nodes with conflict resolution UI  
    - Split compound concepts  
    - Adjust relationship types and weights  
    - Add metadata (sources, confidence, notes, tags)  
    - Annotation system for review  
- **AI Assistance**:  
    - Relationship type suggestions based on language patterns  
    - Logical inconsistency warnings  
    - Ontology best practice recommendations  
    - Auto-complete for node properties from knowledge base  
- **Collaboration Features**:  
    - Real-time co-editing (multiple cursors)  
    - Comment threads on nodes/edges  
    - @mention system  
    - Role-based permissions (viewer, editor, admin)  
    - Activity history log  
  
### 7. Causal Chain Analyzer  
  
- **Causality Detection**:  
    - Extract temporal sequences from text  
    - Identify causal markers (because, therefore, leads to, enables)  
    - Build directed acyclic graphs (DAGs) of causation  
- **Chain Visualization**:  
    - Flowchart-style causal paths  
    - Branch points for multiple outcomes  
    - Feedback loops highlighted  
    - Probability annotations on edges  
    - Strength indicators (strong, moderate, weak)  
- **Interactive Editing**:  
    - Add/remove causal links  
    - Adjust strength of causation  
    - Insert mediating variables  
    - Test "what-if" scenarios  
    - Alternative path exploration  
  
### 8. Pattern Knowledge Store  
  
- **Storage Schema**:  
    - Graph patterns as subgraph templates  
    - Metadata: frequency, domains, success metrics  
    - Provenance: creator, timestamp, version  
    - Tags and categories  
- **Pattern Types**:  
    - Domain-specific (business, scientific, philosophical)  
    - Structural (hub-and-spoke, chain, cycle)  
    - Behavioral (decision trees, workflows)  
- **Versioning**:  
    - Git-like branching for pattern evolution  
    - Compare pattern versions  
    - Restore previous versions  
    - Fork patterns for customization  
  
### 9. Pattern Retrieval & Recommendation  
  
- **Similarity Search**:  
    - Graph edit distance calculation  
    - Embedding cosine similarity  
    - Structural fingerprinting  
- **Recommendation UI**:  
    - "Patterns like yours" carousel  
    - Side-by-side comparison view  
    - Diff highlighting (additions/deletions)  
    - One-click pattern import/merge  
    - Rating and usage statistics  
- **Pattern Library**:  
    - Browse by category  
    - Search by tags or keywords  
    - Filter by domain or structure type  
    - Community-contributed patterns  
  
### 10. n8n Workflow Orchestration  
  
- **Workflow Architecture**:  
    - Trigger: User input webhook  
    - Clarification: Claude API dialog  
    - Entity Extraction: NLP service  
    - Graph Construction: Custom node  
    - Parallel DB Queries: Graph DB, Vector DB, LLM  
    - Results Merge: JavaScript node  
    - Frontend Update: WebSocket  
    - Human Approval: Wait node  
    - Storage: Multi-DB write  
    - Notifications: Slack/email  
- **MCP Integration**:  
    - Available tools: search_workflows, execute_workflow, get_workflow_details  
    - Dynamic workflow modification via AI  
    - Visual workflow editor integration  
    - Workflow template library  
- **Background Processing**:  
    - Asynchronous pattern storage  
    - Batch vector embedding generation  
    - Scheduled similarity updates  
    - Usage analytics collection  
  
### 11. Temporal Knowledge Evolution  
  
- **Version Control**:  
    - Track concept changes over time  
    - Animate graph transformations  
    - Compare knowledge states across dates  
    - "Time travel" slider for historical views  
- **Evolution Visualization**:  
    - Timeline view of graph changes  
    - Heatmap of modification frequency  
    - Concept lifecycle tracking  
    - Convergence/divergence analysis  
  
### 12. Knowledge Provenance & Trust  
  
- **Source Management**:  
    - Citation tracking for every node  
    - Confidence scores with explanations  
    - User reputation system  
    - Verification badges for peer-reviewed content  
- **Trust Indicators**:  
    - Source quality rating  
    - Consensus level visualization  
    - Controversy flags  
    - Evidence strength display  
  
### 13. Smart Templates & Bootstrapping  
  
- **Pre-built Templates**:  
    - Business process frameworks  
    - Scientific method structures  
    - Decision-making frameworks  
    - Argument structures (philosophical, legal)  
- **Quick-start Features**:  
    - Wizards for common domains  
    - One-click import from standards (Dublin Core, FOAF, Schema.org)  
    - Template customization  
    - Template sharing and rating  
  
### 14. Multi-Modal Input  
  
- **Input Methods**:  
    - Voice-to-graph (transcribe → extract → visualize)  
    - Image upload with OCR for diagrams  
    - PDF/document ingestion pipeline  
    - Screen recording analysis  
- **File Processing**:  
    - Automatic text extraction  
    - Diagram recognition  
    - Table parsing  
    - Citation extraction  
  
### 15. Export & Integration  
  
- **Export Formats**:  
    - RDF, OWL (semantic web standards)  
    - GraphML (graph visualization tools)  
    - JSON-LD (linked data)  
    - Markdown document with citations  
    - LaTeX (TikZ diagram)  
    - Obsidian graph format  
    - PDF report  
- **Integration Options**:  
    - REST API for external apps  
    - Embed graphs as iframes  
    - Slack/Discord bot integration  
    - Webhook notifications  
    - GraphQL endpoint  
  
### 16. AI-Powered Insights  
  
- **Analysis Features**:  
    - Anomaly detection (unusual connections)  
    - Gap analysis (missing expected relationships)  
    - Concept drift monitoring  
    - Predictive suggestions  
- **Health Metrics**:  
    - Graph completeness score  
    - Consistency checker (logical contradictions)  
    - Redundancy detector (duplicate concepts)  
    - Centrality analysis (identify key concepts)  
- **Recommendations**:  
    - Suggested improvements  
    - Missing counterarguments  
    - Related research areas  
    - Collaboration opportunities  
  
### 17. Advanced Query Interface  
  
- **Natural Language Queries**:  
    - "Show me all paths from X to Y"  
    - "Find concepts related to Z"  
    - "What causes A?"  
- **Visual Query Builder**:  
    - Cypher/SPARQL visual interface  
    - Saved query templates  
    - Query result visualization options  
    - Query history and sharing  
  
### 18. Gamification & Learning  
  
- **Engagement Features**:  
    - Achievement badges for graph completeness  
    - Leaderboards for most-used patterns  
    - Guided tutorials with progressive challenges  
    - "Graph of the Week" showcase  
- **Learning Paths**:  
    - Interactive tutorials  
    - Best practices guide  
    - Domain-specific courses  
    - Community challenges  
  
### 19. Search & Discovery  
  
- **Search Capabilities**:  
    - Full-text search across all graphs  
    - Filter by project, date, creator, domain  
    - Semantic search using embeddings  
    - Graph structure search  
- **Discovery Features**:  
    - Trending patterns  
    - Popular concepts  
    - Related graph recommendations  
    - Collaborative filtering  
  
### 20. Settings & Preferences  
  
- **Visual Settings**:  
    - Theme selection (Light, Dark, Auto)  
    - Graph layout preferences  
    - Node/edge styling customization  
    - Animation speed control  
- **Functional Settings**:  
    - Auto-save interval  
    - Confidence threshold for suggestions  
    - AI clarification depth  
    - Privacy settings  
- **Integration Settings**:  
    - n8n workflow endpoints  
    - Database connections  
    - API keys management  
    - Webhook configurations  
  
## Database Schema  
  
### SQLite (Metadata & User Data)  
  
#### users  
  
- id (INTEGER PRIMARY KEY)  
- email (TEXT UNIQUE)  
- name (TEXT)  
- avatar_url (TEXT)  
- created_at (TEXT)  
- last_login (TEXT)  
- preferences (TEXT JSON)  
- reputation_score (INTEGER)  
  
#### projects  
  
- id (INTEGER PRIMARY KEY)  
- user_id (INTEGER FK)  
- name (TEXT)  
- description (TEXT)  
- domain (TEXT)  
- created_at (TEXT)  
- updated_at (TEXT)  
- is_public (INTEGER BOOLEAN)  
  
#### graphs  
  
- id (INTEGER PRIMARY KEY)  
- project_id (INTEGER FK)  
- user_id (INTEGER FK)  
- title (TEXT)  
- description (TEXT)  
- ontology_data (TEXT JSON)  
- version (INTEGER)  
- created_at (TEXT)  
- updated_at (TEXT)  
- is_archived (INTEGER BOOLEAN)  
  
#### graph_versions  
  
- id (INTEGER PRIMARY KEY)  
- graph_id (INTEGER FK)  
- version (INTEGER)  
- ontology_data (TEXT JSON)  
- change_description (TEXT)  
- created_by (INTEGER FK)  
- created_at (TEXT)  
  
#### patterns  
  
- id (INTEGER PRIMARY KEY)  
- name (TEXT)  
- category (TEXT)  
- domain (TEXT)  
- structure (TEXT JSON)  
- creator_id (INTEGER FK)  
- created_at (TEXT)  
- updated_at (TEXT)  
- usage_count (INTEGER)  
- rating_avg (REAL)  
  
#### pattern_uses  
  
- id (INTEGER PRIMARY KEY)  
- pattern_id (INTEGER FK)  
- graph_id (INTEGER FK)  
- user_id (INTEGER FK)  
- used_at (TEXT)  
  
#### comparisons  
  
- id (INTEGER PRIMARY KEY)  
- graph_id (INTEGER FK)  
- comparison_type (TEXT)  
- source_db (TEXT)  
- results (TEXT JSON)  
- similarity_score (REAL)  
- created_at (TEXT)  
  
#### causal_chains  
  
- id (INTEGER PRIMARY KEY)  
- graph_id (INTEGER FK)  
- chain_data (TEXT JSON)  
- created_at (TEXT)  
- updated_at (TEXT)  
  
#### comments  
  
- id (INTEGER PRIMARY KEY)  
- graph_id (INTEGER FK)  
- node_id (TEXT)  
- user_id (INTEGER FK)  
- content (TEXT)  
- created_at (TEXT)  
- parent_comment_id (INTEGER FK NULL)  
  
#### templates  
  
- id (INTEGER PRIMARY KEY)  
- name (TEXT)  
- description (TEXT)  
- domain (TEXT)  
- template_data (TEXT JSON)  
- is_public (INTEGER BOOLEAN)  
- creator_id (INTEGER FK)  
- created_at (TEXT)  
- usage_count (INTEGER)  
  
#### workflows  
  
- id (INTEGER PRIMARY KEY)  
- n8n_workflow_id (TEXT)  
- name (TEXT)  
- description (TEXT)  
- config (TEXT JSON)  
- is_active (INTEGER BOOLEAN)  
- created_at (TEXT)  
  
#### sessions  
  
- id (INTEGER PRIMARY KEY)  
- user_id (INTEGER FK)  
- graph_id (INTEGER FK)  
- clarification_state (TEXT JSON)  
- created_at (TEXT)  
- updated_at (TEXT)  
  
### Neo4j (Graph Database)  
  
- Stores full ontology graphs  
- Nodes: Concept entities with properties  
- Edges: Relationships with typed connections  
- Indexes on labels and properties  
- Subgraph pattern storage  
- Historical graph snapshots  
  
### Qdrant/Pinecone (Vector Database)  
  
- Concept embeddings for semantic search  
- Pattern embeddings for similarity matching  
- Graph structure embeddings  
- Query: cosine similarity search  
- Metadata filtering capabilities  
  
## API Endpoints  
  
### Graph Management  
  
- `GET /api/graphs` - List all graphs  
- `POST /api/graphs` - Create new graph  
- `GET /api/graphs/:id` - Get graph by ID  
- `PUT /api/graphs/:id` - Update graph  
- `DELETE /api/graphs/:id` - Delete graph  
- `POST /api/graphs/:id/duplicate` - Duplicate graph  
- `POST /api/graphs/:id/export` - Export graph  
- `GET /api/graphs/:id/versions` - Get version history  
- `POST /api/graphs/:id/restore/:version` - Restore version  
  
### Clarification Dialog  
  
- `POST /api/clarify/start` - Start clarification session  
- `POST /api/clarify/message` - Send message in session  
- `GET /api/clarify/session/:id` - Get session state  
- `POST /api/clarify/finalize` - Finalize and generate ontology  
  
### Ontology Conversion  
  
- `POST /api/ontology/convert` - Convert text to ontology  
- `POST /api/ontology/extract` - Extract entities/relations  
- `POST /api/ontology/validate` - Validate ontology structure  
- `POST /api/ontology/merge` - Merge ontologies  
  
### Knowledge Comparison  
  
- `POST /api/compare/graph` - Compare against graph DB  
- `POST /api/compare/vector` - Compare against vector DB  
- `POST /api/compare/llm` - Compare using LLM reasoning  
- `POST /api/compare/all` - Run all comparisons  
- `GET /api/compare/results/:id` - Get comparison results  
  
### Pattern Management  
  
- `GET /api/patterns` - List patterns  
- `POST /api/patterns` - Create pattern  
- `GET /api/patterns/:id` - Get pattern by ID  
- `PUT /api/patterns/:id` - Update pattern  
- `DELETE /api/patterns/:id` - Delete pattern  
- `POST /api/patterns/search` - Search similar patterns  
- `POST /api/patterns/:id/apply` - Apply pattern to graph  
- `GET /api/patterns/recommendations/:graphId` - Get recommendations  
  
### Causal Chain Analysis  
  
- `POST /api/causal/analyze` - Analyze graph for causal chains  
- `GET /api/causal/:graphId` - Get causal chains for graph  
- `POST /api/causal/simulate` - Run what-if simulation  
- `PUT /api/causal/edit` - Edit causal chain  
  
### n8n Workflow Integration  
  
- `GET /api/workflows` - List n8n workflows  
- `POST /api/workflows/execute` - Execute workflow  
- `GET /api/workflows/:id` - Get workflow details  
- `POST /api/workflows/modify` - Modify workflow via MCP  
- `GET /api/workflows/status/:executionId` - Check execution status  
  
### Search & Query  
  
- `POST /api/search/graphs` - Search graphs  
- `POST /api/search/concepts` - Search concepts  
- `POST /api/search/patterns` - Search patterns  
- `POST /api/query/natural` - Natural language query  
- `POST /api/query/cypher` - Cypher query execution  
  
### Collaboration  
  
- `POST /api/graphs/:id/share` - Create share link  
- `GET /api/share/:token` - Access shared graph  
- `POST /api/comments` - Add comment  
- `GET /api/comments/:graphId` - Get comments  
- `PUT /api/comments/:id` - Update comment  
- `DELETE /api/comments/:id` - Delete comment  
  
### Templates  
  
- `GET /api/templates` - List templates  
- `GET /api/templates/:id` - Get template  
- `POST /api/templates` - Create template  
- `POST /api/templates/:id/apply` - Apply to graph  
  
### Projects  
  
- `GET /api/projects` - List projects  
- `POST /api/projects` - Create project  
- `GET /api/projects/:id` - Get project  
- `PUT /api/projects/:id` - Update project  
- `DELETE /api/projects/:id` - Delete project  
- `GET /api/projects/:id/graphs` - Get project graphs  
  
### User & Settings  
  
- `GET /api/users/me` - Get current user  
- `PUT /api/users/me` - Update user profile  
- `GET /api/settings` - Get user settings  
- `PUT /api/settings` - Update settings  
  
### Analytics & Insights  
  
- `GET /api/insights/:graphId/health` - Graph health metrics  
- `GET /api/insights/:graphId/gaps` - Gap analysis  
- `GET /api/insights/:graphId/anomalies` - Anomaly detection  
- `GET /api/insights/:graphId/suggestions` - AI suggestions  
  
### WebSocket Events  
  
- `graph:update` - Real-time graph changes  
- `comparison:complete` - Comparison results ready  
- `pattern:found` - Similar pattern discovered  
- `insight:generated` - New insight available  
- `collaboration:edit` - Co-editor made change  
- `workflow:status` - n8n workflow status update  
  
## UI Layout  
  
### Main Structure  
  
- **Three-panel layout**:  
    - Left: Project/graph navigation sidebar  
    - Center: React Flow graph canvas  
    - Right: Context panel (properties, comparisons, insights)  
- **Collapsible panels** with resize handles  
- **Responsive breakpoints**: mobile (single), tablet (two), desktop (three)  
- **Top header**: Project selector, mode toggle, settings  
- **Bottom panel**: Clarification dialog input (expandable)  
  
### Left Sidebar  
  
- **New Graph button** (prominent)  
- **Project selector** dropdown  
- **Graph list** with:  
    - Thumbnails  
    - Title and description  
    - Last modified timestamp  
    - Quick actions (duplicate, export, delete)  
- **Search/filter** graphs  
- **Templates** section  
- **Pattern library** access  
- **User profile** at bottom  
  
### Center Canvas (React Flow)  
  
- **Graph visualization** with:  
    - Zoom controls  
    - Minimap  
    - Layout selector (hierarchical, force, circular)  
    - Fit view button  
- **Toolbar**:  
    - Add node manually  
    - Toggle node types visibility  
    - Show/hide edge labels  
    - Snapshot/export  
- **Context menu** (right-click):  
    - Add related concept  
    - Find similar  
    - Add note  
    - Delete  
    - Expand/collapse  
- **Floating panels**:  
    - Legend (node types, edge types)  
    - Keyboard shortcuts  
- **Status bar**:  
    - Node/edge count  
    - Completeness score  
    - Last saved indicator  
  
### Right Context Panel  
  
- **Tabbed interface**:  
    - **Properties**: Selected node/edge details  
    - **Comparisons**: Match results from DBs  
    - **Insights**: AI suggestions and analysis  
    - **Causal Chains**: Chain visualization  
    - **Patterns**: Similar patterns  
    - **Comments**: Collaboration threads  
- **Panel-specific actions**:  
    - Apply suggestion  
    - Accept/reject comparison  
    - View full analysis  
    - Compare patterns  
  
### Bottom Clarification Dialog  
  
- **Collapsible chat interface**  
- **Streaming AI responses**  
- **Input field** with suggestions  
- **Quick actions**: Finalize, restart, save draft  
- **Session progress** indicator  
- **Extracted entities** preview  
  
### Modals & Overlays  
  
- **Pattern comparison modal**: Side-by-side view  
- **Export options modal**: Format selection  
- **Share modal**: Link generation and permissions  
- **Workflow editor modal**: Visual n8n editor  
- **Settings modal**: Tabbed preferences  
- **Template selector**: Gallery view  
- **Health report modal**: Detailed metrics  
  
## Design System  
  
### Color Palette  
  
- **Primary**: Teal/cyan accent (#14B8A6 for knowledge/connections)  
- **Secondary**: Amber (#F59E0B for highlights/insights)  
- **Background**:  
    - Light: White (#FFFFFF)  
    - Dark: Deep gray (#111827)  
- **Surface**:  
    - Light: Light gray (#F9FAFB)  
    - Dark: Darker gray (#1F2937)  
- **Node Colors** (by type):  
    - Entity: Blue (#3B82F6)  
    - Event: Orange (#F97316)  
    - Process: Green (#10B981)  
    - Attribute: Purple (#8B5CF6)  
- **Edge Colors**:  
    - Strong relation: Dark (#1F2937)  
    - Weak relation: Light gray (#D1D5DB)  
    - Causal: Red (#EF4444)  
    - Temporal: Blue (#3B82F6)  
- **Status Colors**:  
    - Match: Green (#10B981)  
    - Partial: Yellow (#F59E0B)  
    - Conflict: Red (#EF4444)  
    - Novel: Blue (#3B82F6)  
  
### Typography  
  
- **Font Family**: Inter, system-ui, sans-serif  
- **Headings**: font-semibold  
- **Body**: font-normal, leading-relaxed  
- **Code**: Monospace (JetBrains Mono)  
- **Node Labels**: font-medium, text-sm  
  
### Component Styles  
  
#### Graph Nodes  
  
- Rounded rectangles with shadows  
- Color-coded by type  
- Icon + label layout  
- Hover: glow effect  
- Selected: thick border  
- Confidence indicator: opacity variation  
  
#### Graph Edges  
  
- Bezier curves for organic flow  
- Arrow markers on direction  
- Dashed lines for uncertainty  
- Weight indicator: line thickness  
- Labels on hover  
- Animated flow for active paths  
  
#### Buttons  
  
- **Primary**: Teal background, white text  
- **Secondary**: Border with hover fill  
- **Icon buttons**: Circular with hover background  
- **Action buttons**: Context-specific colors  
  
#### Panels  
  
- Card-style with subtle shadows  
- Rounded corners (12px)  
- Header with title and actions  
- Scrollable content area  
- Collapsible sections  
  
### Animations  
  
- **Smooth transitions**: 200-300ms  
- **Node additions**: Fade + scale in  
- **Edge animations**: Draw from source to target  
- **Panel slides**: Slide in/out  
- **Insight notifications**: Toast-style  
- **Loading states**: Pulsing skeleton loaders  
- **Graph layout**: Animated transitions between layouts  
  
## Key User Flows  
  
### Idea to Knowledge Graph Flow  
  
1. User clicks "New Graph" and enters initial idea  
2. AI starts clarification dialog with questions  
3. User responds, AI extracts entities/relations in real-time  
4. Preview of emerging ontology shown during dialog  
5. User finalizes, graph renders in React Flow  
6. Automatic layout applied, user can rearrange  
7. Comparison with databases runs in background  
8. Insights and suggestions appear in right panel  
9. User refines graph based on recommendations  
10. Save as pattern option offered  
  
### Pattern Discovery and Application Flow  
  
1. User creates/loads a graph  
2. System automatically searches for similar patterns  
3. Pattern recommendations appear in right panel  
4. User clicks "Compare" on a pattern  
5. Side-by-side modal shows differences  
6. User selects elements to merge  
7. Graph updates with animated node additions  
8. Causal chain analysis runs automatically  
9. User reviews and adjusts chains  
10. Save updated graph with pattern attribution  
  
### Collaborative Editing Flow  
  
1. User shares graph link with collaborator  
2. Collaborator opens graph (read-only or editor mode)  
3. Real-time cursors show each user's position  
4. User A adds a node  
5. Node appears immediately for User B  
6. User B adds comment on node  
7. Comment notification appears for User A  
8. Users @mention each other for discussion  
9. Conflict resolution prompt if simultaneous edits  
10. Version saved with all contributors listed  
  
### Workflow Modification Flow  
  
1. User requests workflow change via chat  
2. AI searches n8n workflows using MCP  
3. Workflow details retrieved and analyzed  
4. AI proposes modification with node diagram  
5. User approves change  
6. Workflow updated via MCP execute  
7. Test run initiated automatically  
8. Results displayed in workflow status panel  
9. User confirms workflow works as expected  
10. Workflow saved and activated  
  
## Implementation Priority  
  
### Phase 1: Foundation (Priority: Critical)  
  
- Initialize Express server with SQLite  
- Set up Claude API integration  
- Create basic React Flow canvas  
- Implement clarification dialog UI  
- Build text-to-ontology converter  
- Create graph visualization with React Flow  
- Set up WebSocket for real-time updates  
  
### Phase 2: Core Features (Priority: High)  
  
- Implement entity/relation extraction  
- Build interactive node/edge editing  
- Create properties panel  
- Add basic graph operations (add, delete, edit)  
- Implement undo/redo functionality  
- Build save/load graph functionality  
- Add project management  
  
### Phase 3: Knowledge Comparison (Priority: High)  
  
- Integrate Neo4j graph database  
- Set up vector database (Qdrant/Pinecone)  
- Implement comparison engine  
- Build comparison results UI  
- Create overlay visualization  
- Add insight generation  
  
### Phase 4: Patterns (Priority: Medium)  
  
- Create pattern storage system  
- Build pattern search and recommendation  
- Implement pattern comparison UI  
- Add pattern library browser  
- Enable pattern application to graphs  
- Build rating and feedback system  
  
### Phase 5: Causal Analysis (Priority: Medium)  
  
- Implement causal chain detector  
- Build chain visualization UI  
- Add interactive chain editing  
- Create what-if simulation  
- Build alternative path explorer  
  
### Phase 6: n8n Integration (Priority: Medium)  
  
- Set up n8n MCP server integration  
- Implement workflow search and execute  
- Build workflow status monitoring  
- Create workflow modification interface  
- Add background job processing  
  
### Phase 7: Advanced Features (Priority: Low)  
  
- Implement temporal evolution tracking  
- Add multi-user collaboration  
- Build knowledge health metrics  
- Create template system  
- Add multi-modal input (voice, images, PDFs)  
- Implement advanced query interface  
  
### Phase 8: Polish & Optimization (Priority: Low)  
  
- Optimize graph rendering performance  
- Add comprehensive keyboard shortcuts  
- Implement gamification features  
- Build onboarding tutorial  
- Create export to multiple formats  
- Add accessibility improvements  
- Performance optimization and caching  
  
## Success Criteria  
  
### Functionality  
  
- Clarification dialog successfully extracts structured ontology  
- Graph visualization renders smoothly with 100+ nodes  
- Real-time updates work without lag  
- Comparison engine returns relevant results in < 3 seconds  
- Pattern recommendations are contextually accurate  
- Causal chain detection identifies valid relationships  
- n8n workflows execute successfully via MCP  
- All CRUD operations work reliably  
  
### User Experience  
  
- Intuitive graph editing with immediate feedback  
- Clear visual distinction between node/edge types  
- Comparison results easy to understand and act on  
- Pattern recommendations helpful and relevant  
- Responsive on all device sizes  
- Smooth animations and transitions  
- Clear indication of system state and progress  
  
### Technical Quality  
  
- Clean, modular code structure  
- Proper error handling throughout  
- Optimized database queries  
- Efficient graph algorithms  
- Secure API key management  
- Comprehensive testing coverage  
- Scalable architecture  
  
### Design Polish  
  
- Consistent visual design language  
- Beautiful graph visualizations  
- Professional UI components  
- Excellent contrast and readability  
- Smooth micro-interactions  
- Dark mode fully implemented  
- Accessible to all users  
  
## Testing Requirements  
  
- Unit tests for ontology conversion logic  
- Integration tests for API endpoints  
- Graph algorithm correctness tests  
- Real-time synchronization tests  
- Database query performance tests  
- n8n workflow integration tests  
- E2E tests for complete user flows  
- Accessibility testing (WCAG 2.1 AA)  
  
## Performance Targets  
  
- Initial page load: < 2 seconds  
- Graph rendering (100 nodes): < 500ms  
- Real-time update latency: < 100ms  
- Comparison query: < 3 seconds  
- Pattern search: < 1 second  
- Graph save operation: < 500ms  
- WebSocket message delivery: < 50ms  
  
## Example Use Case Implementation  
  
As a reference, the system should handle the complete "Consciousness is Not Material" philosophical argument use case:  
  
1. Accept vague initial input  
2. Conduct 3-4 turn clarification dialog  
3. Extract 8+ nodes and 8+ edges automatically  
4. Visualize in React Flow with proper layout  
5. Compare against Neo4j (47 matches), Vector DB (4 similar), and LLM (7 concepts)  
6. Display comparison with color-coded highlights  
7. Suggest 3 additional concepts (Hard Problem, Explanatory Gap, Physicalism)  
8. Allow user to edit and refine nodes/edges  
9. Generate causal chain visualization  
10. Store as reusable pattern  
11. Recommend 5 similar patterns with similarity scores  
12. Complete entire flow in ~20 minutes of user interaction  
  
This serves as the benchmark for system capability and user experience quality.
