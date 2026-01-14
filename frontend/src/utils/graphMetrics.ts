import { OntologyNode, OntologyEdge } from '@kgs/shared';

export interface NodeMetrics {
  centrality: number;      // Degree centrality (0-1 normalized)
  inDegree: number;        // Incoming edge count
  outDegree: number;       // Outgoing edge count
}

/**
 * Compute degree centrality for all nodes in the graph.
 * Centrality = (inDegree + outDegree) / maxDegree, normalized to [0, 1]
 */
export function computeCentrality(
  nodes: OntologyNode[],
  edges: OntologyEdge[]
): Map<string, NodeMetrics> {
  const metrics = new Map<string, NodeMetrics>();

  // Initialize metrics for all nodes
  for (const node of nodes) {
    metrics.set(node.id, {
      centrality: 0,
      inDegree: 0,
      outDegree: 0,
    });
  }

  // Count degrees from edges
  for (const edge of edges) {
    const sourceMetrics = metrics.get(edge.source);
    const targetMetrics = metrics.get(edge.target);

    if (sourceMetrics) {
      sourceMetrics.outDegree++;
    }
    if (targetMetrics) {
      targetMetrics.inDegree++;
    }
  }

  // Find max degree for normalization
  let maxDegree = 0;
  for (const nodeMetrics of metrics.values()) {
    const totalDegree = nodeMetrics.inDegree + nodeMetrics.outDegree;
    if (totalDegree > maxDegree) {
      maxDegree = totalDegree;
    }
  }

  // Normalize centrality scores
  if (maxDegree > 0) {
    for (const nodeMetrics of metrics.values()) {
      const totalDegree = nodeMetrics.inDegree + nodeMetrics.outDegree;
      nodeMetrics.centrality = totalDegree / maxDegree;
    }
  }

  return metrics;
}

/**
 * Get the centrality score for a specific node.
 * Returns 0 if the node is not found.
 */
export function getNodeCentrality(
  nodeId: string,
  metrics: Map<string, NodeMetrics>
): number {
  return metrics.get(nodeId)?.centrality ?? 0;
}

/**
 * Get nodes sorted by centrality (highest first).
 */
export function getNodesByCentrality(
  nodes: OntologyNode[],
  metrics: Map<string, NodeMetrics>
): OntologyNode[] {
  return [...nodes].sort((a, b) => {
    const centralityA = metrics.get(a.id)?.centrality ?? 0;
    const centralityB = metrics.get(b.id)?.centrality ?? 0;
    return centralityB - centralityA;
  });
}
