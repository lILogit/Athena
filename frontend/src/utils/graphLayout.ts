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
