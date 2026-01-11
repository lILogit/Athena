import { GraphArchetype } from '@kgs/shared';
import { useUI } from '../../store/UIContext';

interface ArchetypeOption {
  id: GraphArchetype;
  name: string;
  description: string;
  icon: string;
  features: string[];
  workflow: string[];
}

const archetypeOptions: ArchetypeOption[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Standard knowledge graph for organizing concepts and relationships',
    icon: '🔷',
    features: ['Flexible structure', 'Multiple layout options', 'Basic node types'],
    workflow: [
      '1. Add entities representing key concepts',
      '2. Connect related concepts with relationships',
      '3. Use different layouts to visualize structure',
      '4. Refine and expand as understanding grows',
    ],
  },
  {
    id: 'knowledge-mining',
    name: 'Knowledge Mining',
    description: 'Discover hidden patterns and connections across concepts',
    icon: '🔍',
    features: ['Cluster similar concepts', 'Pattern discovery', 'Force-directed layout', 'Connection-based sizing'],
    workflow: [
      '1. Add core concepts from your knowledge domain',
      '2. Identify clusters of related ideas',
      '3. Mark patterns that emerge across clusters',
      '4. Connect similar concepts with "similar-to" edges',
      '5. Use force layout to reveal hidden structures',
    ],
  },
  {
    id: 'explanation',
    name: 'Explanation',
    description: 'Understand causal mechanisms with layered explanations',
    icon: '💡',
    features: ['Concentric layout', 'Complexity slider', 'Mechanism/example/analogy types', 'Layered understanding'],
    workflow: [
      '1. Place the concept to explain at the center',
      '2. Add mechanisms that explain HOW it works',
      '3. Include examples that illustrate the concept',
      '4. Add analogies to familiar concepts',
      '5. Mark prerequisites for understanding',
      '6. Use complexity slider to control detail level',
    ],
  },
  {
    id: 'goal-achievement',
    name: 'Goal Achievement',
    description: 'Plan and track goals with milestones, actions, and obstacles',
    icon: '🎯',
    features: ['Goal hierarchy', 'Milestone tracking', 'Obstacle identification', 'Resource management', 'Progress status'],
    workflow: [
      '1. Define your main goal at the top',
      '2. Break it down into key milestones',
      '3. Add specific actions for each milestone',
      '4. Identify resources you need',
      '5. Map out potential obstacles',
      '6. Connect dependencies with "depends-on" edges',
      '7. Update status as you make progress',
    ],
  },
  {
    id: 'decision',
    name: 'Decision',
    description: 'Analyze decisions with options, criteria, outcomes, and risks',
    icon: '⚖️',
    features: ['Decision trees', 'Weighted criteria', 'Risk assessment', 'Outcome prediction', 'Option comparison'],
    workflow: [
      '1. State the decision point clearly',
      '2. List all available options',
      '3. Define criteria for evaluation',
      '4. Connect criteria to options with weights',
      '5. Map potential outcomes for each option',
      '6. Identify and assess risks',
      '7. Use "leads-to" edges to show consequences',
    ],
  },
  {
    id: 'prediction',
    name: 'Prediction',
    description: 'Model future scenarios based on trends, signals, and assumptions',
    icon: '🔮',
    features: ['Timeline layout', 'Trend analysis', 'Scenario planning', 'Confidence scoring', 'Forecast tracking'],
    workflow: [
      '1. Document key assumptions you\'re making',
      '2. Identify signals and early indicators',
      '3. Map current trends and their direction',
      '4. Create multiple scenarios (best/worst/likely)',
      '5. Add specific forecasts with confidence levels',
      '6. Connect with "predicts" and "indicates" edges',
      '7. Review and update as new data emerges',
    ],
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

      <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2">
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
                {/* Workflow steps - shown when selected */}
                {selectedArchetype === option.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Workflow Guide
                    </div>
                    <ul className="space-y-1">
                      {option.workflow.map((step, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{step.replace(/^\d+\.\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
