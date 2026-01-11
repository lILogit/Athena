import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { OntologyEdge } from '@kgs/shared';
import { getEdgeColor } from '../../utils/nodeColors';

// Icons for extended relation types
const extendedRelationIcons: Record<string, string> = {
  'similar-to': '≈',
  'clusters-with': '◆',
  'explains': '→',
  'exemplifies': '✓',
  'analogous-to': '≃',
  'prerequisite-for': '◀',
};

// Explanation type styles
const explanationTypeStyles: Record<string, { dasharray?: string; opacity: number }> = {
  causal: { opacity: 1 },
  compositional: { dasharray: '8,4', opacity: 0.9 },
  analogical: { dasharray: '4,4', opacity: 0.8 },
};

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<OntologyEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Safe defaults if data is undefined
  const relation = data?.relation || 'influences';
  const extendedRelation = data?.extendedRelation;
  const strength = data?.strength ?? 0.5;
  const metadata = data?.archetypeMetadata;

  // Use extended relation for color if available
  const displayRelation = extendedRelation || relation;
  const edgeColor = getEdgeColor(displayRelation);

  // Calculate stroke width based on archetype metadata
  let strokeWidth = 1 + strength * 2; // Default: 1-3px based on strength

  // Knowledge Mining: use similarity score for thickness
  if (metadata?.similarityScore !== undefined) {
    strokeWidth = 1 + metadata.similarityScore * 3; // 1-4px based on similarity
  }

  // Determine dash array based on various conditions
  let strokeDasharray: string | undefined;

  // Inferred edges get dotted lines
  if (metadata?.isInferred) {
    strokeDasharray = '3,3';
  }
  // Explanation type styles override
  else if (metadata?.explanationType) {
    strokeDasharray = explanationTypeStyles[metadata.explanationType]?.dasharray;
  }
  // Low strength edges get dashed lines
  else if (strength < 0.5) {
    strokeDasharray = '5,5';
  }

  // Calculate opacity based on explanation type or selection state
  let opacity = selected ? 1 : 0.6;
  if (metadata?.explanationType) {
    const baseOpacity = explanationTypeStyles[metadata.explanationType]?.opacity ?? 0.9;
    opacity = selected ? 1 : baseOpacity * 0.8;
  }

  // Get icon for extended relation
  const relationIcon = extendedRelation ? extendedRelationIcons[extendedRelation] : null;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="none"
        markerEnd={`url(#arrow-${id})`}
        style={{ opacity }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`text-xs bg-white px-2 py-1 rounded border shadow-sm font-medium nodrag nopan ${
            metadata?.isInferred ? 'border-dashed border-gray-400 italic' : 'border-gray-300'
          }`}
        >
          {relationIcon && <span className="mr-1">{relationIcon}</span>}
          {displayRelation}
          {metadata?.isInferred && <span className="ml-1 text-gray-400">(inferred)</span>}
        </div>
      </EdgeLabelRenderer>

      {/* Arrow marker definition - unique per edge to avoid conflicts */}
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={edgeColor} />
        </marker>
      </defs>
    </>
  );
}

export default memo(CustomEdge);
