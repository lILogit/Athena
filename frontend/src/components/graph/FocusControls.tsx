import { useUI } from '../../store/UIContext';
import { useGraph } from '../../store/GraphContext';

interface FocusControlsProps {
  className?: string;
}

export default function FocusControls({ className = '' }: FocusControlsProps) {
  const {
    focusNodeId,
    outRadius,
    inRadius,
    detailLevel,
    setOutRadius,
    setInRadius,
    setDetailLevel,
    clearFocus,
  } = useUI();

  const { currentGraph } = useGraph();

  // Get the label of the focused node
  const focusedNodeLabel = focusNodeId
    ? currentGraph?.ontology_data.nodes.find(n => n.id === focusNodeId)?.label
    : null;

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Focus + Context</h3>
        {focusNodeId && (
          <button
            onClick={clearFocus}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear focus
          </button>
        )}
      </div>

      {/* Focus indicator */}
      <div className="mb-4 p-2 rounded bg-gray-50">
        {focusNodeId ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-sm text-gray-700 truncate" title={focusedNodeLabel || focusNodeId}>
              Focused: <span className="font-medium">{focusedNodeLabel || focusNodeId}</span>
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">
            Click a node to focus
          </span>
        )}
      </div>

      {/* Radius and detail controls - only show when focused */}
      {focusNodeId && (
        <div className="space-y-4">
          {/* Outward Radius */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                Expand outward
              </label>
              <span className="text-xs text-primary font-medium">
                {outRadius} {outRadius === 1 ? 'hop' : 'hops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">1</span>
              <input
                type="range"
                min="1"
                max="5"
                value={outRadius}
                onChange={(e) => setOutRadius(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400">5</span>
            </div>
          </div>

          {/* Inward Radius */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                Expand inward
              </label>
              <span className="text-xs text-primary font-medium">
                {inRadius} {inRadius === 1 ? 'hop' : 'hops'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">1</span>
              <input
                type="range"
                min="1"
                max="5"
                value={inRadius}
                onChange={(e) => setInRadius(parseInt(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400">5</span>
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                Level of detail
              </label>
              <span className="text-xs text-primary font-medium">
                {Math.round(detailLevel * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Low</span>
              <input
                type="range"
                min="0"
                max="100"
                value={detailLevel * 100}
                onChange={(e) => setDetailLevel(parseInt(e.target.value) / 100)}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-gray-400">High</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {detailLevel < 0.3 && 'Only strong connections'}
              {detailLevel >= 0.3 && detailLevel < 0.7 && 'Balanced view'}
              {detailLevel >= 0.7 && 'Include weak connections'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
