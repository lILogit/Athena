import { ReactNode } from 'react';
import { create } from 'zustand';
import { Graph, OntologyData, OntologyNode, OntologyEdge } from '@kgs/shared';
import { api } from '../services/api';

const MAX_HISTORY_SIZE = 50;

interface GraphState {
  currentGraph: Graph | null;
  graphs: Graph[];
  loading: boolean;
  error: string | null;

  // History for undo/redo
  history: OntologyData[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  setCurrentGraph: (graph: Graph | null) => void;
  loadGraph: (id: number) => Promise<void>;
  loadGraphs: (projectId?: number) => Promise<void>;
  createGraph: (projectId: number, title: string, description?: string) => Promise<Graph>;
  updateGraph: (id: number, ontologyData: OntologyData) => Promise<void>;
  updateGraphDescription: (description: string) => void;
  updateNode: (nodeId: string, updates: Partial<OntologyNode>) => void;
  updateEdge: (edgeId: string, updates: Partial<OntologyEdge>) => void;
  addNode: (node: OntologyNode) => void;
  addEdge: (edge: OntologyEdge) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  deleteGraph: (graphId: number) => Promise<void>;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

// Helper to deep clone ontology data
function cloneOntologyData(data: OntologyData): OntologyData {
  return JSON.parse(JSON.stringify(data));
}

const useGraphStore = create<GraphState>((set, get) => ({
  currentGraph: null,
  graphs: [],
  loading: false,
  error: null,

  // History state
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  setCurrentGraph: (graph) => {
    // Reset history when loading a new graph
    set({
      currentGraph: graph,
      history: graph ? [cloneOntologyData(graph.ontology_data)] : [],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
    });
  },

  loadGraph: async (id) => {
    set({ loading: true, error: null });
    try {
      const { graph } = await api.getGraph(id);
      set({
        currentGraph: graph,
        loading: false,
        history: [cloneOntologyData(graph.ontology_data)],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
      });
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
        history: [cloneOntologyData(graph.ontology_data)],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
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

  updateGraphDescription: (description) => {
    const { currentGraph } = get();
    if (!currentGraph) return;

    // Update local state immediately
    set({
      currentGraph: {
        ...currentGraph,
        description,
      },
    });

    // Save to server (debounced in component)
    api.updateGraph(currentGraph.id, { description }).catch((error: any) => {
      set({ error: error.message });
    });
  },

  // Helper to push current state to history before making changes
  _pushToHistory: (newOntologyData: OntologyData) => {
    const { history, historyIndex } = get();

    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);

    // Add the new state
    newHistory.push(cloneOntologyData(newOntologyData));

    // Limit history size
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }

    const newIndex = newHistory.length - 1;

    set({
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    });
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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

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

    // Push to history
    (get() as any)._pushToHistory(newOntologyData);

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: newOntologyData,
      },
    });
  },

  deleteGraph: async (graphId) => {
    const { currentGraph, graphs } = get();

    try {
      await api.deleteGraph(graphId);

      // Remove from graphs list
      const updatedGraphs = graphs.filter((g) => g.id !== graphId);

      // Clear current graph if it was the deleted one
      const newCurrentGraph = currentGraph?.id === graphId ? null : currentGraph;

      set({
        graphs: updatedGraphs,
        currentGraph: newCurrentGraph,
        history: newCurrentGraph ? [cloneOntologyData(newCurrentGraph.ontology_data)] : [],
        historyIndex: 0,
        canUndo: false,
        canRedo: false,
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  undo: () => {
    const { currentGraph, history, historyIndex } = get();
    if (!currentGraph || historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const previousState = cloneOntologyData(history[newIndex]);

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: previousState,
      },
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { currentGraph, history, historyIndex } = get();
    if (!currentGraph || historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextState = cloneOntologyData(history[newIndex]);

    set({
      currentGraph: {
        ...currentGraph,
        ontology_data: nextState,
      },
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    });
  },

  clearHistory: () => {
    const { currentGraph } = get();
    set({
      history: currentGraph ? [cloneOntologyData(currentGraph.ontology_data)] : [],
      historyIndex: 0,
      canUndo: false,
      canRedo: false,
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
