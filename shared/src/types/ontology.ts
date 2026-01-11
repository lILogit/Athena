/**
 * Core ontology type definitions shared between frontend and backend
 */

export type NodeType = 'entity' | 'event' | 'process' | 'attribute';
export type RelationType = 'is-a' | 'part-of' | 'causes' | 'enables' | 'requires' | 'influences';
export type SourceType = 'user-stated' | 'inferred';

// Graph Archetype types
export type GraphArchetype = 'general' | 'knowledge-mining' | 'explanation';

// Extended node types for specific archetypes
export type ExtendedNodeType = NodeType | 'cluster' | 'pattern' | 'mechanism' | 'example' | 'analogy' | 'prerequisite';

// Extended relation types for specific archetypes
export type ExtendedRelationType = RelationType | 'similar-to' | 'clusters-with' | 'explains' | 'exemplifies' | 'analogous-to' | 'prerequisite-for';

// Archetype-specific metadata for nodes
export interface ArchetypeNodeMetadata {
  // Knowledge Mining specific
  clusterLabel?: string;
  domain?: string;
  connectionCount?: number;

  // Explanation specific
  explanationLayer?: number; // 0 = central phenomenon, 1 = direct causes, etc.
  complexityLevel?: number; // 1-5, used for complexity slider filtering
}

// Archetype-specific metadata for edges
export interface ArchetypeEdgeMetadata {
  // Knowledge Mining specific
  similarityScore?: number; // 0-1, affects edge thickness
  isInferred?: boolean;

  // Explanation specific
  explanationType?: 'causal' | 'compositional' | 'analogical';
}

// Layout preferences per archetype
export interface LayoutPreferences {
  algorithm: string;
  parameters?: Record<string, any>;
}

// Archetype configuration stored with graph
export interface ArchetypeConfig {
  archetype: GraphArchetype;
  layoutPreferences: LayoutPreferences;
  displayOptions: {
    // Explanation graph specific
    complexityLevel?: number; // 1-5, controls layer visibility
    showAnalogies?: boolean;
    showExamples?: boolean;

    // Knowledge Mining specific
    showClusters?: boolean;
    showInferredEdges?: boolean;
    minSimilarityThreshold?: number; // Filter edges below threshold
  };
}

export interface OntologyNode {
  id: string;
  label: string;
  type: NodeType;
  extendedType?: ExtendedNodeType; // Archetype-specific type (e.g., 'mechanism', 'cluster')
  properties: Record<string, any>;
  confidence: number; // 0-1
  source: SourceType;
  archetypeMetadata?: ArchetypeNodeMetadata;
}

export interface OntologyEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  sourceHandle?: string; // handle id for connection point
  targetHandle?: string; // handle id for connection point
  relation: RelationType;
  extendedRelation?: ExtendedRelationType; // Archetype-specific relation
  strength: number; // 0-1
  temporal: boolean;
  properties: Record<string, any>;
  archetypeMetadata?: ArchetypeEdgeMetadata;
}

export interface OntologyData {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

export interface Graph {
  id: number;
  project_id: number;
  user_id: number;
  title: string;
  description: string | null;
  archetype: GraphArchetype; // defaults to 'general'
  archetypeConfig?: ArchetypeConfig;
  ontology_data: OntologyData;
  version: number;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  is_archived: boolean;
}

export interface GraphVersion {
  id: number;
  graph_id: number;
  version: number;
  ontology_data: OntologyData;
  change_description: string | null;
  created_by: number;
  created_at: number;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  domain: string | null;
  created_at: number;
  updated_at: number;
  is_public: boolean;
}

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  created_at: number;
  last_login: number | null;
  preferences: Record<string, any>;
  reputation_score: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ExtractedEntity {
  label: string;
  type: NodeType;
  confidence: number;
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  relation: RelationType;
  confidence: number;
}

export interface ClarificationState {
  messages: Message[];
  extractedEntities: ExtractedEntity[];
  extractedRelationships: ExtractedRelationship[];
}

export interface Session {
  id: number;
  user_id: number;
  graph_id: number | null;
  clarification_state: ClarificationState;
  created_at: number;
  updated_at: number;
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// API Request types
export interface CreateGraphRequest {
  project_id: number;
  title: string;
  description?: string;
  archetype?: GraphArchetype; // defaults to 'general'
  archetypeConfig?: ArchetypeConfig;
  ontology_data?: OntologyData;
}

export interface UpdateGraphRequest {
  title?: string;
  description?: string;
  archetype?: GraphArchetype;
  archetypeConfig?: ArchetypeConfig;
  ontology_data?: OntologyData;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  domain?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  domain?: string;
}

export interface EnrichmentContext {
  graph_id: number;
  existing_nodes: string[];
  existing_edges: Array<{
    source: string | undefined;
    target: string | undefined;
    relation: string;
  }>;
}

export interface StartClarificationRequest {
  initial_input: string;
  project_id: number;
  enrichment_context?: EnrichmentContext;
}

export interface ClarificationMessageRequest {
  session_id: number;
  message: string;
}

export interface FinalizeClarificationRequest {
  session_id: number;
  title?: string;
  archetype?: GraphArchetype; // Graph archetype type
  archetypeConfig?: ArchetypeConfig; // Archetype-specific configuration
  enrich_graph_id?: number; // If provided, merge into existing graph instead of creating new
}

export interface ConvertTextRequest {
  text: string;
}

export interface ExtractEntitiesRequest {
  text: string;
}

// WebSocket event payloads
export interface GraphUpdateEvent {
  graph_id: number;
  user_id: number;
  ontology_data: OntologyData;
  timestamp: number;
}

export interface NodeUpdateEvent {
  graph_id: number;
  user_id: number;
  node: OntologyNode;
  timestamp: number;
}

export interface EdgeUpdateEvent {
  graph_id: number;
  user_id: number;
  edge: OntologyEdge;
  timestamp: number;
}

// SSE stream event types
export interface SSETokenEvent {
  type: 'token';
  content: string;
}

export interface SSEEntitiesEvent {
  type: 'entities';
  entities: ExtractedEntity[];
}

export interface SSERelationshipsEvent {
  type: 'relationships';
  relationships: ExtractedRelationship[];
}

export interface SSEDoneEvent {
  type: 'done';
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export type SSEEvent = SSETokenEvent | SSEEntitiesEvent | SSERelationshipsEvent | SSEDoneEvent | SSEErrorEvent;
