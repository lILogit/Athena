import { ReactNode } from 'react';
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  contextPanelOpen: boolean;
  clarificationDialogOpen: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Actions
  toggleSidebar: () => void;
  toggleContextPanel: () => void;
  toggleClarificationDialog: () => void;
  openClarificationDialog: () => void;
  closeClarificationDialog: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
}

const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  contextPanelOpen: true,
  clarificationDialogOpen: false,
  selectedNodeId: null,
  selectedEdgeId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleContextPanel: () => set((state) => ({ contextPanelOpen: !state.contextPanelOpen })),
  toggleClarificationDialog: () =>
    set((state) => ({ clarificationDialogOpen: !state.clarificationDialogOpen })),
  openClarificationDialog: () => set({ clarificationDialogOpen: true }),
  closeClarificationDialog: () => set({ clarificationDialogOpen: false }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
}));

// Export the hook directly instead of using context
export function useUI() {
  return useUIStore();
}

export default function UIProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
