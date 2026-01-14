import { OntologyNode, OntologyEdge, OntologyData } from '@kgs/shared';
import { NodeMetrics } from './graphMetrics';

export interface FocusContextParams {
  focusNodeId: string;
  outRadius: number;      // Hops outward (1-5)
  inRadius: number;       // Hops inward (1-5)
  detailLevel: number;    // 0-1
}

export interface ViewGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  focusNodeId: string;
  nodeDistances: Map<string, number>;  // Distance from focus node
}

/**
 * Build adjacency lists for efficient graph traversal.
 */
function buildAdjacencyLists(edges: OntologyEdge[]) {
  const outgoing = new Map<string, OntologyEdge[]>();
  const incoming = new Map<string, OntologyEdge[]>();

  for (const edge of edges) {
    // Outgoing edges (source → target)
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, []);
    }
    outgoing.get(edge.source)!.push(edge);

    // Incoming edges (target ← source)
    if (!incoming.has(edge.target)) {
      incoming.set(edge.target, []);
    }
    incoming.get(edge.target)!.push(edge);
  }

  return { outgoing, incoming };
}

/**
 * Extract a subgraph centered around a focus node using BFS traversal.
 *
 * Algorithm:
 * 1. Start from focusNodeId
 * 2. Outward expansion: BFS following outgoing edges up to outRadius hops
 * 3. Inward expansion: BFS following incoming edges up to inRadius hops
 * 4. Detail level controls minimum edge strength to traverse
 * 5. Return union of discovered nodes + connecting edges
 */
export function extractViewGraph(
  fullGraph: OntologyData,
  _nodeMetrics: Map<string, NodeMetrics>,
  params: FocusContextParams
): ViewGraph {
  const { focusNodeId, outRadius, inRadius, detailLevel } = params;

  // Check if focus node exists
  const focusNode = fullGraph.nodes.find(n => n.id === focusNodeId);
  if (!focusNode) {
    return {
      nodes: [],
      edges: [],
      focusNodeId,
      nodeDistances: new Map(),
    };
  }

  // Detail level controls minimum edge strength to traverse
  // Higher detail = lower threshold = more edges traversed
  // At detailLevel 0: only traverse edges with strength >= 0.8
  // At detailLevel 0.5: traverse edges with strength >= 0.4
  // At detailLevel 1: traverse all edges (strength >= 0)
  const minEdgeStrength = 0.8 - (detailLevel * 0.8);

  const { outgoing, incoming } = buildAdjacencyLists(fullGraph.edges);

  // Track visited nodes separately for each direction to ensure full exploration
  const outwardVisited = new Set<string>();
  const inwardVisited = new Set<string>();
  const nodeDistances = new Map<string, number>();

  // Always include focus node
  outwardVisited.add(focusNodeId);
  inwardVisited.add(focusNodeId);
  nodeDistances.set(focusNodeId, 0);

  // BFS for OUTWARD expansion (following outgoing edges: source → target)
  // Limited by outRadius slider
  const outwardQueue: [string, number][] = [[focusNodeId, 0]];
  while (outwardQueue.length > 0) {
    const [currentId, distance] = outwardQueue.shift()!;

    if (distance >= outRadius) continue;

    for (const edge of (outgoing.get(currentId) || [])) {
      const edgeStrength = edge.strength ?? 1;
      if (edgeStrength < minEdgeStrength) continue;

      if (!outwardVisited.has(edge.target)) {
        outwardVisited.add(edge.target);
        nodeDistances.set(edge.target, distance + 1);
        outwardQueue.push([edge.target, distance + 1]);
      }
    }
  }

  // BFS for INWARD expansion (following incoming edges: target ← source)
  // Limited by inRadius slider - uses separate visited set
  const inwardQueue: [string, number][] = [[focusNodeId, 0]];
  while (inwardQueue.length > 0) {
    const [currentId, distance] = inwardQueue.shift()!;

    if (distance >= inRadius) continue;

    for (const edge of (incoming.get(currentId) || [])) {
      const edgeStrength = edge.strength ?? 1;
      if (edgeStrength < minEdgeStrength) continue;

      if (!inwardVisited.has(edge.source)) {
        inwardVisited.add(edge.source);
        // Only set distance if not already set by outward BFS
        if (!nodeDistances.has(edge.source)) {
          nodeDistances.set(edge.source, distance + 1);
        }
        inwardQueue.push([edge.source, distance + 1]);
      }
    }
  }

  // Combine both visited sets
  const visited = new Set([...outwardVisited, ...inwardVisited]);

  // Collect nodes
  const nodeMap = new Map(fullGraph.nodes.map(n => [n.id, n]));
  const resultNodes: OntologyNode[] = [];
  for (const nodeId of visited) {
    const node = nodeMap.get(nodeId);
    if (node) {
      resultNodes.push(node);
    }
  }

  // Collect edges that connect visible nodes
  const resultEdges: OntologyEdge[] = [];
  for (const edge of fullGraph.edges) {
    if (visited.has(edge.source) && visited.has(edge.target)) {
      resultEdges.push(edge);
    }
  }

  return {
    nodes: resultNodes,
    edges: resultEdges,
    focusNodeId,
    nodeDistances,
  };
}

/**
 * Check if a node is at the boundary of the view (max distance from focus).
 */
export function isNodeAtBoundary(
  nodeId: string,
  viewGraph: ViewGraph,
  outRadius: number,
  inRadius: number
): boolean {
  const distance = viewGraph.nodeDistances.get(nodeId);
  if (distance === undefined) return false;
  return distance === outRadius || distance === inRadius;
}
