import { useEffect, useRef, useState } from 'react';
import { SSEEvent } from '@kgs/shared';

interface UseSSEOptions {
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export function useSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = (url: string, options: UseSSEOptions = {}) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsStreaming(true);

    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data);

        if (data.type === 'done') {
          setIsStreaming(false);
          eventSource.close();
          options.onDone?.();
        } else if (data.type === 'error') {
          setIsStreaming(false);
          eventSource.close();
          options.onError?.(new Error(data.message));
        } else {
          options.onMessage?.(data);
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
      options.onError?.(new Error('SSE connection error'));
    };
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return { startStream, stopStream, isStreaming };
}
