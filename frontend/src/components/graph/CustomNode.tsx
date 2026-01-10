import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OntologyNode } from '@kgs/shared';
import { getNodeColor } from '../../utils/nodeColors';

const handleStyle = "!w-2 !h-2 !min-w-0 !min-h-0 !bg-gray-400 hover:!bg-gray-600 hover:!scale-150 !transition-all";

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
        opacity: 0.85 + data.confidence * 0.15,
      }}
    >
      {/* Top handles - left and right positions */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-left"
        className={handleStyle}
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-right"
        className={handleStyle}
        style={{ left: '75%' }}
      />

      {/* Bottom handles - left and right positions */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-left"
        className={handleStyle}
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-right"
        className={handleStyle}
        style={{ left: '75%' }}
      />

      {/* Left handles - top and bottom positions */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-top"
        className={handleStyle}
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-bottom"
        className={handleStyle}
        style={{ top: '70%' }}
      />

      {/* Right handles - top and bottom positions */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-top"
        className={handleStyle}
        style={{ top: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-bottom"
        className={handleStyle}
        style={{ top: '70%' }}
      />

      <div className="font-medium text-sm mb-1 break-words">{data.label}</div>

      <div className="flex items-center justify-between text-xs opacity-80">
        <span className="capitalize">{data.type}</span>
        <span>{(data.confidence * 100).toFixed(0)}%</span>
      </div>

      {data.source === 'inferred' && (
        <div className="mt-1 text-xs opacity-70 italic">Inferred</div>
      )}
    </div>
  );
}

export default memo(CustomNode);
