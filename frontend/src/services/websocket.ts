import { io, Socket } from 'socket.io-client';
import { GraphUpdateEvent, NodeUpdateEvent, EdgeUpdateEvent } from '@kgs/shared';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Register event listeners
    this.socket.on('graph:update', (event: GraphUpdateEvent) => {
      this.emit('graph:update', event);
    });

    this.socket.on('node:add', (event: NodeUpdateEvent) => {
      this.emit('node:add', event);
    });

    this.socket.on('node:update', (event: NodeUpdateEvent) => {
      this.emit('node:update', event);
    });

    this.socket.on('node:delete', (event: { graph_id: number; node_id: string }) => {
      this.emit('node:delete', event);
    });

    this.socket.on('edge:add', (event: EdgeUpdateEvent) => {
      this.emit('edge:add', event);
    });

    this.socket.on('edge:delete', (event: { graph_id: number; edge_id: string }) => {
      this.emit('edge:delete', event);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return cleanup function
    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }
}

export const websocket = new WebSocketService();
