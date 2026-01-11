import { useState } from 'react';
import { GraphArchetype } from '@kgs/shared';

interface WorkflowGuide {
  steps: string[];
  tips: string[];
  nodeTypes: { type: string; description: string; icon: string }[];
  edgeTypes: { type: string; description: string }[];
}

const ARCHETYPE_GUIDES: Record<GraphArchetype, WorkflowGuide> = {
  general: {
    steps: [
      'Add entities representing key concepts',
      'Connect related concepts with relationships',
      'Use different layouts to visualize structure',
      'Refine and expand as understanding grows',
    ],
    tips: [
      'Start with the most important concepts',
      'Use meaningful relationship labels',
      'Try different layouts to find the best view',
    ],
    nodeTypes: [
      { type: 'entity', description: 'A concept, thing, or idea', icon: '📦' },
      { type: 'event', description: 'Something that happens', icon: '📅' },
      { type: 'process', description: 'A sequence of actions', icon: '⚙️' },
      { type: 'attribute', description: 'A property or quality', icon: '🏷️' },
    ],
    edgeTypes: [
      { type: 'is-a', description: 'Taxonomic relationship (X is a type of Y)' },
      { type: 'part-of', description: 'Compositional (X is part of Y)' },
      { type: 'causes', description: 'Causal relationship' },
      { type: 'influences', description: 'One affects the other' },
    ],
  },
  'knowledge-mining': {
    steps: [
      'Add core concepts from your domain',
      'Identify clusters of related ideas',
      'Mark patterns across clusters',
      'Connect similar concepts',
      'Use force layout to reveal structures',
    ],
    tips: [
      'Look for hidden connections between domains',
      'Group similar concepts into clusters',
      'Larger nodes = more connections',
    ],
    nodeTypes: [
      { type: 'entity', description: 'Core concept', icon: '📦' },
      { type: 'cluster', description: 'Group of related concepts', icon: '🔷' },
      { type: 'pattern', description: 'Recurring theme', icon: '✨' },
      { type: 'process', description: 'How things work', icon: '⚙️' },
    ],
    edgeTypes: [
      { type: 'similar-to', description: 'Concepts that are alike' },
      { type: 'clusters-with', description: 'Belongs to same group' },
      { type: 'influences', description: 'Affects another concept' },
    ],
  },
  explanation: {
    steps: [
      'Place central concept at center',
      'Add mechanisms (HOW it works)',
      'Include illustrative examples',
      'Add analogies to familiar concepts',
      'Mark prerequisites',
      'Adjust complexity with slider',
    ],
    tips: [
      'Work from center outward',
      'Use examples to clarify abstract ideas',
      'Analogies help understanding',
    ],
    nodeTypes: [
      { type: 'entity', description: 'Concept being explained', icon: '📦' },
      { type: 'mechanism', description: 'How/why something works', icon: '⚙️' },
      { type: 'example', description: 'Concrete illustration', icon: '📝' },
      { type: 'analogy', description: 'Comparison to familiar', icon: '💡' },
      { type: 'prerequisite', description: 'Required knowledge', icon: '🔒' },
    ],
    edgeTypes: [
      { type: 'explains', description: 'Provides explanation for' },
      { type: 'exemplifies', description: 'Is an example of' },
      { type: 'analogous-to', description: 'Similar to (for understanding)' },
      { type: 'prerequisite-for', description: 'Must understand first' },
    ],
  },
  'goal-achievement': {
    steps: [
      'Define your main goal at top',
      'Break down into milestones',
      'Add specific actions',
      'Identify needed resources',
      'Map potential obstacles',
      'Connect dependencies',
      'Update status as you progress',
    ],
    tips: [
      'Be specific with goals and actions',
      'Identify obstacles early',
      'Track resource requirements',
    ],
    nodeTypes: [
      { type: 'goal', description: 'Main objective', icon: '🎯' },
      { type: 'milestone', description: 'Key checkpoint', icon: '🏁' },
      { type: 'action', description: 'Specific task', icon: '▶️' },
      { type: 'resource', description: 'Asset or tool needed', icon: '🔧' },
      { type: 'obstacle', description: 'Barrier to overcome', icon: '🚧' },
    ],
    edgeTypes: [
      { type: 'achieves', description: 'Contributes to achieving' },
      { type: 'blocks', description: 'Prevents or hinders' },
      { type: 'depends-on', description: 'Requires completion of' },
      { type: 'milestone-of', description: 'Is a milestone toward' },
      { type: 'requires-resource', description: 'Needs this resource' },
    ],
  },
  decision: {
    steps: [
      'State the decision clearly',
      'List all options',
      'Define evaluation criteria',
      'Connect criteria to options',
      'Map potential outcomes',
      'Identify risks',
      'Show consequences with edges',
    ],
    tips: [
      'Consider all viable options',
      'Weight criteria by importance',
      'Assess risks for each option',
    ],
    nodeTypes: [
      { type: 'decision-point', description: 'The choice to make', icon: '⚖️' },
      { type: 'option', description: 'A possible choice', icon: '🔘' },
      { type: 'criterion', description: 'Evaluation factor', icon: '📋' },
      { type: 'outcome', description: 'Potential result', icon: '🎁' },
      { type: 'risk', description: 'Potential negative', icon: '⚠️' },
    ],
    edgeTypes: [
      { type: 'leads-to', description: 'Results in' },
      { type: 'evaluates', description: 'Used to assess' },
      { type: 'mitigates', description: 'Reduces risk of' },
      { type: 'conflicts-with', description: 'Incompatible with' },
      { type: 'supports', description: 'Strengthens or enables' },
    ],
  },
  prediction: {
    steps: [
      'Document key assumptions',
      'Identify signals and indicators',
      'Map current trends',
      'Create multiple scenarios',
      'Add forecasts with confidence',
      'Connect with prediction edges',
      'Review as new data emerges',
    ],
    tips: [
      'Be explicit about assumptions',
      'Consider multiple scenarios',
      'Assign confidence levels',
    ],
    nodeTypes: [
      { type: 'trend', description: 'Observed pattern', icon: '📈' },
      { type: 'signal', description: 'Early indicator', icon: '📡' },
      { type: 'scenario', description: 'Possible future', icon: '🎬' },
      { type: 'assumption', description: 'Underlying belief', icon: '💭' },
      { type: 'forecast', description: 'Specific prediction', icon: '🔮' },
    ],
    edgeTypes: [
      { type: 'predicts', description: 'Suggests will happen' },
      { type: 'indicates', description: 'Is a signal for' },
      { type: 'assumes', description: 'Based on assumption' },
      { type: 'impacts', description: 'Affects the outcome' },
      { type: 'derives-from', description: 'Follows from' },
    ],
  },
};

interface ArchetypeHelpPanelProps {
  archetype: GraphArchetype;
}

export default function ArchetypeHelpPanel({ archetype }: ArchetypeHelpPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'nodes' | 'edges'>('workflow');

  const guide = ARCHETYPE_GUIDES[archetype];

  if (!guide) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-64">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Workflow Guide</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium ${
                activeTab === 'workflow'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Steps
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium ${
                activeTab === 'nodes'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nodes
            </button>
            <button
              onClick={() => setActiveTab('edges')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium ${
                activeTab === 'edges'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Edges
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {activeTab === 'workflow' && (
              <div className="space-y-3">
                <ol className="space-y-2">
                  {guide.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {guide.tips.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Tips</div>
                    <ul className="space-y-1">
                      {guide.tips.map((tip, index) => (
                        <li key={index} className="text-xs text-gray-500 flex items-start gap-1">
                          <span className="text-amber-500">💡</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'nodes' && (
              <div className="space-y-2">
                {guide.nodeTypes.map((nodeType, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm">{nodeType.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-gray-700 capitalize">{nodeType.type}</div>
                      <div className="text-[10px] text-gray-500">{nodeType.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'edges' && (
              <div className="space-y-2">
                {guide.edgeTypes.map((edgeType, index) => (
                  <div key={index}>
                    <div className="text-xs font-medium text-gray-700">{edgeType.type}</div>
                    <div className="text-[10px] text-gray-500">{edgeType.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
