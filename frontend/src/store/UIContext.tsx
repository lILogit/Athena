import { ReactNode } from 'react';
import { create } from 'zustand';
import { GraphArchetype } from '@kgs/shared';

interface UIState {
  sidebarOpen: boolean;
  contextPanelOpen: boolean;
  clarificationDialogOpen: boolean;
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-select support
  selectedEdgeId: string | null;

  // Enrichment mode - adds entities to existing graph
  enrichmentMode: boolean;
  enrichGraphId: number | null;

  // Archetype selection
  selectedArchetype: GraphArchetype;
  archetypeSelectionPhase: boolean; // Show archetype selector before clarification

  // Actions
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
  toggleClarificationDialog: () => void;
  openClarificationDialog: () => void;
  openEnrichmentDialog: (graphId: number) => void;
  closeClarificationDialog: () => void;
  selectNode: (nodeId: string | null) => void;
  selectNodes: (nodeIds: string[]) => void; // Multi-select
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  setSelectedArchetype: (archetype: GraphArchetype) => void;
  startClarificationPhase: () => void; // Move from archetype selection to clarification
}

const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  contextPanelOpen: true,
  clarificationDialogOpen: false,
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeId: null,
  enrichmentMode: false,
  enrichGraphId: null,
  selectedArchetype: 'general',
  archetypeSelectionPhase: true,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
  toggleClarificationDialog: () =>
    set((state) => ({ clarificationDialogOpen: !state.clarificationDialogOpen })),
  openClarificationDialog: () => set({
    clarificationDialogOpen: true,
    enrichmentMode: false,
    enrichGraphId: null,
    archetypeSelectionPhase: true,
    selectedArchetype: 'general',
  }),
  openEnrichmentDialog: (graphId: number) => set({
    clarificationDialogOpen: true,
    enrichmentMode: true,
    enrichGraphId: graphId,
    archetypeSelectionPhase: false, // Skip archetype selection for enrichment
  }),
  closeClarificationDialog: () => set({
    clarificationDialogOpen: false,
    enrichmentMode: false,
    enrichGraphId: null,
    archetypeSelectionPhase: true,
    selectedArchetype: 'general',
  }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedNodeIds: nodeId ? [nodeId] : [], selectedEdgeId: null }),
  selectNodes: (nodeIds) => set({ selectedNodeIds: nodeIds, selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null, selectedNodeIds: [] }),
  clearSelection: () => set({ selectedNodeId: null, selectedNodeIds: [], selectedEdgeId: null }),
  setSelectedArchetype: (archetype) => set({ selectedArchetype: archetype }),
  startClarificationPhase: () => set({ archetypeSelectionPhase: false }),
}));

// Export the hook directly instead of using context
export function useUI() {
  return useUIStore();
}

export default function UIProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
