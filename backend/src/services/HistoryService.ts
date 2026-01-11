import { v4 as uuidv4 } from 'uuid';
import {
  GraphChange,
  GraphChangeHistory,
  ChangeType,
  ChangePattern,
  CausalHistoryTree,
  CausalHistoryNode,
  OntologyNode,
  OntologyEdge,
} from '@kgs/shared';
import { logger } from '../utils/logger';

// In-memory history storage (in production, use database)
const graphHistories = new Map<number, GraphChangeHistory>();

// Track change causality within a session
let currentCausalParent: string | null = null;

class HistoryService {
  /**
   * Log a change to a graph
   */
  logChange(
    graphId: number,
    userId: number,
    changeType: ChangeType,
    description: string,
    options: {
      affectedNodeIds?: string[];
      affectedEdgeIds?: string[];
      previousState?: any;
      newState?: any;
      causedBy?: string;
    } = {}
  ): GraphChange {
    const history = this.getOrCreateHistory(graphId);

    const change: GraphChange = {
      id: uuidv4(),
      graphId,
      userId,
      changeType,
      timestamp: Date.now(),
      description,
      affectedNodeIds: options.affectedNodeIds,
      affectedEdgeIds: options.affectedEdgeIds,
      previousState: options.previousState,
      newState: options.newState,
      causedBy: options.causedBy || currentCausalParent || undefined,
      causes: [],
    };

    // Update parent's causes array
    if (change.causedBy) {
      const parent = history.changes.find(c => c.id === change.causedBy);
      if (parent) {
        parent.causes = parent.causes || [];
        parent.causes.push(change.id);
      }
    }

    history.changes.push(change);

    // Analyze patterns periodically
    if (history.changes.length % 10 === 0) {
      this.analyzePatterns(graphId);
    }

    logger.debug(`Logged change: ${changeType} - ${description}`);
    return change;
  }

  /**
   * Log a node addition
   */
  logNodeAdded(graphId: number, userId: number, node: OntologyNode): GraphChange {
    return this.logChange(graphId, userId, 'node_added', `Added node "${node.label}"`, {
      affectedNodeIds: [node.id],
      newState: node,
    });
  }

  /**
   * Log a node update
   */
  logNodeUpdated(
    graphId: number,
    userId: number,
    nodeId: string,
    previousNode: OntologyNode,
    newNode: OntologyNode
  ): GraphChange {
    const changes: string[] = [];
    if (previousNode.label !== newNode.label) {
      changes.push(`renamed to "${newNode.label}"`);
    }
    if (previousNode.type !== newNode.type || previousNode.extendedType !== newNode.extendedType) {
      changes.push(`type changed to ${newNode.extendedType || newNode.type}`);
    }

    return this.logChange(
      graphId,
      userId,
      'node_updated',
      `Updated node "${newNode.label}"${changes.length ? ': ' + changes.join(', ') : ''}`,
      {
        affectedNodeIds: [nodeId],
        previousState: previousNode,
        newState: newNode,
      }
    );
  }

  /**
   * Log a node deletion
   */
  logNodeDeleted(graphId: number, userId: number, node: OntologyNode): GraphChange {
    return this.logChange(graphId, userId, 'node_deleted', `Deleted node "${node.label}"`, {
      affectedNodeIds: [node.id],
      previousState: node,
    });
  }

  /**
   * Log an edge addition
   */
  logEdgeAdded(
    graphId: number,
    userId: number,
    edge: OntologyEdge,
    sourceLabel: string,
    targetLabel: string
  ): GraphChange {
    return this.logChange(
      graphId,
      userId,
      'edge_added',
      `Connected "${sourceLabel}" to "${targetLabel}" via ${edge.extendedRelation || edge.relation}`,
      {
        affectedEdgeIds: [edge.id],
        affectedNodeIds: [edge.source, edge.target],
        newState: edge,
      }
    );
  }

  /**
   * Log an edge update
   */
  logEdgeUpdated(
    graphId: number,
    userId: number,
    edgeId: string,
    previousEdge: OntologyEdge,
    newEdge: OntologyEdge,
    sourceLabel: string,
    targetLabel: string
  ): GraphChange {
    return this.logChange(
      graphId,
      userId,
      'edge_updated',
      `Updated edge "${sourceLabel}" → "${targetLabel}"`,
      {
        affectedEdgeIds: [edgeId],
        previousState: previousEdge,
        newState: newEdge,
      }
    );
  }

  /**
   * Log an edge deletion
   */
  logEdgeDeleted(
    graphId: number,
    userId: number,
    edge: OntologyEdge,
    sourceLabel: string,
    targetLabel: string
  ): GraphChange {
    return this.logChange(
      graphId,
      userId,
      'edge_deleted',
      `Removed edge "${sourceLabel}" → "${targetLabel}"`,
      {
        affectedEdgeIds: [edge.id],
        previousState: edge,
      }
    );
  }

  /**
   * Log a layout change
   */
  logLayoutChanged(graphId: number, userId: number, layoutType: string): GraphChange {
    return this.logChange(
      graphId,
      userId,
      'layout_changed',
      `Applied ${layoutType} layout`,
      { newState: { layoutType } }
    );
  }

  /**
   * Log an archetype change
   */
  logArchetypeChanged(
    graphId: number,
    userId: number,
    previousArchetype: string,
    newArchetype: string
  ): GraphChange {
    return this.logChange(
      graphId,
      userId,
      'archetype_changed',
      `Changed archetype from ${previousArchetype} to ${newArchetype}`,
      {
        previousState: { archetype: previousArchetype },
        newState: { archetype: newArchetype },
      }
    );
  }

  /**
   * Log a batch update
   */
  logBatchUpdate(
    graphId: number,
    userId: number,
    description: string,
    affectedNodeIds: string[],
    affectedEdgeIds: string[]
  ): GraphChange {
    return this.logChange(graphId, userId, 'batch_update', description, {
      affectedNodeIds,
      affectedEdgeIds,
    });
  }

  /**
   * Set the current causal parent for subsequent changes
   */
  setCausalParent(changeId: string | null): void {
    currentCausalParent = changeId;
  }

  /**
   * Get or create history for a graph
   */
  getOrCreateHistory(graphId: number): GraphChangeHistory {
    let history = graphHistories.get(graphId);
    if (!history) {
      history = {
        graphId,
        changes: [],
        patterns: [],
      };
      graphHistories.set(graphId, history);
    }
    return history;
  }

  /**
   * Get history for a graph
   */
  getGraphHistory(graphId: number): GraphChangeHistory {
    return this.getOrCreateHistory(graphId);
  }

  /**
   * Get recent changes for a graph
   */
  getRecentChanges(graphId: number, limit: number = 20): GraphChange[] {
    const history = this.getGraphHistory(graphId);
    return history.changes.slice(-limit);
  }

  /**
   * Analyze patterns in the change history
   */
  analyzePatterns(graphId: number): ChangePattern[] {
    const history = this.getGraphHistory(graphId);
    const changes = history.changes;

    if (changes.length < 5) {
      return [];
    }

    // Find common sequences
    const sequences = new Map<string, { count: number; lastOccurred: number }>();

    for (let windowSize = 2; windowSize <= 4; windowSize++) {
      for (let i = 0; i <= changes.length - windowSize; i++) {
        const sequence = changes
          .slice(i, i + windowSize)
          .map(c => c.changeType)
          .join(',');

        const existing = sequences.get(sequence);
        if (existing) {
          existing.count++;
          existing.lastOccurred = changes[i + windowSize - 1].timestamp;
        } else {
          sequences.set(sequence, {
            count: 1,
            lastOccurred: changes[i + windowSize - 1].timestamp,
          });
        }
      }
    }

    // Convert to patterns (only those that occur more than once)
    const patterns: ChangePattern[] = [];
    sequences.forEach((data, sequence) => {
      if (data.count >= 2) {
        const types = sequence.split(',') as ChangeType[];
        patterns.push({
          id: uuidv4(),
          name: this.generatePatternName(types),
          description: this.generatePatternDescription(types),
          frequency: data.count,
          changeSequence: types,
          lastOccurred: data.lastOccurred,
        });
      }
    });

    // Sort by frequency
    patterns.sort((a, b) => b.frequency - a.frequency);

    // Keep top 10 patterns
    history.patterns = patterns.slice(0, 10);
    return history.patterns;
  }

  /**
   * Generate a human-readable pattern name
   */
  private generatePatternName(types: ChangeType[]): string {
    if (types.every(t => t === 'node_added')) {
      return 'Bulk Node Addition';
    }
    if (types.includes('node_added') && types.includes('edge_added')) {
      return 'Node-Edge Creation';
    }
    if (types.every(t => t.includes('updated'))) {
      return 'Refinement Sequence';
    }
    if (types.includes('node_deleted') || types.includes('edge_deleted')) {
      return 'Restructuring';
    }
    return 'Mixed Operations';
  }

  /**
   * Generate a pattern description
   */
  private generatePatternDescription(types: ChangeType[]): string {
    const typeNames = types.map(t => t.replace(/_/g, ' '));
    return `Sequence of: ${typeNames.join(' → ')}`;
  }

  /**
   * Build causal history tree
   */
  buildCausalTree(graphId: number): CausalHistoryTree {
    const history = this.getGraphHistory(graphId);
    const nodes: Record<string, CausalHistoryNode> = {};
    const rootNodes: string[] = [];

    // First pass: create all nodes
    for (const change of history.changes) {
      nodes[change.id] = {
        id: change.id,
        change,
        depth: 0,
        children: change.causes || [],
        parent: change.causedBy,
      };

      if (!change.causedBy) {
        rootNodes.push(change.id);
      }
    }

    // Second pass: calculate depths
    const calculateDepth = (nodeId: string, depth: number) => {
      const node = nodes[nodeId];
      if (node) {
        node.depth = depth;
        for (const childId of node.children) {
          calculateDepth(childId, depth + 1);
        }
      }
    };

    for (const rootId of rootNodes) {
      calculateDepth(rootId, 0);
    }

    // Calculate time range
    const timestamps = history.changes.map(c => c.timestamp);
    const timeRange = {
      start: Math.min(...timestamps, Date.now()),
      end: Math.max(...timestamps, Date.now()),
    };

    return {
      rootNodes,
      nodes,
      timeRange,
    };
  }

  /**
   * Get changes affecting a specific node
   */
  getNodeHistory(graphId: number, nodeId: string): GraphChange[] {
    const history = this.getGraphHistory(graphId);
    return history.changes.filter(
      c => c.affectedNodeIds?.includes(nodeId)
    );
  }

  /**
   * Get changes affecting a specific edge
   */
  getEdgeHistory(graphId: number, edgeId: string): GraphChange[] {
    const history = this.getGraphHistory(graphId);
    return history.changes.filter(
      c => c.affectedEdgeIds?.includes(edgeId)
    );
  }

  /**
   * Clear history for a graph
   */
  clearHistory(graphId: number): void {
    graphHistories.delete(graphId);
  }

  /**
   * Export history as JSON
   */
  exportHistory(graphId: number): string {
    const history = this.getGraphHistory(graphId);
    return JSON.stringify(history, null, 2);
  }
}

export const historyService = new HistoryService();
