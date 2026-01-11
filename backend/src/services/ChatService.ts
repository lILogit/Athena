import { v4 as uuidv4 } from 'uuid';
import { anthropic } from '../config/claude';
import { logger } from '../utils/logger';
import {
  AIModel,
  ChatMessage,
  ChatSession,
  ChatRequest,
  ChatResponse,
  GraphChange,
  NextStepRecommendation,
  Graph,
} from '@kgs/shared';
import { graphService } from './GraphService';
import { historyService } from './HistoryService';

// Model mapping
const MODEL_MAP: Record<AIModel, string> = {
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'claude-opus': 'claude-opus-4-20250514',
  'claude-haiku': 'claude-haiku-4-20250514',
};

// In-memory chat sessions (in production, use database)
const chatSessions = new Map<string, ChatSession>();

const CHAT_SYSTEM_PROMPT = `You are an intelligent assistant helping users build and refine knowledge graphs. You have deep expertise in:
- Ontology design and knowledge representation
- Causal reasoning and relationship analysis
- Pattern recognition in complex systems
- Goal planning and decision analysis

When helping users, consider the context of their graph (if provided) and offer specific, actionable suggestions.
Be concise but thorough. Use examples when helpful.

If the user asks for recommendations or next steps, analyze their graph structure and recent changes to provide targeted suggestions.`;

const RECOMMENDATION_PROMPT = `Based on the graph structure and recent changes, suggest 2-3 focused next steps.
For each recommendation, provide:
- A clear title
- Brief description of what to do
- Why this would improve the graph
- Confidence level (0-1)

Respond in JSON format:
{
  "recommendations": [
    {
      "type": "add_node|add_edge|refine_node|apply_layout|explore_pattern|custom",
      "title": "...",
      "description": "...",
      "confidence": 0.8,
      "reasoning": "...",
      "suggestedAction": { "nodeType": "...", "edgeType": "...", ... }
    }
  ]
}`;

class ChatService {
  /**
   * Send a chat message and get a response
   */
  async chat(
    userId: number,
    request: ChatRequest
  ): Promise<ChatResponse> {
    const { message, model = 'claude-sonnet', graphId, sessionId, includeHistory } = request;

    // Get or create session
    let session = sessionId ? chatSessions.get(sessionId) : undefined;
    if (!session) {
      session = this.createSession(model, graphId);
    }

    // Build context
    let contextPrompt = CHAT_SYSTEM_PROMPT;
    let graphContext: Graph | null = null;

    if (graphId) {
      graphContext = graphService.getGraphById(graphId, userId);
      if (graphContext) {
        contextPrompt += `\n\nCurrent Graph Context:
- Title: ${graphContext.title}
- Archetype: ${graphContext.archetype}
- Nodes: ${graphContext.ontology_data.nodes.length}
- Edges: ${graphContext.ontology_data.edges.length}

Node types: ${[...new Set(graphContext.ontology_data.nodes.map(n => n.extendedType || n.type))].join(', ')}
Edge types: ${[...new Set(graphContext.ontology_data.edges.map(e => e.extendedRelation || e.relation))].join(', ')}`;
      }
    }

    // Include change history if requested
    let recentChanges: GraphChange[] = [];
    if (includeHistory && graphId) {
      const history = historyService.getGraphHistory(graphId);
      recentChanges = history.changes.slice(-10); // Last 10 changes
      if (recentChanges.length > 0) {
        contextPrompt += `\n\nRecent Changes:
${recentChanges.map(c => `- ${c.description} (${c.changeType})`).join('\n')}`;
      }
    }

    // Add user message to session
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Math.floor(Date.now() / 1000),
      model,
      graphContext: graphId,
    };
    session.messages.push(userMessage);

    try {
      // Prepare messages for API
      const apiMessages = session.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Call Claude API
      const response = await (anthropic as any).messages.create({
        model: MODEL_MAP[model],
        max_tokens: 2048,
        system: contextPrompt,
        messages: apiMessages,
      });

      const textContent = response.content.find((block: any) => block.type === 'text');
      const responseText = textContent?.type === 'text' ? textContent.text : '';

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: Math.floor(Date.now() / 1000),
        model,
        graphContext: graphId,
      };
      session.messages.push(assistantMessage);
      session.updatedAt = Date.now();

      // Generate recommendations if we have graph context
      let recommendations: NextStepRecommendation[] | undefined;
      if (graphContext && includeHistory) {
        recommendations = await this.generateRecommendations(
          graphContext,
          recentChanges,
          model
        );
      }

      // Save session
      chatSessions.set(session.id, session);

      return {
        message: assistantMessage,
        sessionId: session.id,
        recommendations,
      };
    } catch (error) {
      logger.error('ChatService.chat error:', error);
      throw new Error('Failed to get response from AI');
    }
  }

  /**
   * Stream a chat response
   */
  async *streamChat(
    userId: number,
    request: ChatRequest
  ): AsyncGenerator<string, ChatResponse, unknown> {
    const { message, model = 'claude-sonnet', graphId, sessionId } = request;

    // Get or create session
    let session = sessionId ? chatSessions.get(sessionId) : undefined;
    if (!session) {
      session = this.createSession(model, graphId);
    }

    // Build context
    let contextPrompt = CHAT_SYSTEM_PROMPT;

    if (graphId) {
      const graphContext = graphService.getGraphById(graphId, userId);
      if (graphContext) {
        contextPrompt += `\n\nCurrent Graph: "${graphContext.title}" (${graphContext.archetype})
Nodes: ${graphContext.ontology_data.nodes.length}, Edges: ${graphContext.ontology_data.edges.length}`;
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: Math.floor(Date.now() / 1000),
      model,
      graphContext: graphId,
    };
    session.messages.push(userMessage);

    try {
      const apiMessages = session.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const stream = await (anthropic as any).messages.stream({
        model: MODEL_MAP[model],
        max_tokens: 2048,
        system: contextPrompt,
        messages: apiMessages,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullResponse += chunk.delta.text;
          yield chunk.delta.text;
        }
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: fullResponse,
        timestamp: Math.floor(Date.now() / 1000),
        model,
        graphContext: graphId,
      };
      session.messages.push(assistantMessage);
      session.updatedAt = Date.now();
      chatSessions.set(session.id, session);

      return {
        message: assistantMessage,
        sessionId: session.id,
      };
    } catch (error) {
      logger.error('ChatService.streamChat error:', error);
      throw new Error('Failed to stream response from AI');
    }
  }

  /**
   * Generate next step recommendations based on graph and history
   */
  async generateRecommendations(
    graph: Graph,
    recentChanges: GraphChange[],
    model: AIModel = 'claude-sonnet'
  ): Promise<NextStepRecommendation[]> {
    const prompt = `Analyze this knowledge graph and recent changes:

Graph: "${graph.title}" (${graph.archetype} archetype)
Nodes (${graph.ontology_data.nodes.length}):
${graph.ontology_data.nodes.slice(0, 15).map(n => `- ${n.label} (${n.extendedType || n.type})`).join('\n')}
${graph.ontology_data.nodes.length > 15 ? `... and ${graph.ontology_data.nodes.length - 15} more` : ''}

Edges (${graph.ontology_data.edges.length}):
${graph.ontology_data.edges.slice(0, 10).map(e => {
  const source = graph.ontology_data.nodes.find(n => n.id === e.source)?.label || 'Unknown';
  const target = graph.ontology_data.nodes.find(n => n.id === e.target)?.label || 'Unknown';
  return `- ${source} --[${e.extendedRelation || e.relation}]--> ${target}`;
}).join('\n')}

Recent Changes:
${recentChanges.map(c => `- ${c.description}`).join('\n') || 'No recent changes'}

${RECOMMENDATION_PROMPT}`;

    try {
      const response = await (anthropic as any).messages.create({
        model: MODEL_MAP[model],
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((block: any) => block.type === 'text');
      const text = textContent?.type === 'text' ? textContent.text : '';

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.recommendations || []).map((rec: any) => ({
          id: uuidv4(),
          ...rec,
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Create a new chat session
   */
  createSession(model: AIModel, graphId?: number): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      model,
      graphId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    chatSessions.set(session.id, session);
    return session;
  }

  /**
   * Get a chat session
   */
  getSession(sessionId: string): ChatSession | undefined {
    return chatSessions.get(sessionId);
  }

  /**
   * Get all sessions for display
   */
  getAllSessions(): ChatSession[] {
    return Array.from(chatSessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete a chat session
   */
  deleteSession(sessionId: string): boolean {
    return chatSessions.delete(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    chatSessions.clear();
  }
}

export const chatService = new ChatService();
