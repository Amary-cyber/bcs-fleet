import React, { createContext, useContext, useState } from 'react';
import { Alert } from '../types';

interface ToastNotification {
  id: string;
  alert: Alert;
}

interface NotificationContextType {
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isDrawerOpen, setDrawerOpen] = useState<boolean>(false);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        dismissToast,
        isDrawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
