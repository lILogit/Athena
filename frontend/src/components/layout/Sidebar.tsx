import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import { Project, Graph } from '@kgs/shared';
import { api } from '../../services/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { graphs, currentGraph, loadGraphs, deleteGraph } = useGraph();
  const { openClarificationDialog } = useUI();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [graphToDelete, setGraphToDelete] = useState<Graph | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadGraphs(selectedProjectId);
  }, [selectedProjectId]);

  async function loadProjects() {
    try {
      const { projects: loadedProjects } = await api.getProjects();
      setProjects(loadedProjects);
      if (loadedProjects.length > 0) {
        setSelectedProjectId(loadedProjects[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

  function handleGraphClick(graphId: number) {
    navigate(`/graph/${graphId}`);
  }

  async function handleDeleteGraph() {
    if (!graphToDelete) return;
    try {
      await deleteGraph(graphToDelete.id);
      setGraphToDelete(null);
      // If deleted graph was current, navigate to home
      if (currentGraph?.id === graphToDelete.id) {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete graph:', error);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Projects</h2>

        {/* Project Selector */}
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {/* New Graph Button */}
        <button
          onClick={openClarificationDialog}
          className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-600 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Graph
        </button>
      </div>

      {/* Graph List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Graphs</h3>

        {graphs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No graphs yet</p>
            <p className="text-sm">Create your first graph to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {graphs.map((graph: Graph) => (
              <div
                key={graph.id}
                className={`w-full text-left p-3 rounded-lg border transition-colors group relative ${
                  currentGraph?.id === graph.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <button
                  onClick={() => handleGraphClick(graph.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2 mb-1 pr-6">
                    <div className="font-medium text-gray-900 truncate">{graph.title}</div>
                    {graph.archetype && graph.archetype !== 'general' && (
                      <span
                        className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${
                          graph.archetype === 'knowledge-mining' ? 'bg-purple-100 text-purple-700' :
                          graph.archetype === 'explanation' ? 'bg-amber-100 text-amber-700' :
                          graph.archetype === 'goal-achievement' ? 'bg-green-100 text-green-700' :
                          graph.archetype === 'decision' ? 'bg-blue-100 text-blue-700' :
                          graph.archetype === 'prediction' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {graph.archetype === 'knowledge-mining' ? '🔍' :
                         graph.archetype === 'explanation' ? '💡' :
                         graph.archetype === 'goal-achievement' ? '🎯' :
                         graph.archetype === 'decision' ? '⚖️' :
                         graph.archetype === 'prediction' ? '🔮' : '📊'}
                      </span>
                    )}
                  </div>
                  {graph.description && (
                    <div className="text-sm text-gray-600 line-clamp-2">{graph.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {graph.ontology_data.nodes.length} nodes • {graph.ontology_data.edges.length} edges
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGraphToDelete(graph);
                  }}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete graph"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
            D
          </div>
          <div>
            <div className="font-medium text-gray-900">Demo User</div>
            <div className="text-sm text-gray-600">demo@local</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {graphToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96 mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Graph</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{graphToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setGraphToDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGraph}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
