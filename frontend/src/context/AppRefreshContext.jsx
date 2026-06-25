import { createContext, useCallback, useContext, useState } from "react";

/**
 * AppRefreshContext
 * --------------------------------------------------
 * Provides a single `triggerRefresh` function and a
 * `refreshKey` counter.  Any component that mutates
 * data (add / edit / delete transaction, add/delete
 * category) calls `triggerRefresh()`.  Components
 * that display data (Dashboard, Transactions) include
 * `refreshKey` in their useEffect dependency array so
 * they automatically re-fetch whenever it changes.
 */
const AppRefreshContext = createContext(null);

export function AppRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <AppRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </AppRefreshContext.Provider>
  );
}

export function useAppRefresh() {
  const ctx = useContext(AppRefreshContext);
  if (!ctx) throw new Error("useAppRefresh must be used within AppRefreshProvider");
  return ctx;
}
