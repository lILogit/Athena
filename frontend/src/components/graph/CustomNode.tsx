import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OntologyNode } from '@kgs/shared';
import { getNodeColor } from '../../utils/nodeColors';

function CustomNode({ data, selected }: NodeProps<OntologyNode>) {
  const colors = getNodeColor(data.type);

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-lg transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        minWidth: '180px',
        maxWidth: '220px',
        opacity: 0.85 + data.confidence * 0.15, // 85% to 100% based on confidence
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-2 !h-2"
      />

      <div className="font-medium text-sm mb-1 break-words">{data.label}</div>

      <div className="flex items-center justify-between text-xs opacity-80">
        <span className="capitalize">{data.type}</span>
        <span>{(data.confidence * 100).toFixed(0)}%</span>
      </div>

      {data.source === 'inferred' && (
        <div className="mt-1 text-xs opacity-70 italic">Inferred</div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !w-2 !h-2"
      />
    </div>
  );
}

export default memo(CustomNode);
