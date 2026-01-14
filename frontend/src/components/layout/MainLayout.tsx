import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import GraphCanvas from '../graph/GraphCanvas';
import ContextPanel from './ContextPanel';
import ClarificationDialog from '../dialog/ClarificationDialog';
import AIChatWindow from '../chat/AIChatWindow';
import CausalHistoryViewer from '../history/CausalHistoryViewer';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';

export default function MainLayout() {
  const { id } = useParams<{ id: string }>();
  const { loadGraph, loadGraphs } = useGraph();
  const {
    sidebarOpen,
    contextPanelOpen,
    toggleSidebar,
    chatWindowOpen,
    historyViewerOpen,
    closeChatWindow,
    closeHistoryViewer,
  } = useUI();

  useEffect(() => {
    // Load graphs on mount
    loadGraphs();

    // Load specific graph if ID is provided
    if (id) {
      loadGraph(parseInt(id));
    }
  }, [id]);

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out bg-white border-r border-gray-200 ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        <Sidebar />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded hover:bg-gray-100 transition-colors"
              title="Toggle Sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Knowledge Graph System</h1>
          </div>

        </header>

        {/* Graph Canvas - overflow-visible allows toolbar to extend into header */}
        <div className="flex-1 relative overflow-visible">
          <GraphCanvas />
        </div>
      </div>

      {/* Context Panel */}
      <div
        className={`transition-all duration-300 ease-in-out bg-white border-l border-gray-200 ${
          contextPanelOpen ? 'w-96' : 'w-0'
        } overflow-hidden`}
      >
        <ContextPanel />
      </div>

      {/* Clarification Dialog */}
      <ClarificationDialog />

      {/* AI Chat Window */}
      <AIChatWindow isOpen={chatWindowOpen} onClose={closeChatWindow} />

      {/* Causal History Viewer */}
      <CausalHistoryViewer isOpen={historyViewerOpen} onClose={closeHistoryViewer} />
    </div>
  );
}
