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
} from '@kgs/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
}

export const api = new ApiService();
