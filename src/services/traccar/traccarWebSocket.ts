import { TraccarPosition, TraccarDevice } from '../../types';

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export interface WebSocketMessageData {
  devices?: TraccarDevice[];
  positions?: TraccarPosition[];
  events?: any[];
}

export class TraccarWebSocket {
  private ws: WebSocket | null = null;
  private status: WebSocketStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private readonly maxReconnectDelayMs = 30000;
  private listeners: Set<(data: WebSocketMessageData) => void> = new Set();
  private statusListeners: Set<(status: WebSocketStatus) => void> = new Set();
  private reconnectCallbacks: Set<() => void> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isExplicitDisconnect = false;

  connect() {
    this.isExplicitDisconnect = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const rawUrl = import.meta.env.VITE_TRACCAR_URL || 'https://bcsfleet.bcs-groupe.tech';
    const wsUrl = rawUrl.replace(/^http/, 'ws') + '/api/socket';

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('CONNECTED');
        const wasReconnecting = this.reconnectAttempts > 0;
        this.reconnectAttempts = 0;

        if (wasReconnecting) {
          this.reconnectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (err) {
              console.warn('Reconnect callback note:', err);
            }
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessageData = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('Traccar WS Listener error:', err);
            }
          });
        } catch (e) {
          console.error('Failed to parse Traccar WS message payload:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('Traccar WS Network Warning/Error:', error);
        this.setStatus('ERROR');
      };

      this.ws.onclose = () => {
        if (!this.isExplicitDisconnect) {
          this.setStatus('DISCONNECTED');
          this.scheduleReconnect();
        } else {
          this.setStatus('DISCONNECTED');
        }
      };
    } catch (err) {
      console.warn('Failed to initiate Traccar WS connection:', err);
      this.setStatus('ERROR');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isExplicitDisconnect) return;

    this.setStatus('RECONNECTING');
    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelayMs);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
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

  onReconnect(callback: () => void) {
    this.reconnectCallbacks.add(callback);
    return () => {
      this.reconnectCallbacks.delete(callback);
    };
  }

  private setStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Status listener error:', err);
      }
    });
  }

  getStatus(): WebSocketStatus {
    return this.status;
  }
}

export const traccarWs = new TraccarWebSocket();
