import { GraphArchetype } from '@kgs/shared';
import { useUI } from '../../store/UIContext';

interface ArchetypeOption {
  id: GraphArchetype;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

const archetypeOptions: ArchetypeOption[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Standard knowledge graph for organizing concepts and relationships',
    icon: '🔷',
    features: ['Flexible structure', 'Multiple layout options', 'Basic node types'],
  },
  {
    id: 'knowledge-mining',
    name: 'Knowledge Mining',
    description: 'Discover hidden patterns and connections across concepts',
    icon: '🔍',
    features: ['Cluster similar concepts', 'Pattern discovery', 'Force-directed layout', 'Connection-based sizing'],
  },
  {
    id: 'explanation',
    name: 'Explanation',
    description: 'Understand causal mechanisms with layered explanations',
    icon: '💡',
    features: ['Concentric layout', 'Complexity slider', 'Mechanism/example/analogy types', 'Layered understanding'],
  },
];

export default function ArchetypeSelector() {
  const { selectedArchetype, setSelectedArchetype, startClarificationPhase } = useUI();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Graph Type</h2>
      <p className="text-gray-600 mb-6">
        Select the type of knowledge graph that best fits your needs
      </p>

      <div className="grid gap-4">
        {archetypeOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedArchetype(option.id)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedArchetype === option.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{option.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {option.features.map((feature, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              {selectedArchetype === option.id && (
                <svg
                  className="w-5 h-5 text-primary flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={startClarificationPhase}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
