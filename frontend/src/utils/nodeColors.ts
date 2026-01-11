import { NodeType, ExtendedNodeType } from '@kgs/shared';

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

// Explanation graph extended node colors
export const EXPLANATION_NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  mechanism: {
    bg: '#3B82F6',
    text: '#EFF6FF',
    border: '#2563EB',
  },
  example: {
    bg: '#10B981',
    text: '#ECFDF5',
    border: '#059669',
  },
  analogy: {
    bg: '#F59E0B',
    text: '#FFF7ED',
    border: '#D97706',
  },
  prerequisite: {
    bg: '#6B7280',
    text: '#F9FAFB',
    border: '#4B5563',
  },
};

// Knowledge Mining graph extended node colors
export const KNOWLEDGE_MINING_NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cluster: {
    bg: '#8B5CF6',
    text: '#F5F3FF',
    border: '#7C3AED',
  },
  pattern: {
    bg: '#F59E0B',
    text: '#FFF7ED',
    border: '#D97706',
  },
};

// Goal Achievement graph extended node colors
export const GOAL_ACHIEVEMENT_NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  goal: {
    bg: '#10B981',
    text: '#ECFDF5',
    border: '#059669',
  },
  milestone: {
    bg: '#3B82F6',
    text: '#EFF6FF',
    border: '#2563EB',
  },
  obstacle: {
    bg: '#EF4444',
    text: '#FEF2F2',
    border: '#DC2626',
  },
  resource: {
    bg: '#F59E0B',
    text: '#FFF7ED',
    border: '#D97706',
  },
  action: {
    bg: '#8B5CF6',
    text: '#F5F3FF',
    border: '#7C3AED',
  },
};

// Decision graph extended node colors
export const DECISION_NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'decision-point': {
    bg: '#F59E0B',
    text: '#FFF7ED',
    border: '#D97706',
  },
  option: {
    bg: '#3B82F6',
    text: '#EFF6FF',
    border: '#2563EB',
  },
  criterion: {
    bg: '#8B5CF6',
    text: '#F5F3FF',
    border: '#7C3AED',
  },
  outcome: {
    bg: '#10B981',
    text: '#ECFDF5',
    border: '#059669',
  },
  risk: {
    bg: '#EF4444',
    text: '#FEF2F2',
    border: '#DC2626',
  },
};

// Prediction graph extended node colors
export const PREDICTION_NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  trend: {
    bg: '#3B82F6',
    text: '#EFF6FF',
    border: '#2563EB',
  },
  signal: {
    bg: '#F59E0B',
    text: '#FFF7ED',
    border: '#D97706',
  },
  scenario: {
    bg: '#8B5CF6',
    text: '#F5F3FF',
    border: '#7C3AED',
  },
  assumption: {
    bg: '#6B7280',
    text: '#F9FAFB',
    border: '#4B5563',
  },
  forecast: {
    bg: '#10B981',
    text: '#ECFDF5',
    border: '#059669',
  },
};

// Domain-based colors for Knowledge Mining
export const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  science: { bg: '#3B82F6', text: '#EFF6FF', border: '#2563EB' },
  philosophy: { bg: '#8B5CF6', text: '#F5F3FF', border: '#7C3AED' },
  technology: { bg: '#10B981', text: '#ECFDF5', border: '#059669' },
  art: { bg: '#EC4899', text: '#FDF2F8', border: '#DB2777' },
  history: { bg: '#F97316', text: '#FFF7ED', border: '#EA580C' },
  default: { bg: '#6B7280', text: '#F9FAFB', border: '#4B5563' },
};

export const EDGE_COLORS: Record<string, string> = {
  'is-a': '#1F2937',
  'part-of': '#6B7280',
  'causes': '#EF4444',
  'enables': '#10B981',
  'requires': '#F59E0B',
  'influences': '#8B5CF6',
  // Knowledge Mining
  'similar-to': '#3B82F6',
  'clusters-with': '#8B5CF6',
  // Explanation
  'explains': '#10B981',
  'exemplifies': '#10B981',
  'analogous-to': '#F59E0B',
  'prerequisite-for': '#6B7280',
  // Goal Achievement
  'achieves': '#10B981',
  'blocks': '#EF4444',
  'depends-on': '#F59E0B',
  'milestone-of': '#3B82F6',
  'requires-resource': '#8B5CF6',
  // Decision
  'leads-to': '#3B82F6',
  'evaluates': '#8B5CF6',
  'mitigates': '#10B981',
  'conflicts-with': '#EF4444',
  'supports': '#10B981',
  // Prediction
  'predicts': '#3B82F6',
  'indicates': '#F59E0B',
  'assumes': '#6B7280',
  'impacts': '#EF4444',
  'derives-from': '#8B5CF6',
};

export function getNodeColor(type: NodeType) {
  return NODE_COLORS[type] || NODE_COLORS.entity;
}

export function getExtendedNodeColor(extendedType: ExtendedNodeType | undefined, baseType: NodeType) {
  if (!extendedType) {
    return getNodeColor(baseType);
  }

  // Check explanation colors
  if (EXPLANATION_NODE_COLORS[extendedType]) {
    return EXPLANATION_NODE_COLORS[extendedType];
  }

  // Check knowledge mining colors
  if (KNOWLEDGE_MINING_NODE_COLORS[extendedType]) {
    return KNOWLEDGE_MINING_NODE_COLORS[extendedType];
  }

  // Check goal achievement colors
  if (GOAL_ACHIEVEMENT_NODE_COLORS[extendedType]) {
    return GOAL_ACHIEVEMENT_NODE_COLORS[extendedType];
  }

  // Check decision colors
  if (DECISION_NODE_COLORS[extendedType]) {
    return DECISION_NODE_COLORS[extendedType];
  }

  // Check prediction colors
  if (PREDICTION_NODE_COLORS[extendedType]) {
    return PREDICTION_NODE_COLORS[extendedType];
  }

  // Fall back to base type
  return getNodeColor(baseType);
}

export function getDomainColor(domain: string | undefined) {
  if (!domain) return DOMAIN_COLORS.default;
  return DOMAIN_COLORS[domain.toLowerCase()] || DOMAIN_COLORS.default;
}

export function getEdgeColor(relation: string) {
  return EDGE_COLORS[relation] || EDGE_COLORS['is-a'];
}

/**
 * Calculate node size based on connection count for Knowledge Mining graphs
 */
export function getNodeSize(connectionCount: number): { width: number; height: number } {
  const baseWidth = 180;
  const baseHeight = 70;
  const scale = Math.min(1 + connectionCount * 0.1, 2); // Max 2x size
  return {
    width: Math.round(baseWidth * scale),
    height: Math.round(baseHeight * scale),
  };
}
