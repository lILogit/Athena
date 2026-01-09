import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { OntologyEdge } from '@kgs/shared';
import { getEdgeColor } from '../../utils/nodeColors';

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

  const edgeColor = getEdgeColor(data?.relation || 'influences');
  const strokeWidth = 1 + (data?.strength || 0.5) * 2; // 1-3px based on strength

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={edgeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={(data?.strength || 0.5) < 0.5 ? '5,5' : undefined}
        fill="none"
        markerEnd="url(#arrow)"
        style={{
          opacity: selected ? 1 : 0.6,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="text-xs bg-white px-2 py-1 rounded border border-gray-300 shadow-sm font-medium"
        >
          {data?.relation || 'influences'}
        </div>
      </EdgeLabelRenderer>

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrow"
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
