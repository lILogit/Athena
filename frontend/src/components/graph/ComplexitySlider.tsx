import { useGraph } from '../../store/GraphContext';

interface ComplexitySliderProps {
  className?: string;
}

const complexityLabels = ['Simple', 'Basic', 'Moderate', 'Advanced', 'Expert'];

export default function ComplexitySlider({ className = '' }: ComplexitySliderProps) {
  const { currentGraph, setComplexityLevel } = useGraph();

  // Only show for explanation graphs
  if (!currentGraph || currentGraph.archetype !== 'explanation') {
    return null;
  }

  const currentLevel = currentGraph.archetypeConfig?.displayOptions?.complexityLevel ?? 3;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseInt(e.target.value, 10);
    setComplexityLevel(level);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Complexity Level
        </label>
        <span className="text-sm text-primary font-medium">
          {complexityLabels[currentLevel - 1]}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">1</span>
        <input
          type="range"
          min="1"
          max="5"
          value={currentLevel}
          onChange={handleChange}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span className="text-xs text-gray-500">5</span>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {currentLevel === 1 && 'Show only core concepts'}
        {currentLevel === 2 && 'Include basic explanations'}
        {currentLevel === 3 && 'Standard detail level'}
        {currentLevel === 4 && 'Include mechanisms and examples'}
        {currentLevel === 5 && 'Full complexity with analogies'}
      </p>
    </div>
  );
}
