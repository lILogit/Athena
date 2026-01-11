import dagre from 'dagre';
import { Node, Edge, Position } from 'reactflow';
import { OntologyNode, OntologyEdge } from '@kgs/shared';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/**
 * Apply Dagre hierarchical layout to nodes
 */
export function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB'): {
  nodes: Node[];
  edges: Edge[];
} {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? 'left' : 'top') as Position,
      sourcePosition: (isHorizontal ? 'right' : 'bottom') as Position,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Convert OntologyNode to React Flow Node
 */
export function ontologyNodesToFlow(nodes: OntologyNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'custom',
    position: { x: 0, y: 0 }, // Will be set by layout
    data: node,
  }));
}

/**
 * Convert OntologyEdge to React Flow Edge
 */
export function ontologyEdgesToFlow(edges: OntologyEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || null,
    targetHandle: edge.targetHandle || null,
    type: 'custom',
    data: edge,
    animated: edge.strength > 0.7,
  }));
}

/**
 * Knowledge Mining Layout - Enhanced force-directed with clustering
 * Nodes with similar connections attract each other more strongly
 */
export function getKnowledgeMiningLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    clusterStrength?: number;
    similarityAttraction?: boolean;
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const { clusterStrength = 1.5, similarityAttraction = true } = options;

  if (nodes.length === 0) return { nodes, edges };

  // Calculate connection counts for each node
  const connectionCounts = new Map<string, number>();
  edges.forEach((edge) => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  });

  // Group nodes by cluster label if available
  const clusters = new Map<string, string[]>();
  nodes.forEach((node) => {
    const clusterLabel = node.data?.archetypeMetadata?.clusterLabel || 'default';
    if (!clusters.has(clusterLabel)) {
      clusters.set(clusterLabel, []);
    }
    clusters.get(clusterLabel)!.push(node.id);
  });

  // Calculate similarity based on shared connections
  const getSimilarity = (nodeId1: string, nodeId2: string): number => {
    if (!similarityAttraction) return 0;

    const neighbors1 = new Set<string>();
    const neighbors2 = new Set<string>();

    edges.forEach((edge) => {
      if (edge.source === nodeId1) neighbors1.add(edge.target);
      if (edge.target === nodeId1) neighbors1.add(edge.source);
      if (edge.source === nodeId2) neighbors2.add(edge.target);
      if (edge.target === nodeId2) neighbors2.add(edge.source);
    });

    const intersection = [...neighbors1].filter((x) => neighbors2.has(x)).length;
    const union = new Set([...neighbors1, ...neighbors2]).size;

    return union > 0 ? intersection / union : 0;
  };

  // Initialize positions
  const positions = new Map<string, { x: number; y: number }>();
  const centerX = 400;
  const centerY = 300;

  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const radius = 200 + Math.random() * 100;
    positions.set(node.id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  // Force-directed simulation
  const iterations = 100;
  const k = 150; // Ideal distance

  for (let i = 0; i < iterations; i++) {
    const temp = 1 - i / iterations; // Cooling

    // Repulsion between all nodes
    nodes.forEach((n1) => {
      nodes.forEach((n2) => {
        if (n1.id !== n2.id) {
          const p1 = positions.get(n1.id)!;
          const p2 = positions.get(n2.id)!;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

          // Cluster nodes repel less
          const n1Cluster = n1.data?.archetypeMetadata?.clusterLabel || 'default';
          const n2Cluster = n2.data?.archetypeMetadata?.clusterLabel || 'default';
          const clusterMod = n1Cluster === n2Cluster ? 1 / clusterStrength : 1;

          const force = ((k * k) / dist) * clusterMod * temp;
          p1.x += (dx / dist) * force * 0.1;
          p1.y += (dy / dist) * force * 0.1;
        }
      });
    });

    // Attraction along edges (stronger for similar nodes)
    edges.forEach((edge) => {
      const p1 = positions.get(edge.source);
      const p2 = positions.get(edge.target);
      if (p1 && p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        // Similarity bonus
        const similarity = getSimilarity(edge.source, edge.target);
        const similarityBonus = 1 + similarity;

        // Edge strength from metadata
        const edgeStrength = edge.data?.archetypeMetadata?.similarityScore ?? edge.data?.strength ?? 0.5;

        const force = (dist - k) * 0.05 * temp * similarityBonus * (0.5 + edgeStrength);
        p1.x += (dx / dist) * force;
        p1.y += (dy / dist) * force;
        p2.x -= (dx / dist) * force;
        p2.y -= (dy / dist) * force;
      }
    });

    // Cluster attraction (nodes in same cluster attract)
    clusters.forEach((nodeIds) => {
      if (nodeIds.length > 1) {
        // Calculate cluster center
        let cx = 0,
          cy = 0;
        nodeIds.forEach((id) => {
          const p = positions.get(id)!;
          cx += p.x;
          cy += p.y;
        });
        cx /= nodeIds.length;
        cy /= nodeIds.length;

        // Attract nodes toward cluster center
        nodeIds.forEach((id) => {
          const p = positions.get(id)!;
          p.x += (cx - p.x) * 0.01 * clusterStrength * temp;
          p.y += (cy - p.y) * 0.01 * clusterStrength * temp;
        });
      }
    });
  }

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));

  return { nodes: layoutedNodes, edges };
}

/**
 * Explanation Layout - Concentric circles with central phenomenon
 * Uses BFS to determine layers from the central node
 */
export function getExplanationLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    centralNodeId?: string;
    orientation?: 'concentric' | 'vertical';
    layerSpacing?: number;
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const { orientation = 'concentric', layerSpacing = 150 } = options;

  if (nodes.length === 0) return { nodes, edges };

  // Find central node (the one being explained)
  // Priority: specified > node with most incoming 'explains' edges > first node
  let centralNodeId = options.centralNodeId;

  if (!centralNodeId) {
    const incomingCounts = new Map<string, number>();
    edges.forEach((edge) => {
      const relation = edge.data?.relation || edge.data?.extendedRelation;
      if (relation === 'explains' || relation === 'causes') {
        incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
      }
    });

    // Find node with most incoming explanatory edges
    let maxCount = 0;
    incomingCounts.forEach((count, nodeId) => {
      if (count > maxCount) {
        maxCount = count;
        centralNodeId = nodeId;
      }
    });

    // Fall back to first node with layer 0 or first node
    if (!centralNodeId) {
      const layerZeroNode = nodes.find(
        (n) => n.data?.archetypeMetadata?.explanationLayer === 0
      );
      centralNodeId = layerZeroNode?.id || nodes[0]?.id;
    }
  }

  // BFS to assign layers
  const layers = new Map<string, number>();
  const queue: string[] = [centralNodeId!];
  layers.set(centralNodeId!, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLayer = layers.get(current)!;

    // Find neighbors (nodes that explain or are explained by current)
    edges.forEach((edge) => {
      let neighbor: string | null = null;
      if (edge.target === current && !layers.has(edge.source)) {
        neighbor = edge.source;
      } else if (edge.source === current && !layers.has(edge.target)) {
        neighbor = edge.target;
      }

      if (neighbor && !layers.has(neighbor)) {
        layers.set(neighbor, currentLayer + 1);
        queue.push(neighbor);
      }
    });
  }

  // Handle disconnected nodes
  nodes.forEach((node) => {
    if (!layers.has(node.id)) {
      const maxLayer = Math.max(...Array.from(layers.values()), 0);
      layers.set(node.id, maxLayer + 1);
    }
  });

  // Group nodes by layer
  const nodesByLayer = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const layer = layers.get(node.id) || 0;
    if (!nodesByLayer.has(layer)) {
      nodesByLayer.set(layer, []);
    }
    nodesByLayer.get(layer)!.push(node);
  });

  // Calculate positions
  const centerX = 400;
  const centerY = 300;
  const positions = new Map<string, { x: number; y: number }>();

  nodesByLayer.forEach((layerNodes, layer) => {
    if (orientation === 'concentric') {
      // Concentric circles layout
      const radius = layer * layerSpacing;

      if (layer === 0) {
        // Central node at center
        layerNodes.forEach((node) => {
          positions.set(node.id, { x: centerX, y: centerY });
        });
      } else {
        // Distribute nodes around the ring
        layerNodes.forEach((node, index) => {
          const angle = (2 * Math.PI * index) / layerNodes.length - Math.PI / 2;
          positions.set(node.id, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        });
      }
    } else {
      // Vertical hierarchy layout
      const y = 50 + layer * layerSpacing;
      const totalWidth = (layerNodes.length - 1) * (NODE_WIDTH + 50);
      const startX = centerX - totalWidth / 2;

      layerNodes.forEach((node, index) => {
        positions.set(node.id, {
          x: startX + index * (NODE_WIDTH + 50),
          y: y,
        });
      });
    }
  });

  // Apply positions and add layer info to data
  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
    data: {
      ...node.data,
      archetypeMetadata: {
        ...node.data?.archetypeMetadata,
        explanationLayer: layers.get(node.id) || 0,
      },
    },
  }));

  return { nodes: layoutedNodes, edges };
}

/**
 * Goal Achievement Layout - Hierarchical with goal at top
 * Flows from goal -> milestones -> actions, with obstacles and resources positioned to the side
 */
export function getGoalAchievementLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    goalNodeId?: string;
    showDependencies?: boolean;
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Find the goal node
  let goalNodeId = options.goalNodeId;
  if (!goalNodeId) {
    const goalNode = nodes.find((n) => n.data?.extendedType === 'goal');
    goalNodeId = goalNode?.id || nodes[0]?.id;
  }

  // Categorize nodes by type
  const nodeCategories = new Map<string, Node[]>();
  const categoryOrder = ['goal', 'milestone', 'action', 'resource', 'obstacle'];

  categoryOrder.forEach((cat) => nodeCategories.set(cat, []));
  nodeCategories.set('other', []);

  nodes.forEach((node) => {
    const extType = node.data?.extendedType || 'other';
    if (nodeCategories.has(extType)) {
      nodeCategories.get(extType)!.push(node);
    } else {
      nodeCategories.get('other')!.push(node);
    }
  });

  // Position nodes
  const centerX = 400;
  const positions = new Map<string, { x: number; y: number }>();

  // Goals at top
  const goals = nodeCategories.get('goal') || [];
  goals.forEach((node, i) => {
    const totalWidth = (goals.length - 1) * (NODE_WIDTH + 50);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 50),
      y: 50,
    });
  });

  // Milestones below goals
  const milestones = nodeCategories.get('milestone') || [];
  milestones.forEach((node, i) => {
    const totalWidth = (milestones.length - 1) * (NODE_WIDTH + 40);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 40),
      y: 180,
    });
  });

  // Actions in the middle
  const actions = nodeCategories.get('action') || [];
  actions.forEach((node, i) => {
    const totalWidth = (actions.length - 1) * (NODE_WIDTH + 30);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 30),
      y: 310,
    });
  });

  // Resources on the left side
  const resources = nodeCategories.get('resource') || [];
  resources.forEach((node, i) => {
    positions.set(node.id, {
      x: 50,
      y: 180 + i * (NODE_HEIGHT + 30),
    });
  });

  // Obstacles on the right side (highlighted as blockers)
  const obstacles = nodeCategories.get('obstacle') || [];
  obstacles.forEach((node, i) => {
    positions.set(node.id, {
      x: centerX + 350,
      y: 180 + i * (NODE_HEIGHT + 30),
    });
  });

  // Other nodes at bottom
  const others = nodeCategories.get('other') || [];
  others.forEach((node, i) => {
    const totalWidth = (others.length - 1) * (NODE_WIDTH + 30);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 30),
      y: 440,
    });
  });

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));

  return { nodes: layoutedNodes, edges };
}

/**
 * Decision Layout - Decision point at center with options radiating out
 * Criteria connected to options, outcomes at the periphery
 */
export function getDecisionLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    decisionNodeId?: string;
    weightedPositioning?: boolean;
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Find the decision point node
  let decisionNodeId = options.decisionNodeId;
  if (!decisionNodeId) {
    const decisionNode = nodes.find((n) => n.data?.extendedType === 'decision-point');
    decisionNodeId = decisionNode?.id || nodes[0]?.id;
  }

  // Categorize nodes
  const nodeCategories = new Map<string, Node[]>();
  const categoryTypes = ['decision-point', 'option', 'criterion', 'outcome', 'risk'];
  categoryTypes.forEach((cat) => nodeCategories.set(cat, []));
  nodeCategories.set('other', []);

  nodes.forEach((node) => {
    const extType = node.data?.extendedType || 'other';
    if (nodeCategories.has(extType)) {
      nodeCategories.get(extType)!.push(node);
    } else {
      nodeCategories.get('other')!.push(node);
    }
  });

  const centerX = 400;
  const centerY = 300;
  const positions = new Map<string, { x: number; y: number }>();

  // Decision point at center
  const decisionPoints = nodeCategories.get('decision-point') || [];
  decisionPoints.forEach((node, i) => {
    if (i === 0) {
      positions.set(node.id, { x: centerX, y: centerY });
    } else {
      // Multiple decision points spread vertically
      positions.set(node.id, { x: centerX, y: centerY + i * 200 });
    }
  });

  // Options radiate from center
  const optionNodes = nodeCategories.get('option') || [];
  const optionRadius = 200;
  optionNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(optionNodes.length, 1) - Math.PI / 2;
    positions.set(node.id, {
      x: centerX + optionRadius * Math.cos(angle),
      y: centerY + optionRadius * Math.sin(angle),
    });
  });

  // Criteria at top (influence all options)
  const criteria = nodeCategories.get('criterion') || [];
  criteria.forEach((node, i) => {
    const totalWidth = (criteria.length - 1) * (NODE_WIDTH + 20);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 20),
      y: 50,
    });
  });

  // Outcomes at outer ring (beyond options)
  const outcomes = nodeCategories.get('outcome') || [];
  const outcomeRadius = 380;
  outcomes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(outcomes.length, 1);
    positions.set(node.id, {
      x: centerX + outcomeRadius * Math.cos(angle),
      y: centerY + outcomeRadius * Math.sin(angle),
    });
  });

  // Risks near the bottom (warning indicators)
  const risks = nodeCategories.get('risk') || [];
  risks.forEach((node, i) => {
    const totalWidth = (risks.length - 1) * (NODE_WIDTH + 20);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 20),
      y: centerY + 320,
    });
  });

  // Other nodes at bottom
  const others = nodeCategories.get('other') || [];
  others.forEach((node, i) => {
    const totalWidth = (others.length - 1) * (NODE_WIDTH + 20);
    positions.set(node.id, {
      x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 20),
      y: centerY + 420,
    });
  });

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));

  return { nodes: layoutedNodes, edges };
}

/**
 * Prediction Layout - Timeline-based with trends and forecasts
 * Signals/assumptions on left, trends in middle, scenarios/forecasts on right
 */
export function getPredictionLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    timelineOrientation?: 'horizontal' | 'vertical';
    groupByCategory?: boolean;
  } = {}
): { nodes: Node[]; edges: Edge[] } {
  const { timelineOrientation = 'horizontal' } = options;

  if (nodes.length === 0) return { nodes, edges };

  // Categorize nodes by type
  const nodeCategories = new Map<string, Node[]>();
  const categoryTypes = ['assumption', 'signal', 'trend', 'scenario', 'forecast'];
  categoryTypes.forEach((cat) => nodeCategories.set(cat, []));
  nodeCategories.set('other', []);

  nodes.forEach((node) => {
    const extType = node.data?.extendedType || 'other';
    if (nodeCategories.has(extType)) {
      nodeCategories.get(extType)!.push(node);
    } else {
      nodeCategories.get('other')!.push(node);
    }
  });

  const positions = new Map<string, { x: number; y: number }>();
  const startX = 50;
  const startY = 100;
  const columnSpacing = NODE_WIDTH + 80;
  const rowSpacing = NODE_HEIGHT + 40;

  if (timelineOrientation === 'horizontal') {
    // Left to right: Assumptions -> Signals -> Trends -> Scenarios -> Forecasts
    const columns = [
      { type: 'assumption', x: startX },
      { type: 'signal', x: startX + columnSpacing },
      { type: 'trend', x: startX + columnSpacing * 2 },
      { type: 'scenario', x: startX + columnSpacing * 3 },
      { type: 'forecast', x: startX + columnSpacing * 4 },
    ];

    columns.forEach(({ type, x }) => {
      const typeNodes = nodeCategories.get(type) || [];
      typeNodes.forEach((node, i) => {
        positions.set(node.id, {
          x: x,
          y: startY + i * rowSpacing,
        });
      });
    });

    // Other nodes at bottom
    const others = nodeCategories.get('other') || [];
    const maxRows = Math.max(
      ...categoryTypes.map((t) => (nodeCategories.get(t) || []).length),
      1
    );
    others.forEach((node, i) => {
      positions.set(node.id, {
        x: startX + (i % 5) * columnSpacing,
        y: startY + maxRows * rowSpacing + 50,
      });
    });
  } else {
    // Top to bottom: Assumptions at top, Forecasts at bottom
    const rows = [
      { type: 'assumption', y: startY },
      { type: 'signal', y: startY + rowSpacing * 2 },
      { type: 'trend', y: startY + rowSpacing * 4 },
      { type: 'scenario', y: startY + rowSpacing * 6 },
      { type: 'forecast', y: startY + rowSpacing * 8 },
    ];

    rows.forEach(({ type, y }) => {
      const typeNodes = nodeCategories.get(type) || [];
      const totalWidth = (typeNodes.length - 1) * (NODE_WIDTH + 30);
      const centerX = 400;
      typeNodes.forEach((node, i) => {
        positions.set(node.id, {
          x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 30),
          y: y,
        });
      });
    });

    // Other nodes at bottom
    const others = nodeCategories.get('other') || [];
    const centerX = 400;
    const totalWidth = (others.length - 1) * (NODE_WIDTH + 30);
    others.forEach((node, i) => {
      positions.set(node.id, {
        x: centerX - totalWidth / 2 + i * (NODE_WIDTH + 30),
        y: startY + rowSpacing * 10,
      });
    });
  }

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));

  return { nodes: layoutedNodes, edges };
}
