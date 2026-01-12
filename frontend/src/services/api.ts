import {
  ApiResponse,
  Graph,
  Project,
  Session,
  OntologyData,
  CreateGraphRequest,
  UpdateGraphRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  StartClarificationRequest,
  FinalizeClarificationRequest,
  ConvertTextRequest,
  GraphArchetype,
  ExtendedNodeType,
  ExtendedRelationType,
  AIModel,
  ChatSession,
  ChatRequest,
  ChatResponse,
  GraphChangeHistory,
  CausalHistoryTree,
  NextStepRecommendation,
} from '@kgs/shared';

// Suggestion types
export interface NodeSuggestion {
  label: string;
  type: ExtendedNodeType;
  description: string;
  confidence: number;
}

export interface EdgeSuggestion {
  sourceLabel: string;
  targetLabel: string;
  relation: ExtendedRelationType;
  description: string;
}

export interface ArchetypeSuggestions {
  nodes: NodeSuggestion[];
  edges: EdgeSuggestion[];
  insights: string[];
}

export interface QuickNodeType {
  type: ExtendedNodeType;
  label: string;
  icon: string;
}

export interface QuickEdgeType {
  type: ExtendedRelationType;
  label: string;
}

// In production, use relative URLs (empty string) since frontend is served by backend
// In development, default to localhost:3000
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3000');

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiResponse = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    const data: ApiResponse<T> = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.data as T;
  }

  // Graphs
  async getGraphs(projectId?: number): Promise<{ graphs: Graph[] }> {
    const query = projectId ? `?project_id=${projectId}` : '';
    return this.request<{ graphs: Graph[] }>(`/api/graphs${query}`);
  }

  async getGraph(id: number): Promise<{ graph: Graph }> {
    return this.request<{ graph: Graph }>(`/api/graphs/${id}`);
  }

  async createGraph(data: CreateGraphRequest): Promise<{ graph: Graph }> {
    return this.request<{ graph: Graph }>('/api/graphs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGraph(id: number, data: UpdateGraphRequest): Promise<{ graph: Graph }> {
    return this.request<{ graph: Graph }>(`/api/graphs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGraph(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/graphs/${id}`, {
      method: 'DELETE',
    });
  }

  // Projects
  async getProjects(): Promise<{ projects: Project[] }> {
    return this.request<{ projects: Project[] }>('/api/projects');
  }

  async getProject(id: number): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/api/projects/${id}`);
  }

  async createProject(data: CreateProjectRequest): Promise<{ project: Project }> {
    return this.request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: number, data: UpdateProjectRequest): Promise<{ project: Project }> {
    return this.request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Clarification
  async startClarification(data: StartClarificationRequest): Promise<{
    session_id: number;
    ai_response: string;
    extracted_entities: any[];
  }> {
    return this.request('/api/clarify/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async finalizeClarification(data: FinalizeClarificationRequest): Promise<{ graph?: Graph; ontology?: OntologyData }> {
    return this.request<{ graph?: Graph; ontology?: OntologyData }>('/api/clarify/finalize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSession(id: number): Promise<{ session: Session }> {
    return this.request<{ session: Session }>(`/api/clarify/session/${id}`);
  }

  // Ontology
  async convertText(data: ConvertTextRequest): Promise<any> {
    return this.request('/api/ontology/convert', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.request<{ status: string; timestamp: number }>('/api/health');
  }

  // Causal chain analysis
  async analyzeCausalChains(data: {
    nodes: string[];
    edges: Array<{ source: string; target: string; relation: string }>;
    focus_node?: string;
  }): Promise<{
    chains: Array<{
      nodes: string[];
      relations: string[];
      description?: string;
    }>;
  }> {
    return this.request('/api/ontology/causal-chains', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Suggestions
  async getGraphSuggestions(graphId: number, context?: string): Promise<{ suggestions: ArchetypeSuggestions }> {
    return this.request('/api/suggestions/graph/' + graphId, {
      method: 'POST',
      body: JSON.stringify({ context }),
    });
  }

  async getNodeTypes(archetype: GraphArchetype): Promise<{ nodeTypes: QuickNodeType[] }> {
    return this.request(`/api/suggestions/node-types/${archetype}`);
  }

  async getEdgeTypes(archetype: GraphArchetype): Promise<{ edgeTypes: QuickEdgeType[] }> {
    return this.request(`/api/suggestions/edge-types/${archetype}`);
  }

  // Chat
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getChatSessions(): Promise<{ sessions: ChatSession[] }> {
    return this.request<{ sessions: ChatSession[] }>('/api/chat/sessions');
  }

  async getChatSession(sessionId: string): Promise<{ session: ChatSession }> {
    return this.request<{ session: ChatSession }>(`/api/chat/sessions/${sessionId}`);
  }

  async deleteChatSession(sessionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Graph History
  async getGraphHistory(graphId: number): Promise<{ history: GraphChangeHistory }> {
    return this.request<{ history: GraphChangeHistory }>(`/api/chat/history/${graphId}`);
  }

  async getCausalHistory(graphId: number): Promise<{ tree: CausalHistoryTree }> {
    return this.request<{ tree: CausalHistoryTree }>(`/api/chat/history/${graphId}/causal`);
  }

  async getRecommendations(graphId: number, model?: AIModel): Promise<{ recommendations: NextStepRecommendation[] }> {
    return this.request<{ recommendations: NextStepRecommendation[] }>(`/api/chat/recommendations/${graphId}`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    });
  }

  // Streaming chat (returns EventSource for SSE)
  streamChatMessage(request: ChatRequest): EventSource {
    const params = new URLSearchParams();
    params.set('message', request.message);
    params.set('model', request.model || 'claude-sonnet');
    if (request.graphId) params.set('graphId', request.graphId.toString());
    if (request.sessionId) params.set('sessionId', request.sessionId);

    // For SSE, we need to POST but use fetch with response.body
    // Create a custom stream handler
    return new EventSource(`${API_URL}/api/chat/stream?${params.toString()}`);
  }
}

export const api = new ApiService();
