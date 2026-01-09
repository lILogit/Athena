import { NodeType } from '@kgs/shared';

export const NODE_COLORS: Record<NodeType, { bg: string; text: string; border: string }> = {
  entity: {
    bg: '#3B82F6',
    text: '#EFF6FF',
    border: '#2563EB',
  },
  event: {
    bg: '#F97316',
    text: '#FFF7ED',
    border: '#EA580C',
  },
  process: {
    bg: '#10B981',
    text: '#ECFDF5',
    border: '#059669',
  },
  attribute: {
    bg: '#8B5CF6',
    text: '#F5F3FF',
    border: '#7C3AED',
  },
};

export const EDGE_COLORS: Record<string, string> = {
  'is-a': '#1F2937',
  'part-of': '#6B7280',
  'causes': '#EF4444',
  'enables': '#10B981',
  'requires': '#F59E0B',
  'influences': '#8B5CF6',
};

export function getNodeColor(type: NodeType) {
  return NODE_COLORS[type] || NODE_COLORS.entity;
}

export function getEdgeColor(relation: string) {
  return EDGE_COLORS[relation] || EDGE_COLORS['is-a'];
}
