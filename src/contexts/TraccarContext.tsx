import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { traccarApi } from '../services/traccar/traccarApi';
import { traccarWs, WebSocketStatus } from '../services/traccar/traccarWebSocket';

interface TraccarContextType {
  traccarConnected: boolean;
  wsStatus: WebSocketStatus;
  checkTraccarHealth: () => Promise<boolean>;
  reconnect: () => void;
}

const TraccarContext = createContext<TraccarContextType | undefined>(undefined);

export const TraccarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [traccarConnected, setTraccarConnected] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('DISCONNECTED');

  const checkTraccarHealth = useCallback(async (): Promise<boolean> => {
    const isOnline = await traccarApi.checkConnection();
    setTraccarConnected(isOnline);
    return isOnline;
  }, []);

  const reconnect = useCallback(() => {
    traccarWs.disconnect();
    checkTraccarHealth().then((online) => {
      if (online) {
        traccarWs.connect();
      }
    });
  }, [checkTraccarHealth]);

  useEffect(() => {
    // Initial health check and WebSocket connection on mount
    checkTraccarHealth().then((online) => {
      if (online) {
        traccarWs.connect();
      }
    });

    // Periodic health check every 30 seconds
    const interval = setInterval(() => {
      checkTraccarHealth();
    }, 30000);

    const unsubscribeWs = traccarWs.subscribeStatus((status) => {
      setWsStatus(status);
    });

    return () => {
      clearInterval(interval);
      unsubscribeWs();
      traccarWs.disconnect();
    };
  }, [checkTraccarHealth]);

  return (
    <TraccarContext.Provider
      value={{
        traccarConnected,
        wsStatus,
        checkTraccarHealth,
        reconnect,
      }}
    >
      {children}
    </TraccarContext.Provider>
  );
};

export const useTraccar = () => {
  const context = useContext(TraccarContext);
  if (!context) {
    throw new Error('useTraccar must be used within a TraccarProvider');
  }
  return context;
};
