import { useCallback, useEffect } from 'react';
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

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export default function GraphCanvas() {
  const { currentGraph, updateGraph } = useGraph();
  const { selectNode, selectEdge, clearSelection, contextPanelOpen, toggleContextPanel } = useUI();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert ontology data to React Flow format
  useEffect(() => {
    if (currentGraph) {
      const flowNodes = ontologyNodesToFlow(currentGraph.ontology_data.nodes);
      const flowEdges = ontologyEdgesToFlow(currentGraph.ontology_data.edges);

      // Apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentGraph]);

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
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data;
            if (data.type === 'entity') return '#3B82F6';
            if (data.type === 'event') return '#F97316';
            if (data.type === 'process') return '#10B981';
            if (data.type === 'attribute') return '#8B5CF6';
            return '#6B7280';
          }}
          className="!bg-white !border !border-gray-200"
        />
      </ReactFlow>
    </div>
  );
}
