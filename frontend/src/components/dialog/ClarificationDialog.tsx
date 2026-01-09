import { useState, useRef, useEffect } from 'react';
import { useUI } from '../../store/UIContext';
import { useGraph } from '../../store/GraphContext';
import { Message, ExtractedEntity } from '@kgs/shared';
import { api } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ClarificationDialog() {
  const { clarificationDialogOpen, closeClarificationDialog } = useUI();
  const { loadGraphs } = useGraph();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clarificationDialogOpen) {
      // Reset state when dialog opens
      setSessionId(null);
      setMessages([]);
      setInputValue('');
      setExtractedEntities([]);
    }
  }, [clarificationDialogOpen]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  async function handleStartSession() {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      const result = await api.startClarification({
        initial_input: inputValue,
        project_id: 1, // TODO: Get from context
      });

      setSessionId(result.session_id);
      setMessages([
        {
          role: 'user',
          content: inputValue,
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: result.ai_response,
          timestamp: Date.now(),
        },
      ]);
      setExtractedEntities(result.extracted_entities);
      setInputValue('');
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start clarification session');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!inputValue.trim() || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Use fetch with streaming
      const response = await fetch(`${API_URL}/api/clarify/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                fullResponse += data.content;
                setStreamingMessage(fullResponse);
              } else if (data.type === 'entities') {
                setExtractedEntities(data.entities);
              } else if (data.type === 'done') {
                // Add final message
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: fullResponse,
                    timestamp: Date.now(),
                  },
                ]);
                setStreamingMessage('');
                setIsStreaming(false);
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
      setIsStreaming(false);
    }
  }

  async function handleFinalize() {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const { graph } = await api.finalizeClarification({
        session_id: sessionId,
        title: `Graph - ${new Date().toLocaleDateString()}`,
      });

      // Reload graphs and close dialog
      await loadGraphs();
      closeClarificationDialog();

      // Navigate to new graph
      window.location.href = `/graph/${graph.id}`;
    } catch (error) {
      console.error('Failed to finalize:', error);
      alert('Failed to create graph');
    } finally {
      setIsLoading(false);
    }
  }

  if (!clarificationDialogOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-4xl h-2/3 rounded-t-2xl shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Knowledge Graph</h2>
            <p className="text-sm text-gray-600 mt-1">
              Describe your idea and I'll help extract a structured ontology
            </p>
          </div>
          <button
            onClick={closeClarificationDialog}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  What's on your mind?
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Share your idea, concept, or question. I'll ask clarifying questions to help build a
                  structured knowledge graph.
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))}
                {streamingMessage && (
                  <MessageBubble
                    message={{
                      role: 'assistant',
                      content: streamingMessage,
                      timestamp: Date.now(),
                    }}
                    isStreaming
                  />
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Entity Preview Sidebar */}
          {extractedEntities.length > 0 && (
            <div className="w-64 border-l border-gray-200 p-4 overflow-y-auto bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3">Extracted Entities</h3>
              <div className="space-y-2">
                {extractedEntities.map((entity, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-2 rounded-lg border border-gray-200 text-sm"
                  >
                    <div className="font-medium text-gray-900">{entity.label}</div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
                      <span className="capitalize">{entity.type}</span>
                      <span>{(entity.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!sessionId) {
                    handleStartSession();
                  } else {
                    handleSendMessage();
                  }
                }
              }}
              placeholder={
                sessionId
                  ? 'Type your response...'
                  : 'Describe your idea (e.g., "Consciousness is not material")'
              }
              disabled={isLoading || isStreaming}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            {!sessionId ? (
              <button
                onClick={handleStartSession}
                disabled={isLoading || !inputValue.trim()}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting...' : 'Start'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleSendMessage}
                  disabled={isStreaming || !inputValue.trim()}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStreaming ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={isLoading || extractedEntities.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalize
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming?: boolean;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"></span>
        )}
      </div>
    </div>
  );
}
