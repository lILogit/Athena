import { Request, Response, NextFunction } from 'express';
import { ontologyBuilder } from '../services/nlp/OntologyBuilder';
import { entityExtractor } from '../services/nlp/EntityExtractor';
import { relationExtractor } from '../services/nlp/RelationExtractor';
import { AppError } from '../middleware/errorHandler';
import { ApiResponse, ConvertTextRequest, ExtractEntitiesRequest } from '@kgs/shared';

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
}

export const ontologyController = new OntologyController();
