import { createContext, useCallback, useContext, useState } from "react";

/**
 * AppRefreshContext
 * --------------------------------------------------
 * Provides targeted refresh functionality for different
 * data types. Components can trigger specific refreshes
 * (transactions, categories, dashboard) and other components
 * can listen only to the refreshes they care about.
 */
const AppRefreshContext = createContext(null);

export function AppRefreshProvider({ children }) {
  const [refreshKeys, setRefreshKeys] = useState({
    transactions: 0,
    categories: 0,
    dashboard: 0,
  });

  const triggerRefresh = useCallback((type = 'all') => {
    setRefreshKeys((prev) => {
      if (type === 'all') {
        return {
          transactions: prev.transactions + 1,
          categories: prev.categories + 1,
          dashboard: prev.dashboard + 1,
        };
      }
      return {
        ...prev,
        [type]: prev[type] + 1,
      };
    });
  }, []);

  return (
    <AppRefreshContext.Provider value={{ refreshKeys, triggerRefresh }}>
      {children}
    </AppRefreshContext.Provider>
  );
}

export function useAppRefresh() {
  const ctx = useContext(AppRefreshContext);
  if (!ctx) throw new Error("useAppRefresh must be used within AppRefreshProvider");
  return ctx;
}
