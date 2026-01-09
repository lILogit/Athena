import { Request, Response, NextFunction } from 'express';
import { ontologyBuilder } from '../services/nlp/OntologyBuilder';
import { entityExtractor } from '../services/nlp/EntityExtractor';
import { relationExtractor } from '../services/nlp/RelationExtractor';
import { claudeService } from '../services/ClaudeService';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, ConvertTextRequest, ExtractEntitiesRequest } from '@kgs/shared';
import { logger } from '../utils/logger';

export class OntologyController {
  /**
   * Convert text to ontology
   * POST /api/ontology/convert
   */
  async convert(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text } = req.body as ConvertTextRequest;

      if (!text) {
        throw new AppError(400, 'INVALID_INPUT', 'text is required');
      }

      // Extract entities
      const entities = await entityExtractor.extractEntities(text);

      // Extract relationships
      const entityLabels = entities.map(e => e.label);
      const relationships = await relationExtractor.extractRelationships(text, entityLabels);

      // Convert to ontology
      const ontology = ontologyBuilder.convertToOntology(entities, relationships);

      // Calculate average confidence
      const totalConfidence =
        entities.reduce((sum, e) => sum + e.confidence, 0) +
        relationships.reduce((sum, r) => sum + r.confidence, 0);
      const confidence = totalConfidence / (entities.length + relationships.length) || 0;

      const response: ApiResponse = {
        data: {
          ontology,
          confidence: parseFloat(confidence.toFixed(2)),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Extract entities and relationships from text
   * POST /api/ontology/extract
   */
  async extract(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text } = req.body as ExtractEntitiesRequest;

      if (!text) {
        throw new AppError(400, 'INVALID_INPUT', 'text is required');
      }

      // Extract entities
      const entities = await entityExtractor.extractEntities(text);

      // Extract relationships
      const entityLabels = entities.map(e => e.label);
      const relationships = await relationExtractor.extractRelationships(text, entityLabels);

      const response: ApiResponse = {
        data: {
          entities,
          relationships,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze causal chains in a graph
   * POST /api/ontology/causal-chains
   */
  async analyzeCausalChains(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nodes, edges, focus_node } = req.body as {
        nodes: string[];
        edges: Array<{ source: string; target: string; relation: string }>;
        focus_node?: string;
      };

      if (!nodes || nodes.length < 2) {
        throw new AppError(400, 'INVALID_INPUT', 'At least 2 nodes are required');
      }

      // Build context for Claude
      const nodesStr = nodes.join(', ');
      const edgesStr = edges.length > 0
        ? edges.map(e => `${e.source} --[${e.relation}]--> ${e.target}`).join('\n')
        : 'No relationships defined yet';

      const focusContext = focus_node
        ? `\n\nFocus especially on causal chains that involve "${focus_node}".`
        : '';

      const prompt = `Analyze the following knowledge graph and identify meaningful causal chains (cause-effect relationships).

NODES:
${nodesStr}

EXISTING RELATIONSHIPS:
${edgesStr}
${focusContext}

Based on these concepts and relationships, suggest 2-4 causal chains that show how one concept leads to or influences another. Focus on:
1. Direct causal relationships (A causes B)
2. Enabling relationships (A enables B)
3. Influence chains (A influences B which affects C)
4. Logical progressions

For each chain, provide:
- The sequence of nodes involved
- The relationship type between each consecutive pair (use: causes, enables, influences, requires, leads_to, activates, inhibits, amplifies, reduces)
- A brief description of why this causal chain makes sense

Respond in this exact JSON format:
{
  "chains": [
    {
      "nodes": ["Concept1", "Concept2", "Concept3"],
      "relations": ["causes", "leads_to"],
      "description": "Brief explanation of this causal chain"
    }
  ]
}

Only include nodes that are in the provided list. Be insightful about potential causal relationships even if not explicitly stated in the edges.`;

      // Get Claude's analysis
      const aiResponse = await claudeService.sendMessage([
        {
          role: 'user',
          content: prompt,
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);

      // Parse the response
      let chains: Array<{ nodes: string[]; relations: string[]; description?: string }> = [];

      try {
        // Extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          chains = parsed.chains || [];
        }
      } catch (parseError) {
        logger.warn('Failed to parse causal chains response:', parseError);
        // Return empty chains if parsing fails
        chains = [];
      }

      const response: ApiResponse = {
        data: { chains },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const ontologyController = new OntologyController();
