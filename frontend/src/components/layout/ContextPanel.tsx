import { useState, useEffect, useRef } from 'react';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import { OntologyNode, OntologyEdge, NodeType, RelationType, Graph } from '@kgs/shared';
import { NODE_COLORS } from '../../utils/nodeColors';

const NODE_TYPES: NodeType[] = ['entity', 'event', 'process', 'attribute'];
const RELATION_TYPES: RelationType[] = ['is-a', 'part-of', 'causes', 'enables', 'requires', 'influences'];

export default function ContextPanel() {
  const { currentGraph, updateNode, updateEdge, deleteNode, deleteEdge, updateGraphDescription } = useGraph();
  const { selectedNodeId, selectedEdgeId, toggleContextPanel, clearSelection } = useUI();
  const [activeTab, setActiveTab] = useState<'properties' | 'notes'>('properties');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedNode = selectedNodeId
    ? currentGraph?.ontology_data.nodes.find((n: OntologyNode) => n.id === selectedNodeId)
    : null;

  const selectedEdge = selectedEdgeId
    ? currentGraph?.ontology_data.edges.find((e: OntologyEdge) => e.id === selectedEdgeId)
    : null;

  function handleNodeUpdate(field: keyof OntologyNode, value: any) {
    if (selectedNodeId) {
      updateNode(selectedNodeId, { [field]: value });
    }
  }

  function handleEdgeUpdate(field: keyof OntologyEdge, value: any) {
    if (selectedEdgeId) {
      updateEdge(selectedEdgeId, { [field]: value });
    }
  }

  function handleDelete() {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      clearSelection();
    } else if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
      clearSelection();
    }
    setShowDeleteConfirm(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        <button
          onClick={toggleContextPanel}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          title="Close Panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'properties'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Properties
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'notes'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Notes
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' ? (
          <>
            {selectedNode ? (
              <NodeProperties node={selectedNode} onUpdate={handleNodeUpdate} onDelete={() => setShowDeleteConfirm(true)} />
            ) : selectedEdge ? (
              <EdgeProperties
                edge={selectedEdge}
                nodes={currentGraph?.ontology_data.nodes || []}
                onUpdate={handleEdgeUpdate}
                onDelete={() => setShowDeleteConfirm(true)}
              />
            ) : currentGraph ? (
              <GraphNotesPanel
                graph={currentGraph}
                onUpdateDescription={updateGraphDescription}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No graph selected</p>
              </div>
            )}
          </>
        ) : (
          <NotesPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onNodeUpdate={handleNodeUpdate}
            onEdgeUpdate={handleEdgeUpdate}
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this {selectedNodeId ? 'node' : 'edge'}?
              {selectedNodeId && ' All connected edges will also be removed.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeProperties({
  node,
  onUpdate,
  onDelete,
}: {
  node: OntologyNode;
  onUpdate: (field: keyof OntologyNode, value: any) => void;
  onDelete: () => void;
}) {
  const colors = NODE_COLORS[node.type];

  return (
    <div className="space-y-4">
      {/* Header with Type Badge and Delete */}
      <div className="flex items-center justify-between">
        <div
          className="inline-block px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {node.type}
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Delete node"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
        <input
          type="text"
          value={node.label}
          onChange={(e) => onUpdate('label', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={node.type}
          onChange={(e) => onUpdate('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {NODE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Confidence */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confidence: {(node.confidence * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={node.confidence}
          onChange={(e) => onUpdate('confidence', parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <select
          value={node.source}
          onChange={(e) => onUpdate('source', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="user-stated">User Stated</option>
          <option value="inferred">Inferred</option>
        </select>
      </div>
    </div>
  );
}

function EdgeProperties({
  edge,
  nodes,
  onUpdate,
  onDelete,
}: {
  edge: OntologyEdge;
  nodes: OntologyNode[];
  onUpdate: (field: keyof OntologyEdge, value: any) => void;
  onDelete: () => void;
}) {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  return (
    <div className="space-y-4">
      {/* Header with Delete */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Edge Properties</h3>
        <button
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Delete edge"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Connection Info */}
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-700">{sourceNode?.label || 'Unknown'}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-medium text-gray-700">{targetNode?.label || 'Unknown'}</span>
        </div>
      </div>

      {/* Relation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
        <select
          value={edge.relation}
          onChange={(e) => onUpdate('relation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {RELATION_TYPES.map((rel) => (
            <option key={rel} value={rel}>
              {rel}
            </option>
          ))}
        </select>
      </div>

      {/* Strength */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Strength: {(edge.strength * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={edge.strength}
          onChange={(e) => onUpdate('strength', parseFloat(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {/* Temporal */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="temporal"
          checked={edge.temporal}
          onChange={(e) => onUpdate('temporal', e.target.checked)}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <label htmlFor="temporal" className="ml-2 text-sm text-gray-700">
          Temporal relationship
        </label>
      </div>
    </div>
  );
}

function NotesPanel({
  selectedNode,
  selectedEdge,
  onNodeUpdate,
  onEdgeUpdate,
}: {
  selectedNode: OntologyNode | null | undefined;
  selectedEdge: OntologyEdge | null | undefined;
  onNodeUpdate: (field: keyof OntologyNode, value: any) => void;
  onEdgeUpdate: (field: keyof OntologyEdge, value: any) => void;
}) {
  const item = selectedNode || selectedEdge;
  const isNode = !!selectedNode;
  const onUpdate = isNode ? onNodeUpdate : onEdgeUpdate;

  if (!item) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <p>Select a node or edge to add notes</p>
      </div>
    );
  }

  const notes = item.properties?.notes || '';
  const tags = item.properties?.tags || [];

  const handleNotesChange = (value: string) => {
    onUpdate('properties', { ...item.properties, notes: value });
  };

  const handleAddTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onUpdate('properties', { ...item.properties, tags: [...tags, tag] });
    }
  };

  const handleRemoveTag = (tag: string) => {
    onUpdate('properties', { ...item.properties, tags: tags.filter((t: string) => t !== tag) });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-2">
        Notes for: <span className="font-medium text-gray-900">{isNode ? (selectedNode as OntologyNode).label : 'Edge'}</span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes about this item..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add tag and press Enter"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement;
              handleAddTag(input.value.trim());
              input.value = '';
            }
          }}
        />
      </div>
    </div>
  );
}

function GraphNotesPanel({
  graph,
  onUpdateDescription,
}: {
  graph: Graph;
  onUpdateDescription: (description: string) => void;
}) {
  const [localDescription, setLocalDescription] = useState(graph.description || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when graph changes
  useEffect(() => {
    setLocalDescription(graph.description || '');
  }, [graph.id, graph.description]);

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);

    // Debounce the save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdateDescription(value);
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Graph Info Header */}
      <div className="bg-gradient-to-r from-primary/10 to-teal-50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{graph.title}</h3>
            <p className="text-sm text-gray-500">
              {graph.ontology_data.nodes.length} nodes · {graph.ontology_data.edges.length} edges
            </p>
          </div>
        </div>
      </div>

      {/* Graph Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{graph.ontology_data.nodes.length}</div>
          <div className="text-xs text-blue-600">Nodes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{graph.ontology_data.edges.length}</div>
          <div className="text-xs text-green-600">Edges</div>
        </div>
      </div>

      {/* Node Types Breakdown */}
      {graph.ontology_data.nodes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Node Types</label>
          <div className="space-y-1">
            {NODE_TYPES.map((type) => {
              const count = graph.ontology_data.nodes.filter((n) => n.type === type).length;
              if (count === 0) return null;
              const colors = NODE_COLORS[type];
              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: colors.bg }}
                    />
                    <span className="capitalize">{type}</span>
                  </div>
                  <span className="text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graph Notes/Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Graph Notes
        </label>
        <textarea
          value={localDescription}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add notes about this graph..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px] resize-y text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Auto-saved as you type</p>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
        <div className="flex justify-between">
          <span>Version</span>
          <span>{graph.version}</span>
        </div>
        <div className="flex justify-between">
          <span>Created</span>
          <span>{new Date(graph.created_at * 1000).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span>{new Date(graph.updated_at * 1000).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
