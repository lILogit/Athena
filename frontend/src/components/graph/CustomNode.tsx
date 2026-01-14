import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { OntologyNode } from '@kgs/shared';
import { getNodeColor, getExtendedNodeColor, getDomainColor, getNodeSize } from '../../utils/nodeColors';
import { useUI } from '../../store/UIContext';

const handleStyle = "!w-2 !h-2 !min-w-0 !min-h-0 !bg-gray-400 hover:!bg-gray-600 hover:!scale-150 !transition-all";

// Icons for extended types
const extendedTypeIcons: Record<string, string> = {
  mechanism: '⚙️',
  example: '📝',
  analogy: '💡',
  prerequisite: '🔒',
  cluster: '🔷',
  pattern: '✨',
};

function CustomNode({ data, selected }: NodeProps<OntologyNode>) {
  // Get focus state
  const { focusNodeId } = useUI();
  const isFocused = data.id === focusNodeId;

  // Get colors based on extended type, domain, or base type
  const metadata = data.archetypeMetadata;
  const extendedType = data.extendedType;

  let colors;
  if (extendedType) {
    colors = getExtendedNodeColor(extendedType, data.type);
  } else if (metadata?.domain) {
    colors = getDomainColor(metadata.domain);
  } else {
    colors = getNodeColor(data.type);
  }

  // Calculate dynamic size for Knowledge Mining graphs
  const connectionCount = metadata?.connectionCount || 0;
  const nodeSize = connectionCount > 0 ? getNodeSize(connectionCount) : { width: 180, height: 70 };

  // Get layer info for Explanation graphs
  const explanationLayer = metadata?.explanationLayer;

  // Get icon for extended type
  const typeIcon = extendedType ? extendedTypeIcons[extendedType] : null;

  return (
    <div
      className={`relative px-4 py-3 rounded-lg shadow-lg transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${extendedType === 'cluster' ? 'border-2 border-dashed' : ''} ${
        isFocused ? 'ring-4 ring-purple-500 ring-offset-2 shadow-purple-500/50 shadow-xl' : ''
      }`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: extendedType === 'cluster' ? colors.border : undefined,
        minWidth: `${nodeSize.width}px`,
        maxWidth: `${nodeSize.width + 40}px`,
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

      {/* Focus badge */}
      {isFocused && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-medium"
          title="Focus node - double-click to clear"
        >
          Focus
        </div>
      )}

      {/* Layer badge for Explanation graphs */}
      {explanationLayer !== undefined && explanationLayer >= 0 && !isFocused && (
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-medium"
          title={`Layer ${explanationLayer}`}
        >
          {explanationLayer}
        </div>
      )}

      {/* Node label with optional icon */}
      <div className="font-medium text-sm mb-1 break-words flex items-center gap-1">
        {typeIcon && <span>{typeIcon}</span>}
        {data.label}
      </div>

      <div className="flex items-center justify-between text-xs opacity-80">
        <span className="capitalize">{extendedType || data.type}</span>
        <span>{(data.confidence * 100).toFixed(0)}%</span>
      </div>

      {/* Connection count badge for Knowledge Mining */}
      {connectionCount > 0 && (
        <div className="mt-1 text-xs opacity-70">
          {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Domain badge */}
      {metadata?.domain && (
        <div className="mt-1 text-xs px-1.5 py-0.5 bg-white/20 rounded inline-block">
          {metadata.domain}
        </div>
      )}

      {data.source === 'inferred' && (
        <div className="mt-1 text-xs opacity-70 italic">Inferred</div>
      )}
    </div>
  );
}

export default memo(CustomNode);
