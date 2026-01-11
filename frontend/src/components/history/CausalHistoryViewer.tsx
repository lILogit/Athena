import React, { useState, useEffect, useMemo } from 'react';
import {
  GraphChangeHistory,
  CausalHistoryTree,
  NextStepRecommendation,
  AIModel,
} from '@kgs/shared';
import { api } from '../../services/api';
import { useGraph } from '../../store/GraphContext';

interface CausalHistoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'timeline' | 'causal' | 'recommendations';

const CHANGE_TYPE_ICONS: Record<string, string> = {
  node_added: '+',
  node_updated: '~',
  node_deleted: '-',
  edge_added: '→+',
  edge_updated: '→~',
  edge_deleted: '→-',
  layout_changed: '⊞',
  archetype_changed: '◆',
  batch_update: '⊕',
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  node_added: 'bg-green-500',
  node_updated: 'bg-blue-500',
  node_deleted: 'bg-red-500',
  edge_added: 'bg-emerald-500',
  edge_updated: 'bg-cyan-500',
  edge_deleted: 'bg-orange-500',
  layout_changed: 'bg-purple-500',
  archetype_changed: 'bg-amber-500',
  batch_update: 'bg-indigo-500',
};

export const CausalHistoryViewer: React.FC<CausalHistoryViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentGraph } = useGraph();
  const [history, setHistory] = useState<GraphChangeHistory | null>(null);
  const [causalTree, setCausalTree] = useState<CausalHistoryTree | null>(null);
  const [recommendations, setRecommendations] = useState<NextStepRecommendation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-sonnet');

  useEffect(() => {
    if (isOpen && currentGraph) {
      loadHistory();
    }
  }, [isOpen, currentGraph?.id]);

  const loadHistory = async () => {
    if (!currentGraph) return;

    setIsLoading(true);
    try {
      const [historyResult, causalResult] = await Promise.all([
        api.getGraphHistory(currentGraph.id),
        api.getCausalHistory(currentGraph.id),
      ]);
      setHistory(historyResult.history);
      setCausalTree(causalResult.tree);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!currentGraph) return;

    setIsLoadingRecs(true);
    try {
      const result = await api.getRecommendations(currentGraph.id, selectedModel);
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderCausalNode = (nodeId: string, depth: number = 0): React.ReactNode => {
    if (!causalTree) return null;
    const node = causalTree.nodes[nodeId];
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(nodeId);

    return (
      <div key={nodeId} className="relative">
        <div
          className={`flex items-start gap-2 p-2 rounded-lg hover:bg-slate-700/50 cursor-pointer transition-colors ${
            depth > 0 ? 'ml-6 border-l border-slate-700 pl-4' : ''
          }`}
          onClick={() => hasChildren && toggleExpanded(nodeId)}
        >
          {hasChildren && (
            <button className="mt-1 p-0.5 text-slate-400 hover:text-white">
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div
            className={`w-6 h-6 rounded-full ${
              CHANGE_TYPE_COLORS[node.change.changeType] || 'bg-slate-500'
            } flex items-center justify-center text-xs text-white font-bold flex-shrink-0`}
          >
            {CHANGE_TYPE_ICONS[node.change.changeType] || '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm text-white">{node.change.description}</div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>{formatRelativeTime(node.change.timestamp)}</span>
              {hasChildren && (
                <span className="text-purple-400">
                  {node.children.length} follow-up{node.children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">{node.children.map((childId) => renderCausalNode(childId, depth + 1))}</div>
        )}
      </div>
    );
  };

  const timelineSortedChanges = useMemo(() => {
    if (!history) return [];
    return [...history.changes].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-4 right-4 w-[400px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div>
          <h3 className="text-lg font-semibold text-white">Graph History</h3>
          {currentGraph && (
            <p className="text-xs text-slate-400">{currentGraph.title}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex border-b border-slate-700">
        {(['timeline', 'causal', 'recommendations'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              if (mode === 'recommendations' && recommendations.length === 0) {
                loadRecommendations();
              }
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            {mode === 'timeline' && 'Timeline'}
            {mode === 'causal' && 'Causal'}
            {mode === 'recommendations' && 'AI Tips'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div className="space-y-2">
            {timelineSortedChanges.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No changes recorded yet</p>
                <p className="text-xs mt-1">Start editing your graph to see history</p>
              </div>
            ) : (
              timelineSortedChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full ${
                      CHANGE_TYPE_COLORS[change.changeType] || 'bg-slate-500'
                    } flex items-center justify-center text-sm text-white font-bold flex-shrink-0`}
                  >
                    {CHANGE_TYPE_ICONS[change.changeType] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{change.description}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatTimestamp(change.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : viewMode === 'causal' ? (
          /* Causal Tree View */
          <div>
            {!causalTree || causalTree.rootNodes.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No causal chains found</p>
                <p className="text-xs mt-1">Changes linked by cause-effect will appear here</p>
              </div>
            ) : (
              <div className="space-y-1">
                {causalTree.rootNodes.map((rootId) => renderCausalNode(rootId))}
              </div>
            )}
          </div>
        ) : (
          /* Recommendations View */
          <div className="space-y-4">
            {/* Model Selection */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as AIModel)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="claude-haiku">Claude Haiku (Fast)</option>
                <option value="claude-sonnet">Claude Sonnet (Balanced)</option>
                <option value="claude-opus">Claude Opus (Best)</option>
              </select>
              <button
                onClick={loadRecommendations}
                disabled={isLoadingRecs}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white text-sm rounded-lg transition-colors"
              >
                {isLoadingRecs ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {isLoadingRecs ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p>Click "Refresh" for AI suggestions</p>
                <p className="text-xs mt-1">Based on your graph structure and history</p>
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        rec.confidence >= 0.8
                          ? 'bg-green-500/20 text-green-400'
                          : rec.confidence >= 0.5
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-slate-600/20 text-slate-400'
                      }`}
                    >
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mb-2">{rec.description}</p>
                  <div className="text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                    <strong className="text-slate-300">Why:</strong> {rec.reasoning}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        rec.type === 'add_node'
                          ? 'bg-green-500/20 text-green-400'
                          : rec.type === 'add_edge'
                          ? 'bg-blue-500/20 text-blue-400'
                          : rec.type === 'refine_node'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {rec.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Patterns Summary (Timeline View) */}
      {viewMode === 'timeline' && history && history.patterns && history.patterns.length > 0 && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Detected Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {history.patterns.slice(0, 3).map((pattern) => (
              <span
                key={pattern.id}
                className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                title={pattern.description}
              >
                {pattern.name} ({pattern.frequency}x)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CausalHistoryViewer;
