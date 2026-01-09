import { useState } from 'react';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import { OntologyNode, OntologyEdge } from '@kgs/shared';
import { NODE_COLORS } from '../../utils/nodeColors';

export default function ContextPanel() {
  const { currentGraph, updateNode, updateEdge } = useGraph();
  const { selectedNodeId, selectedEdgeId, toggleContextPanel } = useUI();
  const [activeTab, setActiveTab] = useState<'properties' | 'insights'>('properties');

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
          onClick={() => setActiveTab('insights')}
          className={`flex-1 px-4 py-3 font-medium transition-colors ${
            activeTab === 'insights'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Insights
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'properties' ? (
          <>
            {selectedNode ? (
              <NodeProperties node={selectedNode} onUpdate={handleNodeUpdate} />
            ) : selectedEdge ? (
              <EdgeProperties edge={selectedEdge} onUpdate={handleEdgeUpdate} />
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
                <p>Select a node or edge to view properties</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Insights will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeProperties({
  node,
  onUpdate,
}: {
  node: OntologyNode;
  onUpdate: (field: keyof OntologyNode, value: any) => void;
}) {
  const colors = NODE_COLORS[node.type];

  return (
    <div className="space-y-4">
      {/* Node Type Badge */}
      <div
        className="inline-block px-3 py-1 rounded-full text-sm font-medium"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {node.type}
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
          <option value="entity">Entity</option>
          <option value="event">Event</option>
          <option value="process">Process</option>
          <option value="attribute">Attribute</option>
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
          className="w-full"
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
  onUpdate,
}: {
  edge: OntologyEdge;
  onUpdate: (field: keyof OntologyEdge, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Edge Properties</h3>

      {/* Relation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
        <select
          value={edge.relation}
          onChange={(e) => onUpdate('relation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="is-a">is-a</option>
          <option value="part-of">part-of</option>
          <option value="causes">causes</option>
          <option value="enables">enables</option>
          <option value="requires">requires</option>
          <option value="influences">influences</option>
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
          className="w-full"
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
