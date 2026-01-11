import React, { useState, useRef, useEffect } from 'react';
import { AIModel, ChatMessage, ChatSession } from '@kgs/shared';
import { api } from '../../services/api';
import { useGraph } from '../../store/GraphContext';

interface AIChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_OPTIONS: { value: AIModel; label: string; description: string }[] = [
  { value: 'claude-sonnet', label: 'Claude Sonnet', description: 'Balanced performance (default)' },
  { value: 'claude-opus', label: 'Claude Opus', description: 'Most capable' },
  { value: 'claude-haiku', label: 'Claude Haiku', description: 'Fastest responses' },
];

export const AIChatWindow: React.FC<AIChatWindowProps> = ({ isOpen, onClose }) => {
  const { currentGraph } = useGraph();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-sonnet');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [includeHistory, setIncludeHistory] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load sessions on open
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const result = await api.getChatSessions();
      setSessions(result.sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Math.floor(Date.now() / 1000),
      model: selectedModel,
      graphContext: currentGraph?.id,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage({
        message: userMessage.content,
        model: selectedModel,
        graphId: currentGraph?.id,
        sessionId,
        includeHistory,
      });

      setMessages((prev) => [...prev, response.message]);
      setSessionId(response.sessionId);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Math.floor(Date.now() / 1000),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setShowSessions(false);
  };

  const handleLoadSession = async (session: ChatSession) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setSelectedModel(session.model);
    setShowSessions(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (sessionId === sessionId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[420px] h-[600px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
            >
              {MODEL_OPTIONS.find((m) => m.value === selectedModel)?.label}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Chat History"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={handleNewChat}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="New Chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Model Selector Dropdown */}
      {showModelSelector && (
        <div className="absolute top-14 left-3 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10">
          {MODEL_OPTIONS.map((model) => (
            <button
              key={model.value}
              onClick={() => {
                setSelectedModel(model.value);
                setShowModelSelector(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                selectedModel === model.value ? 'bg-slate-700' : ''
              }`}
            >
              <div className="text-sm font-medium text-white">{model.label}</div>
              <div className="text-xs text-slate-400">{model.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Sessions List */}
      {showSessions && (
        <div className="absolute top-14 right-3 w-72 max-h-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 overflow-y-auto">
          <div className="p-2 border-b border-slate-700">
            <span className="text-xs font-medium text-slate-400">Recent Chats</span>
          </div>
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">No previous chats</div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleLoadSession(session)}
                className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0 flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {session.messages[0]?.content.slice(0, 40) || 'New Chat'}...
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(session.updatedAt).toLocaleDateString()} • {session.messages.length} messages
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">How can I help?</h4>
            <p className="text-sm text-slate-400 mb-4">
              Ask me anything about knowledge graphs, ontology design, or get help with your current graph.
            </p>
            {currentGraph && (
              <div className="text-xs bg-slate-800 px-3 py-2 rounded-full text-slate-300">
                Context: <span className="text-purple-400">{currentGraph.title}</span>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-md'
                    : 'bg-slate-800 text-slate-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Graph Context Toggle */}
      {currentGraph && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHistory}
              onChange={(e) => setIncludeHistory(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-xs text-slate-400">Include graph history for context-aware suggestions</span>
          </label>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:border-purple-500 max-h-32"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatWindow;
