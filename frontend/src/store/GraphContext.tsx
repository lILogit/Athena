import { ReactNode } from 'react';
import { create } from 'zustand';
import { Graph, OntologyData, OntologyNode, OntologyEdge } from '@kgs/shared';
import { api } from '../services/api';

interface GraphState {
  currentGraph: Graph | null;
  graphs: Graph[];
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentGraph: (graph: Graph | null) => void;
  loadGraph: (id: number) => Promise<void>;
  loadGraphs: (projectId?: number) => Promise<void>;
  createGraph: (projectId: number, title: string, description?: string) => Promise<Graph>;
  updateGraph: (id: number, ontologyData: OntologyData) => Promise<void>;
  updateNode: (nodeId: string, updates: Partial<OntologyNode>) => void;
  updateEdge: (edgeId: string, updates: Partial<OntologyEdge>) => void;
  addNode: (node: OntologyNode) => void;
  addEdge: (edge: OntologyEdge) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
}

const useGraphStore = create<GraphState>((set, get) => ({
  currentGraph: null,
  graphs: [],
  loading: false,
  error: null,

  setCurrentGraph: (graph) => set({ currentGraph: graph }),

  loadGraph: async (id) => {
    set({ loading: true, error: null });
    try {
      const { graph } = await api.getGraph(id);
      set({ currentGraph: graph, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  loadGraphs: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { graphs } = await api.getGraphs(projectId);
      set({ graphs, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createGraph: async (projectId, title, description) => {
    set({ loading: true, error: null });
    try {
      const { graph } = await api.createGraph({
        project_id: projectId,
        title,
        description,
        ontology_data: { nodes: [], edges: [] },
      });
      set((state) => ({
        graphs: [graph, ...state.graphs],
        currentGraph: graph,
        loading: false,
      }));
      return graph;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateGraph: async (id, ontologyData) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    try {
      const { graph } = await api.updateGraph(id, { ontology_data: ontologyData });
      set({ currentGraph: graph });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateNode: (nodeId, updates) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const updatedNodes = currentGraph.ontology_data.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...updates } : node
    );

    const newOntologyData = {
      ...currentGraph.ontology_data,
      nodes: updatedNodes,
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  updateEdge: (edgeId, updates) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const updatedEdges = currentGraph.ontology_data.edges.map((edge) =>
      edge.id === edgeId ? { ...edge, ...updates } : edge
    );

    const newOntologyData = {
      ...currentGraph.ontology_data,
      edges: updatedEdges,
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  addNode: (node) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newOntologyData = {
      ...currentGraph.ontology_data,
      nodes: [...currentGraph.ontology_data.nodes, node],
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  addEdge: (edge) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newOntologyData = {
      ...currentGraph.ontology_data,
      edges: [...currentGraph.ontology_data.edges, edge],
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  deleteNode: (nodeId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newOntologyData = {
      nodes: currentGraph.ontology_data.nodes.filter((node) => node.id !== nodeId),
      edges: currentGraph.ontology_data.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  deleteEdge: (edgeId) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    const newOntologyData = {
      ...currentGraph.ontology_data,
      edges: currentGraph.ontology_data.edges.filter((edge) => edge.id !== edgeId),
    };

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },
}));

// Export the hook directly instead of using context
export function useGraph() {
  return useGraphStore();
}

export default function GraphProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
