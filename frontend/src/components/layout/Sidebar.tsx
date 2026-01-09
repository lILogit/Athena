import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../../store/GraphContext';
import { useUI } from '../../store/UIContext';
import { Project } from '@kgs/shared';
import { api } from '../../services/api';

export default function Sidebar() {
  const navigate = useNavigate();
  const { graphs, currentGraph, loadGraphs } = useGraph();
  const { openClarificationDialog } = useUI();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);

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
            {graphs.map((graph: any) => (
              <button
                key={graph.id}
                onClick={() => handleGraphClick(graph.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentGraph?.id === graph.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900 mb-1">{graph.title}</div>
                {graph.description && (
                  <div className="text-sm text-gray-600 line-clamp-2">{graph.description}</div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {graph.ontology_data.nodes.length} nodes • {graph.ontology_data.edges.length} edges
                </div>
              </button>
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
    </div>
  );
}
