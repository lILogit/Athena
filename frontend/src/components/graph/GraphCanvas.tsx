import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
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
  ConnectionMode,
  Panel,
  OnSelectionChangeParams,
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import ComplexitySlider from './ComplexitySlider';
import ArchetypeHelpPanel from './ArchetypeHelpPanel';
import FocusControls from './FocusControls';
import { computeCentrality } from '../../utils/graphMetrics';
import { extractViewGraph, ViewGraph } from '../../utils/focusContext';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import {
  getLayoutedElements,
  ontologyNodesToFlow,
  ontologyEdgesToFlow,
  getKnowledgeMiningLayout,
  getExplanationLayout,
  getGoalAchievementLayout,
  getDecisionLayout,
  getPredictionLayout,
} from '../../utils/graphLayout';
import { OntologyNode, OntologyEdge, NodeType, RelationType, ExtendedNodeType, ExtendedRelationType } from '@kgs/shared';
import { v4 as uuidv4 } from 'uuid';
import { api, QuickNodeType, QuickEdgeType } from '../../services/api';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export default function GraphCanvas() {
  const { currentGraph, updateGraph, addNode, addEdge: addGraphEdge, deleteNode, deleteEdge, undo, redo, canUndo, canRedo } = useGraph();
  const {
    selectNode,
    selectNodes,
    selectEdge,
    clearSelection,
    selectedNodeId,
    selectedEdgeId,
    contextPanelOpen,
    toggleContextPanel,
    openEnrichmentDialog,
    openClarificationDialog,
    selectedProjectId,
    focusNodeId,
    outRadius,
    inRadius,
    detailLevel,
    setFocusNode,
    clearFocus,
    // History and AI Chat toggles
    chatWindowOpen,
    historyViewerOpen,
    toggleChatWindow,
    toggleHistoryViewer,
  } = useUI();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<ExtendedNodeType>('entity');
  const [newEdgeSource, setNewEdgeSource] = useState('');
  const [newEdgeTarget, setNewEdgeTarget] = useState('');
  const [newEdgeRelation, setNewEdgeRelation] = useState<ExtendedRelationType>('influences');
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // Archetype-specific type options
  const [nodeTypeOptions, setNodeTypeOptions] = useState<QuickNodeType[]>([]);
  const [edgeTypeOptions, setEdgeTypeOptions] = useState<QuickEdgeType[]>([]);

  // Load archetype-specific types when graph changes
  useEffect(() => {
    if (currentGraph?.archetype) {
      api.getNodeTypes(currentGraph.archetype).then(({ nodeTypes }) => {
        setNodeTypeOptions(nodeTypes);
        if (nodeTypes.length > 0) {
          setNewNodeType(nodeTypes[0].type);
        }
      }).catch(console.error);

      api.getEdgeTypes(currentGraph.archetype).then(({ edgeTypes }) => {
        setEdgeTypeOptions(edgeTypes);
        if (edgeTypes.length > 0) {
          setNewEdgeRelation(edgeTypes[0].type);
        }
      }).catch(console.error);
    }
  }, [currentGraph?.archetype]);

  // Track the last loaded graph ID to prevent unnecessary resets
  const lastLoadedGraphId = useRef<number | null>(null);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute centrality metrics for all nodes (memoized)
  const nodeMetrics = useMemo(() => {
    if (!currentGraph?.ontology_data) return new Map();
    return computeCentrality(
      currentGraph.ontology_data.nodes,
      currentGraph.ontology_data.edges
    );
  }, [currentGraph?.ontology_data]);

  // Compute view graph based on focus node and parameters (memoized)
  const viewGraph: ViewGraph | null = useMemo(() => {
    if (!currentGraph?.ontology_data) return null;
    if (!focusNodeId) {
      // No focus = show entire graph
      return {
        nodes: currentGraph.ontology_data.nodes,
        edges: currentGraph.ontology_data.edges,
        focusNodeId: '',
        nodeDistances: new Map(),
      };
    }
    return extractViewGraph(currentGraph.ontology_data, nodeMetrics, {
      focusNodeId,
      outRadius,
      inRadius,
      detailLevel,
    });
  }, [currentGraph?.ontology_data, nodeMetrics, focusNodeId, outRadius, inRadius, detailLevel]);

  // Clear focus if focused node is deleted
  useEffect(() => {
    if (focusNodeId && currentGraph?.ontology_data) {
      const nodeExists = currentGraph.ontology_data.nodes.some(n => n.id === focusNodeId);
      if (!nodeExists) {
        clearFocus();
      }
    }
  }, [currentGraph?.ontology_data.nodes, focusNodeId, clearFocus]);

  // Track previous focus node ID to detect focus changes
  const prevFocusNodeIdRef = useRef<string | null>(null);

  // Convert ontology data to React Flow format (without auto-layout)
  // Sync when graph or viewGraph changes, preserving positions and selection
  useEffect(() => {
    if (currentGraph && viewGraph) {
      const isNewGraph = lastLoadedGraphId.current !== currentGraph.id;
      // Detect focus change (including clearing focus)
      const focusChanged = prevFocusNodeIdRef.current !== focusNodeId;
      prevFocusNodeIdRef.current = focusNodeId;

      // Force full sync when focus changes
      if (isNewGraph || focusChanged) {
        // ontologyNodesToFlow uses stored positions from node.position if available
        const flowNodes = ontologyNodesToFlow(viewGraph.nodes);
        const flowEdges = ontologyEdgesToFlow(viewGraph.edges);

        // For existing session nodes (same graph, node added/removed), preserve in-memory positions
        const existingNodes = new Map(nodes.map(n => [n.id, n]));

        const nodesWithPositions = flowNodes.map((node) => {
          const existingNode = existingNodes.get(node.id);
          if (existingNode && !isNewGraph) {
            // Preserve in-memory position and selection state for existing nodes
            return {
              ...node,
              position: existingNode.position,
              selected: existingNode.selected,
            };
          }
          // Use the position from ontologyNodesToFlow (either stored or default grid)
          return node;
        });

        setNodes(nodesWithPositions);
        setEdges(flowEdges);
        lastLoadedGraphId.current = currentGraph.id;
      } else {
        // Check for count/id changes (node add/remove without focus change)
        const nodeCountChanged = nodes.length !== viewGraph.nodes.length;
        const edgeCountChanged = edges.length !== viewGraph.edges.length;
        const nodeIdsChanged = nodes.map(n => n.id).sort().join(',') !==
          viewGraph.nodes.map(n => n.id).sort().join(',');

        if (nodeCountChanged || edgeCountChanged || nodeIdsChanged) {
          const flowNodes = ontologyNodesToFlow(viewGraph.nodes);
          const flowEdges = ontologyEdgesToFlow(viewGraph.edges);
          const existingNodes = new Map(nodes.map(n => [n.id, n]));

          const nodesWithPositions = flowNodes.map((node) => {
            const existingNode = existingNodes.get(node.id);
            if (existingNode) {
              return {
                ...node,
                position: existingNode.position,
                selected: existingNode.selected,
              };
            }
            return node;
          });

          setNodes(nodesWithPositions);
          setEdges(flowEdges);
        } else {
          // For property updates only, update data in place to preserve selection
          setNodes((nds) =>
            nds.map((node) => {
              const ontologyNode = viewGraph.nodes.find((n) => n.id === node.id);
              if (ontologyNode) {
                return { ...node, data: ontologyNode };
              }
              return node;
            })
          );
          setEdges((eds) =>
            eds.map((edge) => {
              const ontologyEdge = viewGraph.edges.find((e) => e.id === edge.id);
              if (ontologyEdge) {
                return { ...edge, data: ontologyEdge };
              }
              return edge;
            })
          );
        }
      }
    } else {
      setNodes([]);
      setEdges([]);
      lastLoadedGraphId.current = null;
    }
  }, [currentGraph, viewGraph, focusNodeId]);

  // Layout functions for different algorithms
  const applyLayout = useCallback((layoutType: string) => {
    let layoutedNodes = [...nodes];
    const layoutedEdges = [...edges];

    switch (layoutType) {
      case 'hierarchical-tb': {
        // Top to Bottom hierarchical
        const result = getLayoutedElements(nodes, edges, 'TB');
        layoutedNodes = result.nodes;
        break;
      }
      case 'hierarchical-lr': {
        // Left to Right hierarchical
        const result = getLayoutedElements(nodes, edges, 'LR');
        layoutedNodes = result.nodes;
        break;
      }
      case 'hierarchical-bt': {
        // Bottom to Top hierarchical
        const result = getLayoutedElements(nodes, edges, 'BT');
        layoutedNodes = result.nodes;
        break;
      }
      case 'hierarchical-rl': {
        // Right to Left hierarchical
        const result = getLayoutedElements(nodes, edges, 'RL');
        layoutedNodes = result.nodes;
        break;
      }
      case 'grid': {
        // Grid layout
        const cols = Math.ceil(Math.sqrt(nodes.length));
        layoutedNodes = nodes.map((node, index) => ({
          ...node,
          position: {
            x: (index % cols) * 250 + 50,
            y: Math.floor(index / cols) * 150 + 50,
          },
        }));
        break;
      }
      case 'circular': {
        // Circular layout
        const radius = Math.max(200, nodes.length * 40);
        const centerX = 400;
        const centerY = 300;
        layoutedNodes = nodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / nodes.length;
          return {
            ...node,
            position: {
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle),
            },
          };
        });
        break;
      }
      case 'radial': {
        // Radial layout - root nodes in center, others in rings
        const centerX = 400;
        const centerY = 300;
        const targetIds = new Set(edges.map(e => e.target));
        const rootNodes = nodes.filter(n => !targetIds.has(n.id));
        const otherNodes = nodes.filter(n => targetIds.has(n.id));

        // Place root nodes in inner ring
        const innerRadius = 100;
        const rootLayouted = rootNodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / Math.max(rootNodes.length, 1);
          return {
            ...node,
            position: {
              x: centerX + innerRadius * Math.cos(angle),
              y: centerY + innerRadius * Math.sin(angle),
            },
          };
        });

        // Place other nodes in outer ring
        const outerRadius = Math.max(250, otherNodes.length * 30);
        const otherLayouted = otherNodes.map((node, index) => {
          const angle = (2 * Math.PI * index) / Math.max(otherNodes.length, 1);
          return {
            ...node,
            position: {
              x: centerX + outerRadius * Math.cos(angle),
              y: centerY + outerRadius * Math.sin(angle),
            },
          };
        });

        layoutedNodes = [...rootLayouted, ...otherLayouted];
        break;
      }
      case 'force': {
        // Simple force-directed simulation
        const iterations = 50;
        const k = 150; // Ideal distance
        const positions = new Map(nodes.map(n => [n.id, { ...n.position }]));

        for (let i = 0; i < iterations; i++) {
          // Repulsion between all nodes
          nodes.forEach(n1 => {
            nodes.forEach(n2 => {
              if (n1.id !== n2.id) {
                const p1 = positions.get(n1.id)!;
                const p2 = positions.get(n2.id)!;
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                const force = (k * k) / dist;
                p1.x += (dx / dist) * force * 0.1;
                p1.y += (dy / dist) * force * 0.1;
              }
            });
          });

          // Attraction along edges
          edges.forEach(edge => {
            const p1 = positions.get(edge.source);
            const p2 = positions.get(edge.target);
            if (p1 && p2) {
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
              const force = (dist - k) * 0.05;
              p1.x += (dx / dist) * force;
              p1.y += (dy / dist) * force;
              p2.x -= (dx / dist) * force;
              p2.y -= (dy / dist) * force;
            }
          });
        }

        layoutedNodes = nodes.map(node => ({
          ...node,
          position: positions.get(node.id) || node.position,
        }));
        break;
      }
      case 'knowledge-mining': {
        // Knowledge Mining layout: force-directed with cluster awareness
        const kmResult = getKnowledgeMiningLayout(nodes, edges);
        layoutedNodes = kmResult.nodes;
        break;
      }
      case 'explanation': {
        // Explanation layout: concentric circles by layer
        const expResult = getExplanationLayout(nodes, edges);
        layoutedNodes = expResult.nodes;
        break;
      }
      case 'goal-achievement': {
        // Goal Achievement layout: hierarchical from goal down
        const gaResult = getGoalAchievementLayout(nodes, edges);
        layoutedNodes = gaResult.nodes;
        break;
      }
      case 'decision': {
        // Decision layout: central decision point with radiating options
        const decResult = getDecisionLayout(nodes, edges);
        layoutedNodes = decResult.nodes;
        break;
      }
      case 'prediction': {
        // Prediction layout: timeline-based
        const predResult = getPredictionLayout(nodes, edges);
        layoutedNodes = predResult.nodes;
        break;
      }
      default:
        break;
    }

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setShowLayoutMenu(false);
  }, [nodes, edges, setNodes, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Don't override selection when Shift is held (multi-select mode)
      if (!event.shiftKey) {
        selectNode(node.id);
      }
      if (!contextPanelOpen) {
        toggleContextPanel();
      }
    },
    [selectNode, contextPanelOpen, toggleContextPanel]
  );

  // Handle double-click to set focus
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Toggle focus: if already focused, clear; otherwise set focus
      if (node.id === focusNodeId) {
        clearFocus();
      } else {
        setFocusNode(node.id);
      }
    },
    [focusNodeId, setFocusNode, clearFocus]
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

  // Handle pane click (clear selection and close menus)
  const onPaneClick = useCallback(() => {
    clearSelection();
    setShowLayoutMenu(false);
  }, [clearSelection]);

  // Handle multi-selection changes
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const nodeIds = selectedNodes.map((n) => n.id);
      selectNodes(nodeIds);
    },
    [selectNodes]
  );

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
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
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

    // Determine base type and extended type
    const baseTypes: NodeType[] = ['entity', 'event', 'process', 'attribute'];
    const isBaseType = baseTypes.includes(newNodeType as NodeType);

    const newNode: OntologyNode = {
      id: uuidv4(),
      label: newNodeLabel.trim(),
      type: isBaseType ? (newNodeType as NodeType) : 'entity',
      extendedType: isBaseType ? undefined : newNodeType,
      properties: {},
      confidence: 1.0,
      source: 'user-stated',
    };

    addNode(newNode);
    setNewNodeLabel('');
    // Reset to first available type
    if (nodeTypeOptions.length > 0) {
      setNewNodeType(nodeTypeOptions[0].type);
    } else {
      setNewNodeType('entity');
    }
    setShowAddNodeModal(false);
  }, [newNodeLabel, newNodeType, addNode, currentGraph, nodeTypeOptions]);

  // Handle adding a new edge
  const handleAddEdge = useCallback(() => {
    if (!newEdgeSource || !newEdgeTarget || !currentGraph) return;

    // Determine base relation and extended relation
    const baseRelations: RelationType[] = ['is-a', 'part-of', 'causes', 'enables', 'requires', 'influences'];
    const isBaseRelation = baseRelations.includes(newEdgeRelation as RelationType);

    const newEdge: OntologyEdge = {
      id: uuidv4(),
      source: newEdgeSource,
      target: newEdgeTarget,
      relation: isBaseRelation ? (newEdgeRelation as RelationType) : 'influences',
      extendedRelation: isBaseRelation ? undefined : newEdgeRelation,
      strength: 0.8,
      temporal: false,
      properties: {},
    };

    addGraphEdge(newEdge);
    setNewEdgeSource('');
    setNewEdgeTarget('');
    // Reset to first available type
    if (edgeTypeOptions.length > 0) {
      setNewEdgeRelation(edgeTypeOptions[0].type);
    } else {
      setNewEdgeRelation('influences');
    }
    setShowAddEdgeModal(false);
  }, [newEdgeSource, newEdgeTarget, newEdgeRelation, addGraphEdge, currentGraph, edgeTypeOptions]);

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

  // Export graph to JSON file
  const handleExportGraph = useCallback(() => {
    if (!currentGraph) return;

    const exportData = {
      title: currentGraph.title,
      description: currentGraph.description,
      ontology_data: currentGraph.ontology_data,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentGraph.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_graph.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentGraph]);

  // Import graph from JSON file
  const handleImportGraph = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentGraph) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        if (importedData.ontology_data) {
          // Merge imported nodes and edges with existing ones
          const existingNodeIds = new Set(currentGraph.ontology_data.nodes.map(n => n.id));
          const existingEdgeIds = new Set(currentGraph.ontology_data.edges.map(e => e.id));

          // Add new nodes (skip duplicates by ID)
          const newNodes = importedData.ontology_data.nodes.filter(
            (n: OntologyNode) => !existingNodeIds.has(n.id)
          );

          // Add new edges (skip duplicates by ID)
          const newEdges = importedData.ontology_data.edges.filter(
            (e: OntologyEdge) => !existingEdgeIds.has(e.id)
          );

          if (newNodes.length > 0 || newEdges.length > 0) {
            updateGraph(currentGraph.id, {
              nodes: [...currentGraph.ontology_data.nodes, ...newNodes],
              edges: [...currentGraph.ontology_data.edges, ...newEdges],
            });
          }
        }
      } catch (error) {
        console.error('Failed to import graph:', error);
        alert('Failed to import graph. Please ensure the file is a valid JSON graph export.');
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentGraph, updateGraph]);

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

  // Save graph when nodes/edges change (includes positions)
  // IMPORTANT: Skip save when in focus mode to avoid overwriting full graph with filtered subset
  useEffect(() => {
    if (currentGraph && nodes.length > 0 && !focusNodeId) {
      // Debounce save to avoid too many updates
      const timeoutId = setTimeout(() => {
        const updatedOntologyData = {
          // Include current positions in node data for persistence
          nodes: nodes.map((node) => ({
            ...node.data,
            position: node.position, // Persist the current position
          })),
          edges: edges.map((edge) => edge.data),
        };
        updateGraph(currentGraph.id, updatedOntologyData);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, focusNodeId]);

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
            onClick={() => selectedProjectId && openClarificationDialog(selectedProjectId)}
            disabled={!selectedProjectId}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create New Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Toolbar - positioned absolutely at top to appear in header area */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full z-20">
        <div className="bg-white rounded-b-lg shadow-lg border border-t-0 border-gray-200 p-2 flex gap-2 items-center">
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

          {/* Clear Focus - show when focused */}
          {focusNodeId && (
            <>
              <button
                onClick={clearFocus}
                className="px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
                title="Clear focus and show full graph"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Focus
              </button>
              <div className="w-px h-6 bg-gray-200" />
            </>
          )}

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

          {/* Layout Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-1"
              title="Auto-arrange nodes"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Layout
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Layout Dropdown Menu */}
            {showLayoutMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-50">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Hierarchical</div>
                <button
                  onClick={() => applyLayout('hierarchical-tb')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Top to Bottom
                </button>
                <button
                  onClick={() => applyLayout('hierarchical-bt')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Bottom to Top
                </button>
                <button
                  onClick={() => applyLayout('hierarchical-lr')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  Left to Right
                </button>
                <button
                  onClick={() => applyLayout('hierarchical-rl')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Right to Left
                </button>

                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Other Layouts</div>
                <button
                  onClick={() => applyLayout('grid')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => applyLayout('circular')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  </svg>
                  Circular
                </button>
                <button
                  onClick={() => applyLayout('radial')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" strokeWidth={2} />
                    <circle cx="12" cy="12" r="8" strokeWidth={2} strokeDasharray="4 2" />
                  </svg>
                  Radial
                </button>
                <button
                  onClick={() => applyLayout('force')}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Force-Directed
                </button>

                {/* Archetype-specific layouts */}
                {currentGraph?.archetype && currentGraph.archetype !== 'general' && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Archetype Layout</div>
                    {currentGraph.archetype === 'knowledge-mining' && (
                      <button
                        onClick={() => applyLayout('knowledge-mining')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span className="w-4 h-4 text-center">🔍</span>
                        Knowledge Mining
                      </button>
                    )}
                    {currentGraph.archetype === 'explanation' && (
                      <button
                        onClick={() => applyLayout('explanation')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span className="w-4 h-4 text-center">💡</span>
                        Explanation (Concentric)
                      </button>
                    )}
                    {currentGraph.archetype === 'goal-achievement' && (
                      <button
                        onClick={() => applyLayout('goal-achievement')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span className="w-4 h-4 text-center">🎯</span>
                        Goal Hierarchy
                      </button>
                    )}
                    {currentGraph.archetype === 'decision' && (
                      <button
                        onClick={() => applyLayout('decision')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span className="w-4 h-4 text-center">⚖️</span>
                        Decision Radial
                      </button>
                    )}
                    {currentGraph.archetype === 'prediction' && (
                      <button
                        onClick={() => applyLayout('prediction')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                      >
                        <span className="w-4 h-4 text-center">🔮</span>
                        Prediction Timeline
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Enrich with AI Button */}
          <button
            onClick={() => currentGraph && openEnrichmentDialog(currentGraph.id)}
            className="px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
            title="Add entities using AI conversation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Enrich
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Export Button */}
          <button
            onClick={handleExportGraph}
            className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-1"
            title="Export graph to JSON file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-1"
            title="Import graph from JSON file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportGraph}
            className="hidden"
          />

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200" />

          {/* History Viewer Toggle */}
          <button
            onClick={toggleHistoryViewer}
            className={`p-1.5 rounded transition-colors ${
              historyViewerOpen
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Graph History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* AI Chat Toggle */}
          <button
            onClick={toggleChatWindow}
            className={`p-1.5 rounded transition-colors ${
              chatWindowOpen
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="AI Assistant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        connectOnClick={false}
        selectionOnDrag
        multiSelectionKeyCode="Shift"
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

        {/* Complexity Slider for Explanation graphs */}
        {currentGraph?.archetype === 'explanation' && (
          <Panel position="bottom-left" className="ml-12 mb-4">
            <ComplexitySlider />
          </Panel>
        )}

        {/* Focus Controls Panel */}
        <Panel position="top-right" className="mr-2 mt-2">
          <FocusControls />
        </Panel>

        {/* Archetype Help Panel */}
        {currentGraph?.archetype && (
          <Panel position="bottom-right" className="mr-2 mb-4">
            <ArchetypeHelpPanel archetype={currentGraph.archetype} />
          </Panel>
        )}

        {/* Archetype badge */}
        {currentGraph?.archetype && currentGraph.archetype !== 'general' && (
          <Panel position="top-left" className="ml-12">
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
              currentGraph.archetype === 'knowledge-mining' ? 'bg-purple-100 text-purple-800' :
              currentGraph.archetype === 'explanation' ? 'bg-amber-100 text-amber-800' :
              currentGraph.archetype === 'goal-achievement' ? 'bg-green-100 text-green-800' :
              currentGraph.archetype === 'decision' ? 'bg-blue-100 text-blue-800' :
              currentGraph.archetype === 'prediction' ? 'bg-indigo-100 text-indigo-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              <span>
                {currentGraph.archetype === 'knowledge-mining' ? '🔍' :
                 currentGraph.archetype === 'explanation' ? '💡' :
                 currentGraph.archetype === 'goal-achievement' ? '🎯' :
                 currentGraph.archetype === 'decision' ? '⚖️' :
                 currentGraph.archetype === 'prediction' ? '🔮' : '📊'}
              </span>
              {currentGraph.archetype === 'knowledge-mining' ? 'Knowledge Mining' :
               currentGraph.archetype === 'explanation' ? 'Explanation' :
               currentGraph.archetype === 'goal-achievement' ? 'Goal Achievement' :
               currentGraph.archetype === 'decision' ? 'Decision' :
               currentGraph.archetype === 'prediction' ? 'Prediction' : currentGraph.archetype}
            </div>
          </Panel>
        )}

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
                {nodeTypeOptions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {nodeTypeOptions.map((option) => (
                      <button
                        key={option.type}
                        onClick={() => setNewNodeType(option.type)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                          newNodeType === option.type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span>{option.icon}</span>
                        <span className="text-sm">{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <select
                    value={newNodeType}
                    onChange={(e) => setNewNodeType(e.target.value as ExtendedNodeType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="entity">Entity</option>
                    <option value="event">Event</option>
                    <option value="process">Process</option>
                    <option value="attribute">Attribute</option>
                  </select>
                )}
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
                {edgeTypeOptions.length > 0 ? (
                  <select
                    value={newEdgeRelation}
                    onChange={(e) => setNewEdgeRelation(e.target.value as ExtendedRelationType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {edgeTypeOptions.map((option) => (
                      <option key={option.type} value={option.type}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={newEdgeRelation}
                    onChange={(e) => setNewEdgeRelation(e.target.value as ExtendedRelationType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="is-a">is-a (taxonomic)</option>
                    <option value="part-of">part-of (compositional)</option>
                    <option value="causes">causes (causal)</option>
                    <option value="enables">enables (enablement)</option>
                    <option value="requires">requires (dependency)</option>
                    <option value="influences">influences (influence)</option>
                  </select>
                )}
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
