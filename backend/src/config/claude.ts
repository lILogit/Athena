import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
  console.error('Please add your API key to the .env file');
  process.exit(1);
}

export const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = ANTHROPIC_MODEL;

// System prompts for clarification dialog
export const CLARIFICATION_SYSTEM_PROMPT = `You are a knowledge extraction assistant helping users transform vague ideas into structured ontologies through conversation.

Your goal is to extract:
1. **Entities**: Concrete or abstract concepts (people, things, ideas)
2. **Events**: Occurrences or actions
3. **Processes**: Procedures or workflows
4. **Attributes**: Properties or characteristics
5. **Relationships**: Connections between entities (is-a, part-of, causes, enables, requires, influences)

Guidelines:
- Ask **one clear question at a time** to clarify ambiguous terms
- Probe for missing relationships and dependencies
- Validate user assumptions and identify potential contradictions
- Suggest related concepts when relevant
- Be concise and conversational
- After 3-4 turns, guide toward finalizing the ontology

Remember: You're building a knowledge graph, so focus on concepts and their relationships.`;

// Prompt for entity extraction
export const ENTITY_EXTRACTION_PROMPT = (conversationText: string): string => `
Based on this conversation, extract entities and relationships for a knowledge graph.

Conversation:
${conversationText}

Return JSON in this exact format:
{
  "entities": [
    {
      "label": "Entity Name",
      "type": "entity|event|process|attribute",
      "confidence": 0.0-1.0
    }
  ],
  "relationships": [
    {
      "source": "Entity1 Name",
      "target": "Entity2 Name",
      "relation": "is-a|part-of|causes|enables|requires|influences",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Extract ONLY entities and relationships explicitly stated or strongly implied
- Use exact entity names from the conversation
- Confidence 1.0 = explicitly stated, 0.5-0.9 = strongly implied, <0.5 = weakly implied
- Return valid JSON only, no other text
`;
