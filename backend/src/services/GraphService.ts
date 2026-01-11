import { db } from '../config/database';
import { Graph, OntologyData, CreateGraphRequest, UpdateGraphRequest, GraphArchetype, ArchetypeConfig } from '@kgs/shared';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class GraphService {
  /**
   * Get all graphs for a user
   */
  getGraphs(userId: number, projectId?: number): Graph[] {
    try {
      let query = `
        SELECT * FROM graphs
        WHERE user_id = ? AND is_archived = 0
      `;
      const params: any[] = [userId];

      if (projectId) {
        query += ' AND project_id = ?';
        params.push(projectId);
      }

      query += ' ORDER BY updated_at DESC';

      const rows = db.prepare(query).all(...params);

      return rows.map(this.rowToGraph);
    } catch (error) {
      logger.error('GraphService.getGraphs error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch graphs');
    }
  }

  /**
   * Get a single graph by ID
   */
  getGraphById(graphId: number, userId: number): Graph | null {
    try {
      const row = db
        .prepare('SELECT * FROM graphs WHERE id = ? AND user_id = ?')
        .get(graphId, userId);

      return row ? this.rowToGraph(row) : null;
    } catch (error) {
      logger.error('GraphService.getGraphById error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch graph');
    }
  }

  /**
   * Create a new graph
   */
  createGraph(userId: number, data: CreateGraphRequest): Graph {
    try {
      const ontologyData = data.ontology_data || { nodes: [], edges: [] };
      const archetype = data.archetype || 'general';
      const archetypeConfig = data.archetypeConfig || this.getDefaultArchetypeConfig(archetype);
      const timestamp = Math.floor(Date.now() / 1000);

      const result = db
        .prepare(
          `INSERT INTO graphs (project_id, user_id, title, description, archetype, archetype_config, ontology_data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          data.project_id,
          userId,
          data.title,
          data.description || null,
          archetype,
          JSON.stringify(archetypeConfig),
          JSON.stringify(ontologyData),
          timestamp,
          timestamp
        );

      const graphId = result.lastInsertRowid as number;

      // Create initial version
      db.prepare(
        `INSERT INTO graph_versions (graph_id, version, ontology_data, created_by, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(graphId, 1, JSON.stringify(ontologyData), userId, timestamp);

      logger.info('Graph created', { graphId, userId, title: data.title });

      const graph = this.getGraphById(graphId, userId);
      if (!graph) {
        throw new Error('Failed to retrieve created graph');
      }

      return graph;
    } catch (error) {
      logger.error('GraphService.createGraph error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to create graph');
    }
  }

  /**
   * Update a graph
   */
  updateGraph(graphId: number, userId: number, data: UpdateGraphRequest): Graph {
    try {
      const existing = this.getGraphById(graphId, userId);
      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title);
      }

      if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
      }

      if (data.archetype !== undefined) {
        updates.push('archetype = ?');
        params.push(data.archetype);
      }

      if (data.archetypeConfig !== undefined) {
        updates.push('archetype_config = ?');
        params.push(JSON.stringify(data.archetypeConfig));
      }

      if (data.ontology_data !== undefined) {
        updates.push('ontology_data = ?');
        params.push(JSON.stringify(data.ontology_data));
        updates.push('version = version + 1');

        // Create new version
        const newVersion = existing.version + 1;
        const timestamp = Math.floor(Date.now() / 1000);

        db.prepare(
          `INSERT INTO graph_versions (graph_id, version, ontology_data, change_description, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          graphId,
          newVersion,
          JSON.stringify(data.ontology_data),
          'Updated graph',
          userId,
          timestamp
        );
      }

      if (updates.length > 0) {
        updates.push('updated_at = ?');
        params.push(Math.floor(Date.now() / 1000));
        params.push(graphId, userId);

        db.prepare(
          `UPDATE graphs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
        ).run(...params);

        logger.info('Graph updated', { graphId, userId });
      }

      const updated = this.getGraphById(graphId, userId);
      if (!updated) {
        throw new Error('Failed to retrieve updated graph');
      }

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GraphService.updateGraph error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to update graph');
    }
  }

  /**
   * Delete (archive) a graph
   */
  deleteGraph(graphId: number, userId: number): void {
    try {
      const result = db
        .prepare('UPDATE graphs SET is_archived = 1 WHERE id = ? AND user_id = ?')
        .run(graphId, userId);

      if (result.changes === 0) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      logger.info('Graph archived', { graphId, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GraphService.deleteGraph error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to delete graph');
    }
  }

  /**
   * Get graph versions
   */
  getGraphVersions(graphId: number, userId: number): any[] {
    try {
      // Verify ownership
      const graph = this.getGraphById(graphId, userId);
      if (!graph) {
        throw new AppError(404, 'NOT_FOUND', 'Graph not found');
      }

      const rows = db
        .prepare(
          `SELECT id, graph_id, version, change_description, created_by, created_at
           FROM graph_versions
           WHERE graph_id = ?
           ORDER BY version DESC`
        )
        .all(graphId);

      return rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('GraphService.getGraphVersions error:', error);
      throw new AppError(500, 'DATABASE_ERROR', 'Failed to fetch versions');
    }
  }

  /**
   * Convert database row to Graph object
   */
  private rowToGraph(row: any): Graph {
    let archetypeConfig: ArchetypeConfig | undefined;
    try {
      archetypeConfig = row.archetype_config ? JSON.parse(row.archetype_config) : undefined;
    } catch {
      archetypeConfig = undefined;
    }

    return {
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      archetype: (row.archetype as GraphArchetype) || 'general',
      archetypeConfig,
      ontology_data: JSON.parse(row.ontology_data) as OntologyData,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_archived: Boolean(row.is_archived),
    };
  }

  /**
   * Get default archetype configuration based on archetype type
   */
  private getDefaultArchetypeConfig(archetype: GraphArchetype): ArchetypeConfig {
    switch (archetype) {
      case 'knowledge-mining':
        return {
          archetype: 'knowledge-mining',
          layoutPreferences: { algorithm: 'force' },
          displayOptions: {
            showClusters: true,
            showInferredEdges: false,
            minSimilarityThreshold: 0.3,
          },
        };
      case 'explanation':
        return {
          archetype: 'explanation',
          layoutPreferences: { algorithm: 'concentric' },
          displayOptions: {
            complexityLevel: 3,
            showAnalogies: true,
            showExamples: true,
          },
        };
      default:
        return {
          archetype: 'general',
          layoutPreferences: { algorithm: 'hierarchical-tb' },
          displayOptions: {},
        };
    }
  }
}

export const graphService = new GraphService();
