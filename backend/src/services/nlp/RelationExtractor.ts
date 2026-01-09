import { claudeService } from '../ClaudeService';
import { ExtractedRelationship, RelationType } from '@kgs/shared';
import { logger } from '../../utils/logger';

interface RelationExtractionResult {
  relationships: Array<{
    source: string;
    target: string;
    relation: RelationType;
    confidence: number;
  }>;
}

export class RelationExtractor {
  /**
   * Extract relationships from conversation text
   */
  async extractRelationships(
    conversationText: string,
    knownEntities: string[]
  ): Promise<ExtractedRelationship[]> {
    const prompt = this.buildExtractionPrompt(conversationText, knownEntities);

    try {
      const result = await claudeService.withRetry(async () => {
        return await claudeService.extractStructuredData<RelationExtractionResult>(prompt);
      });

      logger.info('Extracted relationships', {
        count: result.relationships?.length || 0,
      });

      return result.relationships || [];
    } catch (error) {
      logger.error('Relationship extraction failed', { error });
      return [];
    }
  }

  /**
   * Build prompt for relationship extraction
   */
  private buildExtractionPrompt(
    conversationText: string,
    knownEntities: string[]
  ): string {
    return `Extract relationships between entities from this conversation.

Conversation:
${conversationText}

Known entities:
${knownEntities.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Identify relationships between these entities:
- **is-a**: Taxonomic/hierarchical (e.g., "Dog is-a Animal")
- **part-of**: Compositional (e.g., "Wheel part-of Car")
- **causes**: Causal (e.g., "Heat causes Expansion")
- **enables**: Enablement (e.g., "Education enables Opportunity")
- **requires**: Dependency (e.g., "Growth requires Resources")
- **influences**: Influence (e.g., "Culture influences Behavior")

Return JSON in this exact format:
{
  "relationships": [
    {
      "source": "Entity1",
      "target": "Entity2",
      "relation": "is-a|part-of|causes|enables|requires|influences",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Use EXACT entity names from the known entities list
- Extract ONLY relationships explicitly stated or clearly implied
- Confidence: 1.0 = explicit, 0.7-0.9 = strongly implied, 0.5-0.6 = weakly implied
- Return valid JSON only, no other text`;
  }

  /**
   * Merge new relationships with existing ones
   */
  mergeRelationships(
    existing: ExtractedRelationship[],
    newRelationships: ExtractedRelationship[]
  ): ExtractedRelationship[] {
    const merged = [...existing];
    const existingKeys = new Set(
      existing.map(r => `${r.source}|${r.target}|${r.relation}`.toLowerCase())
    );

    for (const relationship of newRelationships) {
      const key = `${relationship.source}|${relationship.target}|${relationship.relation}`.toLowerCase();
      if (!existingKeys.has(key)) {
        merged.push(relationship);
        existingKeys.add(key);
      }
    }

    return merged;
  }
}

export const relationExtractor = new RelationExtractor();
