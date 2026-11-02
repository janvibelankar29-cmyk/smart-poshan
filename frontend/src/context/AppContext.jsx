import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../utils/translations';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user,     setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('poshan_user')) || null; } catch { return null; }
  });
  const [language, setLanguage] = useState(() => localStorage.getItem('poshan_lang') || 'en');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('poshan_offline_queue')) || []; } catch { return []; }
  });

  const t = translations[language] || translations.en;

  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  useEffect(() => {
    localStorage.setItem('poshan_lang', language);
  }, [language]);

  const login = (userData, token) => {
    localStorage.setItem('poshan_token', token);
    localStorage.setItem('poshan_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('poshan_token');
    localStorage.removeItem('poshan_user');
    setUser(null);
  };

  const addToOfflineQueue = (record) => {
    const updated = [...offlineQueue, { ...record, offlineId: Date.now() }];
    setOfflineQueue(updated);
    localStorage.setItem('poshan_offline_queue', JSON.stringify(updated));
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('poshan_offline_queue');
  };

  return (
    <AppContext.Provider value={{
      user, login, logout,
      language, setLanguage, t,
      isOnline,
      offlineQueue, addToOfflineQueue, clearOfflineQueue
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
