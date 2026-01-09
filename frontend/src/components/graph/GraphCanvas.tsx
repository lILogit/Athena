import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  Connection,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import {
  getLayoutedElements,
  ontologyNodesToFlow,
  ontologyEdgesToFlow,
} from '../../utils/graphLayout';
import { OntologyNode, OntologyEdge, NodeType, RelationType } from '@kgs/shared';
import { v4 as uuidv4 } from 'uuid';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export default function GraphCanvas() {
  const { currentGraph, updateGraph, addNode, addEdge: addGraphEdge, deleteNode, deleteEdge, undo, redo, canUndo, canRedo } = useGraph();
  const { selectNode, selectEdge, clearSelection, selectedNodeId, selectedEdgeId, contextPanelOpen, toggleContextPanel } = useUI();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('entity');
  const [newEdgeSource, setNewEdgeSource] = useState('');
  const [newEdgeTarget, setNewEdgeTarget] = useState('');
  const [newEdgeRelation, setNewEdgeRelation] = useState<RelationType>('influences');

  // Convert ontology data to React Flow format (without auto-layout)
  useEffect(() => {
    if (currentGraph) {
      const flowNodes = ontologyNodesToFlow(currentGraph.ontology_data.nodes);
      const flowEdges = ontologyEdgesToFlow(currentGraph.ontology_data.edges);

      // Preserve existing positions if nodes already exist
      const existingPositions = new Map(nodes.map(n => [n.id, n.position]));

      const nodesWithPositions = flowNodes.map((node, index) => {
        const existingPos = existingPositions.get(node.id);
        if (existingPos && existingPos.x !== 0 && existingPos.y !== 0) {
          return { ...node, position: existingPos };
        }
        // Default grid position for new nodes
        return {
          ...node,
          position: { x: (index % 4) * 250 + 50, y: Math.floor(index / 4) * 150 + 50 },
        };
      });

      setNodes(nodesWithPositions);
      setEdges(flowEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentGraph]);

  // Manual layout function
  const handleApplyLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, setNodes, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      if (!contextPanelOpen) {
        toggleContextPanel();
      }
    },
    [selectNode, contextPanelOpen, toggleContextPanel]
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
      if (!contextPanelOpen) {
        toggleContextPanel();
      }
    },
    [selectEdge, contextPanelOpen, toggleContextPanel]
  );

  // Handle pane click (clear selection)
  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle edge double click (prevent default behavior that causes crash)
  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      // Just select the edge, don't do anything else
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Handle new connections (creating edges by dragging)
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && currentGraph) {
        const newEdge: OntologyEdge = {
          id: uuidv4(),
          source: connection.source,
          target: connection.target,
          relation: 'influences',
          strength: 0.8,
          temporal: false,
          properties: {},
        };
        addGraphEdge(newEdge);
      }
    },
    [addGraphEdge, currentGraph]
  );

  // Handle adding a new node
  const handleAddNode = useCallback(() => {
    if (!newNodeLabel.trim() || !currentGraph) return;

    const newNode: OntologyNode = {
      id: uuidv4(),
      label: newNodeLabel.trim(),
      type: newNodeType,
      properties: {},
      confidence: 1.0,
      source: 'user-stated',
    };

    addNode(newNode);
    setNewNodeLabel('');
    setNewNodeType('entity');
    setShowAddNodeModal(false);
  }, [newNodeLabel, newNodeType, addNode, currentGraph]);

  // Handle adding a new edge
  const handleAddEdge = useCallback(() => {
    if (!newEdgeSource || !newEdgeTarget || !currentGraph) return;

    const newEdge: OntologyEdge = {
      id: uuidv4(),
      source: newEdgeSource,
      target: newEdgeTarget,
      relation: newEdgeRelation,
      strength: 0.8,
      temporal: false,
      properties: {},
    };

    addGraphEdge(newEdge);
    setNewEdgeSource('');
    setNewEdgeTarget('');
    setNewEdgeRelation('influences');
    setShowAddEdgeModal(false);
  }, [newEdgeSource, newEdgeTarget, newEdgeRelation, addGraphEdge, currentGraph]);

  // Handle deleting selected node or edge
  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      clearSelection();
    } else if (selectedEdgeId) {
      deleteEdge(selectedEdgeId);
      clearSelection();
    }
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, clearSelection]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      // Delete key
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputFocused) {
        handleDelete();
      }

      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Shift+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, undo, redo]);

  // Save graph when nodes/edges change
  useEffect(() => {
    if (currentGraph && nodes.length > 0) {
      // Debounce save to avoid too many updates
      const timeoutId = setTimeout(() => {
        const updatedOntologyData = {
          nodes: nodes.map((node) => node.data),
          edges: edges.map((edge) => edge.data),
        };
        updateGraph(currentGraph.id, updatedOntologyData);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges]);

  if (!currentGraph) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Graph Selected</h2>
          <p className="text-gray-600 mb-4">Create a new graph or select an existing one</p>
          <button
            onClick={() => {
              const { openClarificationDialog } = useUI();
              openClarificationDialog();
            }}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-medium"
          >
            Create New Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        connectOnClick={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data;
            if (!data) return '#6B7280';
            if (data.type === 'entity') return '#3B82F6';
            if (data.type === 'event') return '#F97316';
            if (data.type === 'process') return '#10B981';
            if (data.type === 'attribute') return '#8B5CF6';
            return '#6B7280';
          }}
          className="!bg-white !border !border-gray-200"
        />

        {/* Toolbar Panel */}
        <Panel position="top-center" className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2">
          {/* Undo/Redo */}
          <div className="flex gap-1 border-r border-gray-200 pr-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowAddNodeModal(true)}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-1"
            title="Add Node"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Node
          </button>
          <button
            onClick={() => setShowAddEdgeModal(true)}
            className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium flex items-center gap-1"
            title="Add Edge"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Edge
          </button>
          {(selectedNodeId || selectedEdgeId) && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-1"
              title="Delete Selected (Del)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Layout Button */}
          <button
            onClick={handleApplyLayout}
            className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-1"
            title="Auto-arrange nodes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Layout
          </button>
        </Panel>
      </ReactFlow>

      {/* Add Node Modal */}
      {showAddNodeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Node</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={newNodeLabel}
                  onChange={(e) => setNewNodeLabel(e.target.value)}
                  placeholder="Enter node label"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as NodeType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="entity">Entity</option>
                  <option value="event">Event</option>
                  <option value="process">Process</option>
                  <option value="attribute">Attribute</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddNodeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNode}
                disabled={!newNodeLabel.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                Add Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Edge Modal */}
      {showAddEdgeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Edge</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Node</label>
                <select
                  value={newEdgeSource}
                  onChange={(e) => setNewEdgeSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select source node</option>
                  {currentGraph?.ontology_data.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Node</label>
                <select
                  value={newEdgeTarget}
                  onChange={(e) => setNewEdgeTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select target node</option>
                  {currentGraph?.ontology_data.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
                <select
                  value={newEdgeRelation}
                  onChange={(e) => setNewEdgeRelation(e.target.value as RelationType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="is-a">is-a (taxonomic)</option>
                  <option value="part-of">part-of (compositional)</option>
                  <option value="causes">causes (causal)</option>
                  <option value="enables">enables (enablement)</option>
                  <option value="requires">requires (dependency)</option>
                  <option value="influences">influences (influence)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddEdgeModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEdge}
                disabled={!newEdgeSource || !newEdgeTarget}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                Add Edge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
