import { claudeService } from './ClaudeService';
import { GraphArchetype, OntologyNode, OntologyEdge, ExtendedNodeType, ExtendedRelationType } from '@kgs/shared';

interface NodeSuggestion {
  label: string;
  type: ExtendedNodeType;
  description: string;
  confidence: number;
}

interface EdgeSuggestion {
  sourceLabel: string;
  targetLabel: string;
  relation: ExtendedRelationType;
  description: string;
}

interface ArchetypeSuggestions {
  nodes: NodeSuggestion[];
  edges: EdgeSuggestion[];
  insights: string[];
}

// Archetype-specific prompts
const ARCHETYPE_PROMPTS: Record<GraphArchetype, string> = {
  general: `You are helping build a general knowledge graph. Suggest entities, events, processes, or attributes that would enrich the graph.`,

  'knowledge-mining': `You are helping build a Knowledge Mining graph focused on discovering patterns and connections.
Suggest nodes using these extended types:
- cluster: Group of related concepts
- pattern: Recurring theme or structure
- entity: Core concept
- process: How things work

Focus on:
- Hidden connections between concepts
- Patterns that emerge from the data
- Clusters of related ideas
- Cross-domain connections`,

  explanation: `You are helping build an Explanation graph focused on understanding WHY something happens.
Suggest nodes using these extended types:
- mechanism: How/why something works (causal explanation)
- example: Concrete instance that illustrates the concept
- analogy: Comparison to familiar concept for understanding
- prerequisite: Required knowledge/concept
- entity: Core concept being explained

Focus on:
- Causal mechanisms (what causes what)
- Concrete examples that clarify abstract concepts
- Helpful analogies for complex ideas
- Prerequisites needed to understand the topic`,

  'goal-achievement': `You are helping build a Goal Achievement graph focused on planning and tracking progress toward objectives.
Suggest nodes using these extended types:
- goal: Main objective to achieve
- milestone: Key checkpoint toward the goal
- action: Specific step or task to perform
- resource: Asset, skill, or tool needed
- obstacle: Barrier or challenge to overcome

Focus on:
- Breaking down goals into achievable milestones
- Identifying concrete actions required
- Resources needed for success
- Potential obstacles and how to address them
- Dependencies between milestones and actions`,

  decision: `You are helping build a Decision graph focused on analyzing choices and their consequences.
Suggest nodes using these extended types:
- decision-point: The choice or question to be decided
- option: A possible choice or alternative
- criterion: A factor to consider when evaluating options
- outcome: A potential result of choosing an option
- risk: A potential negative consequence or uncertainty

Focus on:
- Clarifying the decision to be made
- Identifying all viable options
- Criteria for evaluation (cost, time, impact, etc.)
- Likely outcomes for each option
- Associated risks and how to mitigate them`,

  prediction: `You are helping build a Prediction graph focused on forecasting future scenarios.
Suggest nodes using these extended types:
- trend: An observed pattern or direction
- signal: An indicator or early warning sign
- scenario: A possible future state
- assumption: An underlying belief or premise
- forecast: A specific prediction about the future

Focus on:
- Current trends that may continue
- Signals that indicate change
- Multiple scenarios (best case, worst case, likely)
- Key assumptions and their validity
- Confidence levels for predictions`,
};

class SuggestionService {
  /**
   * Get AI-powered suggestions for nodes based on graph archetype and context
   */
  async getSuggestions(
    archetype: GraphArchetype,
    existingNodes: OntologyNode[],
    existingEdges: OntologyEdge[],
    userContext?: string
  ): Promise<ArchetypeSuggestions> {
    const archetypePrompt = ARCHETYPE_PROMPTS[archetype];

    const existingNodeLabels = existingNodes.map(n => `${n.label} (${n.extendedType || n.type})`).join(', ');
    const existingRelations = existingEdges.map(e => {
      const source = existingNodes.find(n => n.id === e.source)?.label || 'unknown';
      const target = existingNodes.find(n => n.id === e.target)?.label || 'unknown';
      return `${source} --[${e.extendedRelation || e.relation}]--> ${target}`;
    }).join('\n');

    const prompt = `${archetypePrompt}

Current graph has these nodes: ${existingNodeLabels || 'none yet'}

Current relationships:
${existingRelations || 'none yet'}

${userContext ? `User's focus/question: ${userContext}` : ''}

Based on this context, suggest:
1. 3-5 new nodes that would enrich this ${archetype} graph
2. 2-3 potential relationships between existing or new nodes
3. 1-2 insights about patterns or gaps in the current graph

Respond in this exact JSON format:
{
  "nodes": [
    {"label": "Node Name", "type": "mechanism|example|analogy|prerequisite|cluster|pattern|entity|process|event|attribute", "description": "Why this node is valuable", "confidence": 0.8}
  ],
  "edges": [
    {"sourceLabel": "Source Node", "targetLabel": "Target Node", "relation": "causes|explains|exemplifies|analogous-to|prerequisite-for|similar-to|clusters-with|enables|requires", "description": "Why this relationship matters"}
  ],
  "insights": [
    "Observation about the graph structure or missing elements"
  ]
}`;

    try {
      const response = await claudeService.sendMessage([
        { role: 'user', content: prompt, timestamp: Math.floor(Date.now() / 1000) }
      ]);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          insights: parsed.insights || [],
        };
      }

      return { nodes: [], edges: [], insights: [] };
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      return { nodes: [], edges: [], insights: [] };
    }
  }

  /**
   * Get quick node type suggestions based on archetype (no AI call)
   */
  getQuickNodeTypes(archetype: GraphArchetype): Array<{ type: ExtendedNodeType; label: string; icon: string }> {
    switch (archetype) {
      case 'knowledge-mining':
        return [
          { type: 'entity', label: 'Entity', icon: '📦' },
          { type: 'cluster', label: 'Cluster', icon: '🔷' },
          { type: 'pattern', label: 'Pattern', icon: '✨' },
          { type: 'process', label: 'Process', icon: '⚙️' },
        ];
      case 'explanation':
        return [
          { type: 'entity', label: 'Concept', icon: '📦' },
          { type: 'mechanism', label: 'Mechanism', icon: '⚙️' },
          { type: 'example', label: 'Example', icon: '📝' },
          { type: 'analogy', label: 'Analogy', icon: '💡' },
          { type: 'prerequisite', label: 'Prerequisite', icon: '🔒' },
        ];
      case 'goal-achievement':
        return [
          { type: 'goal', label: 'Goal', icon: '🎯' },
          { type: 'milestone', label: 'Milestone', icon: '🏁' },
          { type: 'action', label: 'Action', icon: '▶️' },
          { type: 'resource', label: 'Resource', icon: '🔧' },
          { type: 'obstacle', label: 'Obstacle', icon: '🚧' },
        ];
      case 'decision':
        return [
          { type: 'decision-point', label: 'Decision Point', icon: '⚖️' },
          { type: 'option', label: 'Option', icon: '🔘' },
          { type: 'criterion', label: 'Criterion', icon: '📋' },
          { type: 'outcome', label: 'Outcome', icon: '🎁' },
          { type: 'risk', label: 'Risk', icon: '⚠️' },
        ];
      case 'prediction':
        return [
          { type: 'trend', label: 'Trend', icon: '📈' },
          { type: 'signal', label: 'Signal', icon: '📡' },
          { type: 'scenario', label: 'Scenario', icon: '🎬' },
          { type: 'assumption', label: 'Assumption', icon: '💭' },
          { type: 'forecast', label: 'Forecast', icon: '🔮' },
        ];
      default:
        return [
          { type: 'entity', label: 'Entity', icon: '📦' },
          { type: 'event', label: 'Event', icon: '📅' },
          { type: 'process', label: 'Process', icon: '⚙️' },
          { type: 'attribute', label: 'Attribute', icon: '🏷️' },
        ];
    }
  }

  /**
   * Get quick edge type suggestions based on archetype (no AI call)
   */
  getQuickEdgeTypes(archetype: GraphArchetype): Array<{ type: ExtendedRelationType; label: string }> {
    switch (archetype) {
      case 'knowledge-mining':
        return [
          { type: 'similar-to', label: 'Similar To' },
          { type: 'clusters-with', label: 'Clusters With' },
          { type: 'influences', label: 'Influences' },
          { type: 'is-a', label: 'Is A' },
          { type: 'part-of', label: 'Part Of' },
        ];
      case 'explanation':
        return [
          { type: 'causes', label: 'Causes' },
          { type: 'explains', label: 'Explains' },
          { type: 'exemplifies', label: 'Exemplifies' },
          { type: 'analogous-to', label: 'Analogous To' },
          { type: 'prerequisite-for', label: 'Prerequisite For' },
          { type: 'enables', label: 'Enables' },
        ];
      case 'goal-achievement':
        return [
          { type: 'achieves', label: 'Achieves' },
          { type: 'blocks', label: 'Blocks' },
          { type: 'depends-on', label: 'Depends On' },
          { type: 'milestone-of', label: 'Milestone Of' },
          { type: 'requires-resource', label: 'Requires Resource' },
          { type: 'enables', label: 'Enables' },
        ];
      case 'decision':
        return [
          { type: 'leads-to', label: 'Leads To' },
          { type: 'evaluates', label: 'Evaluates' },
          { type: 'mitigates', label: 'Mitigates' },
          { type: 'conflicts-with', label: 'Conflicts With' },
          { type: 'supports', label: 'Supports' },
        ];
      case 'prediction':
        return [
          { type: 'predicts', label: 'Predicts' },
          { type: 'indicates', label: 'Indicates' },
          { type: 'assumes', label: 'Assumes' },
          { type: 'impacts', label: 'Impacts' },
          { type: 'derives-from', label: 'Derives From' },
        ];
      default:
        return [
          { type: 'is-a', label: 'Is A' },
          { type: 'part-of', label: 'Part Of' },
          { type: 'causes', label: 'Causes' },
          { type: 'enables', label: 'Enables' },
          { type: 'requires', label: 'Requires' },
          { type: 'influences', label: 'Influences' },
        ];
    }
  }
}

export const suggestionService = new SuggestionService();
