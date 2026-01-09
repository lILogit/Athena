import {
  OntologyData,
  OntologyNode,
  OntologyEdge,
  ExtractedEntity,
  ExtractedRelationship,
  Message,
} from '@kgs/shared';
import { v4 as uuidv4 } from 'uuid';
import { entityExtractor } from './EntityExtractor';
import { relationExtractor } from './RelationExtractor';
import { logger } from '../../utils/logger';

export class OntologyBuilder {
  /**
   * Build ontology from conversation messages
   */
  async buildFromConversation(messages: Message[]): Promise<OntologyData> {
    // Convert messages to text
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Extract entities
    const extractedEntities = await entityExtractor.extractEntities(conversationText);

    // Extract relationships
    const entityLabels = extractedEntities.map(e => e.label);
    const extractedRelationships = await relationExtractor.extractRelationships(
      conversationText,
      entityLabels
    );

    // Convert to ontology format
    return this.convertToOntology(extractedEntities, extractedRelationships);
  }

  /**
   * Convert extracted entities and relationships to OntologyData
   */
  convertToOntology(
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[]
  ): OntologyData {
    // Create nodes
    const nodes: OntologyNode[] = entities.map(entity => ({
      id: uuidv4(),
      label: entity.label,
      type: entity.type,
      properties: {},
      confidence: entity.confidence,
      source: entity.confidence >= 0.9 ? 'user-stated' : 'inferred',
    }));

    // Create a mapping from label to node ID
    const labelToId = new Map<string, string>();
    nodes.forEach(node => {
      labelToId.set(node.label.toLowerCase(), node.id);
    });

    // Create edges
    const edges: OntologyEdge[] = relationships
      .map(rel => {
        const sourceId = labelToId.get(rel.source.toLowerCase());
        const targetId = labelToId.get(rel.target.toLowerCase());

        if (!sourceId || !targetId) {
          logger.warn('Skipping relationship with unknown entity', {
            source: rel.source,
            target: rel.target,
            relation: rel.relation,
          });
          return null;
        }

        return {
          id: uuidv4(),
          source: sourceId,
          target: targetId,
          relation: rel.relation,
          strength: rel.confidence,
          temporal: false, // TODO: detect temporal relationships
          properties: {},
        };
      })
      .filter((edge): edge is OntologyEdge => edge !== null);

    logger.info('Built ontology', {
      nodes: nodes.length,
      edges: edges.length,
    });

    return { nodes, edges };
  }

  /**
   * Merge two ontologies
   */
  mergeOntologies(base: OntologyData, additional: OntologyData): OntologyData {
    // Merge nodes (avoid duplicates by label)
    const nodeMap = new Map<string, OntologyNode>();

    // Add base nodes
    base.nodes.forEach(node => {
      nodeMap.set(node.label.toLowerCase(), node);
    });

    // Add additional nodes (update if confidence is higher)
    additional.nodes.forEach(node => {
      const existing = nodeMap.get(node.label.toLowerCase());
      if (!existing || node.confidence > existing.confidence) {
        nodeMap.set(node.label.toLowerCase(), node);
      }
    });

    const mergedNodes = Array.from(nodeMap.values());

    // Create label to ID mapping
    const labelToId = new Map<string, string>();
    mergedNodes.forEach(node => {
      labelToId.set(node.label.toLowerCase(), node.id);
    });

    // Merge edges (avoid duplicates)
    const edgeSet = new Set<string>();
    const mergedEdges: OntologyEdge[] = [];

    const addEdge = (edge: OntologyEdge) => {
      const key = `${edge.source}|${edge.target}|${edge.relation}`;
      if (!edgeSet.has(key)) {
        mergedEdges.push(edge);
        edgeSet.add(key);
      }
    };

    base.edges.forEach(addEdge);
    additional.edges.forEach(addEdge);

    return {
      nodes: mergedNodes,
      edges: mergedEdges,
    };
  }

  /**
   * Validate ontology structure
   */
  validateOntology(ontology: OntologyData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check nodes
    if (!Array.isArray(ontology.nodes)) {
      errors.push('nodes must be an array');
    }

    // Check edges
    if (!Array.isArray(ontology.edges)) {
      errors.push('edges must be an array');
    }

    // Validate node IDs are unique
    const nodeIds = new Set<string>();
    ontology.nodes.forEach((node, index: number) => {
      if (!node.id) {
        errors.push(`node at index ${index} missing id`);
      } else if (nodeIds.has(node.id)) {
        errors.push(`duplicate node id: ${node.id}`);
      } else {
        nodeIds.add(node.id);
      }
    });

    // Validate edges reference existing nodes
    ontology.edges.forEach((edge, index: number) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`edge at index ${index} references non-existent source: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`edge at index ${index} references non-existent target: ${edge.target}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const ontologyBuilder = new OntologyBuilder();
