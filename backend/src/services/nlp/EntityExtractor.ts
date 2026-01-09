import { claudeService } from '../ClaudeService';
import { ExtractedEntity, NodeType } from '@kgs/shared';
import { logger } from '../../utils/logger';

interface EntityExtractionResult {
  entities: Array<{
    label: string;
    type: NodeType;
    confidence: number;
  }>;
}

export class EntityExtractor {
  /**
   * Extract entities from conversation text
   */
  async extractEntities(conversationText: string): Promise<ExtractedEntity[]> {
    const prompt = this.buildExtractionPrompt(conversationText);

    try {
      const result = await claudeService.withRetry(async () => {
        return await claudeService.extractStructuredData<EntityExtractionResult>(prompt);
      });

      logger.info('Extracted entities', {
        count: result.entities?.length || 0,
      });

      return result.entities || [];
    } catch (error) {
      logger.error('Entity extraction failed', { error });
      return [];
    }
  }

  /**
   * Build prompt for entity extraction
   */
  private buildExtractionPrompt(conversationText: string): string {
    return `Extract entities from this conversation for a knowledge graph.

Conversation:
${conversationText}

Identify:
- **Entities**: Concrete or abstract concepts (people, places, things, ideas)
- **Events**: Occurrences, actions, or happenings
- **Processes**: Procedures, workflows, or sequences of actions
- **Attributes**: Properties, characteristics, or qualities

Return JSON in this exact format:
{
  "entities": [
    {
      "label": "Exact entity name from conversation",
      "type": "entity|event|process|attribute",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Extract ONLY entities explicitly stated or strongly implied
- Use exact names from the conversation
- Confidence: 1.0 = explicitly stated, 0.7-0.9 = strongly implied, 0.5-0.6 = weakly implied
- Avoid duplicates
- Return valid JSON only, no other text`;
  }

  /**
   * Merge new entities with existing ones, avoiding duplicates
   */
  mergeEntities(
    existing: ExtractedEntity[],
    newEntities: ExtractedEntity[]
  ): ExtractedEntity[] {
    const merged = [...existing];
    const existingLabels = new Set(existing.map(e => e.label.toLowerCase()));

    for (const entity of newEntities) {
      if (!existingLabels.has(entity.label.toLowerCase())) {
        merged.push(entity);
        existingLabels.add(entity.label.toLowerCase());
      } else {
        // Update confidence if new entity has higher confidence
        const existingIndex = merged.findIndex(
          e => e.label.toLowerCase() === entity.label.toLowerCase()
        );
        if (existingIndex >= 0 && entity.confidence > merged[existingIndex].confidence) {
          merged[existingIndex] = entity;
        }
      }
    }

    return merged;
  }
}

export const entityExtractor = new EntityExtractor();
