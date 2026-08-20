import React, { createContext, useContext, useState, useEffect } from 'react';
import { traccarApi } from '../services/traccar/traccarApi';
import { traccarWs, WebSocketStatus } from '../services/traccar/traccarWebSocket';
import { demoSimulator } from '../services/demo/demoSimulator';

interface TraccarContextType {
  isDemoMode: boolean;
  toggleDemoMode: (enableDemo: boolean) => void;
  traccarConnected: boolean;
  wsStatus: WebSocketStatus;
  checkTraccarHealth: () => Promise<boolean>;
}

const TraccarContext = createContext<TraccarContextType | undefined>(undefined);

export const TraccarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [traccarConnected, setTraccarConnected] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('DISCONNECTED');

  useEffect(() => {
    // Attempt health check on Traccar production endpoint
    checkTraccarHealth().then((online) => {
      if (online) {
        setIsDemoMode(false);
        demoSimulator.stop();
        traccarWs.connect();
      } else {
        setIsDemoMode(true);
        demoSimulator.start();
      }
    });

    const unsubscribeWs = traccarWs.subscribeStatus((status) => {
      setWsStatus(status);
    });

    return () => {
      unsubscribeWs();
      demoSimulator.stop();
      traccarWs.disconnect();
    };
  }, []);

  const checkTraccarHealth = async (): Promise<boolean> => {
    const isOnline = await traccarApi.checkConnection();
    setTraccarConnected(isOnline);
    return isOnline;
  };

  const toggleDemoMode = (enableDemo: boolean) => {
    setIsDemoMode(enableDemo);
    if (enableDemo) {
      traccarWs.disconnect();
      demoSimulator.start();
    } else {
      demoSimulator.stop();
      traccarWs.connect();
      checkTraccarHealth();
    }
  };

  return (
    <TraccarContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        traccarConnected,
        wsStatus,
        checkTraccarHealth,
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
