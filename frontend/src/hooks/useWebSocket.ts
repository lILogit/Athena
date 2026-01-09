import { useEffect } from 'react';
import { websocket } from '../services/websocket';
import { GraphUpdateEvent } from '@kgs/shared';
import { useGraph } from '../store/GraphContext';

export function useWebSocket() {
  const { currentGraph, setCurrentGraph } = useGraph();

  useEffect(() => {
    // Connect to WebSocket
    websocket.connect();

    // Listen for graph updates
    const unsubscribe = websocket.on('graph:update', (event: GraphUpdateEvent) => {
      // Only update if it's the current graph
      if (currentGraph && event.graph_id === currentGraph.id) {
        setCurrentGraph({
          ...currentGraph,
          ontology_data: event.ontology_data,
          updated_at: event.timestamp,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      websocket.disconnect();
    };
  }, [currentGraph]);

  return websocket;
}
