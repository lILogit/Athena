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

  // Selected project for creating graphs
  selectedProjectId: number | null;

  // Archetype selection
  selectedArchetype: GraphArchetype;
  archetypeSelectionPhase: boolean; // Show archetype selector before clarification

  // Chat and History
  chatWindowOpen: boolean;
  historyViewerOpen: boolean;

  // Focus+Context state
  focusNodeId: string | null;          // Currently focused node
  outRadius: number;                   // Hops outward (1-5, default 2)
  inRadius: number;                    // Hops inward (1-5, default 2)
  detailLevel: number;                 // 0-1 slider (default 0.5)

  // Actions
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
  toggleClarificationDialog: () => void;
  openClarificationDialog: (projectId: number) => void;
  openEnrichmentDialog: (graphId: number) => void;
  closeClarificationDialog: () => void;
  setSelectedProjectId: (projectId: number) => void;
  selectNode: (nodeId: string | null) => void;
  selectNodes: (nodeIds: string[]) => void; // Multi-select
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  setSelectedArchetype: (archetype: GraphArchetype) => void;
  startClarificationPhase: () => void; // Move from archetype selection to clarification
  toggleChatWindow: () => void;
  toggleHistoryViewer: () => void;
  openChatWindow: () => void;
  closeChatWindow: () => void;
  openHistoryViewer: () => void;
  closeHistoryViewer: () => void;

  // Focus+Context actions
  setFocusNode: (nodeId: string | null) => void;
  setOutRadius: (radius: number) => void;
  setInRadius: (radius: number) => void;
  setDetailLevel: (level: number) => void;
  clearFocus: () => void;
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
  selectedProjectId: null,
  selectedArchetype: 'general',
  archetypeSelectionPhase: true,
  chatWindowOpen: false,
  historyViewerOpen: false,

  // Focus+Context defaults
  focusNodeId: null,
  outRadius: 2,
  inRadius: 2,
  detailLevel: 0.5,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
  toggleClarificationDialog: () =>
    set((state) => ({ clarificationDialogOpen: !state.clarificationDialogOpen })),
  openClarificationDialog: (projectId: number) => set({
    clarificationDialogOpen: true,
    enrichmentMode: false,
    enrichGraphId: null,
    selectedProjectId: projectId,
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
  setSelectedProjectId: (projectId: number) => set({ selectedProjectId: projectId }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedNodeIds: nodeId ? [nodeId] : [], selectedEdgeId: null }),
  selectNodes: (nodeIds) => set({ selectedNodeIds: nodeIds, selectedNodeId: nodeIds.length === 1 ? nodeIds[0] : null, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null, selectedNodeIds: [] }),
  clearSelection: () => set({ selectedNodeId: null, selectedNodeIds: [], selectedEdgeId: null }),
  setSelectedArchetype: (archetype) => set({ selectedArchetype: archetype }),
  startClarificationPhase: () => set({ archetypeSelectionPhase: false }),
  toggleChatWindow: () => set((state) => ({ chatWindowOpen: !state.chatWindowOpen })),
  toggleHistoryViewer: () => set((state) => ({ historyViewerOpen: !state.historyViewerOpen })),
  openChatWindow: () => set({ chatWindowOpen: true }),
  closeChatWindow: () => set({ chatWindowOpen: false }),
  openHistoryViewer: () => set({ historyViewerOpen: true }),
  closeHistoryViewer: () => set({ historyViewerOpen: false }),

  // Focus+Context actions
  setFocusNode: (nodeId) => set({ focusNodeId: nodeId }),
  setOutRadius: (radius) => set({ outRadius: Math.max(1, Math.min(5, radius)) }),
  setInRadius: (radius) => set({ inRadius: Math.max(1, Math.min(5, radius)) }),
  setDetailLevel: (level) => set({ detailLevel: Math.max(0, Math.min(1, level)) }),
  clearFocus: () => set({ focusNodeId: null }),
}));

// Export the hook directly instead of using context
export function useUI() {
  return useUIStore();
}

export default function UIProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
