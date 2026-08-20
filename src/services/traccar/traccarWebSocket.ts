import { TraccarPosition, TraccarDevice } from '../../types';

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface WebSocketMessageData {
  devices?: TraccarDevice[];
  positions?: TraccarPosition[];
}

export class TraccarWebSocket {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Set<(data: WebSocketMessageData) => void> = new Set();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect() {
    const rawUrl = import.meta.env.VITE_TRACCAR_URL || 'https://bcsfleet.bcs-groupe.tech';
    const wsUrl = rawUrl.replace(/^http/, 'ws') + '/api/socket';

    this.setStatus('CONNECTING');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessageData = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (e) {
          console.error('Failed to parse Traccar WS message', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Traccar WS Error:', error);
        this.setStatus('ERROR');
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to create Traccar WS connection', err);
      this.setStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  subscribe(listener: (data: WebSocketMessageData) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: (status: WebSocketStatus) => void) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  getStatus() {
    return this.status;
  }
}

export const traccarWs = new TraccarWebSocket();
