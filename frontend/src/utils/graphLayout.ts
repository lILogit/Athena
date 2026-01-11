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
