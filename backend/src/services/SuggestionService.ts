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
