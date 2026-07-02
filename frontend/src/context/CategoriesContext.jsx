import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCategories } from "../services/api";
import { useAppRefresh } from "./AppRefreshContext";

const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const { refreshKeys } = useAppRefresh();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories, refreshKeys.categories]);

  return (
    <CategoriesContext.Provider value={{ categories, loading, refreshCategories }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within CategoriesProvider");
  }
  return context;
}
