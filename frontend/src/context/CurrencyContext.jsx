import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getCurrencies,
  setBaseCurrency as apiSetBaseCurrency,
  updateExchangeRates as apiUpdateExchangeRates,
  refreshExchangeRates as apiRefreshExchangeRates,
} from "../services/api";

const CurrencyContext = createContext();

export const CURRENCY_DEFINITIONS = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-IE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
];

const DEFAULT_RATES = {
  INR: 1.0,
  USD: 86.5,
  EUR: 93.0,
  GBP: 110.5,
};

const STORAGE_KEY = "expense_tracker_base_currency";

export function CurrencyProvider({ children }) {
  const [baseCurrency, setBaseCurrencyState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "INR";
  });
  const [currencies, setCurrencies] = useState(CURRENCY_DEFINITIONS);
  const [ratesToInr, setRatesToInr] = useState(DEFAULT_RATES);
  const [ratesMetadata, setRatesMetadata] = useState({
    last_updated: null,
    source: "fallback",
    is_cached: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch currency settings and rates from backend
  const fetchCurrencies = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await getCurrencies();
      if (res.data) {
        if (res.data.base_currency) {
          setBaseCurrencyState(res.data.base_currency);
          localStorage.setItem(STORAGE_KEY, res.data.base_currency);
        }
        if (res.data.supported_currencies) {
          setCurrencies(res.data.supported_currencies);
        }
        if (res.data.rates_to_inr) {
          setRatesToInr(res.data.rates_to_inr);
        }
        setRatesMetadata({
          last_updated: res.data.last_updated,
          source: res.data.source || "cached",
          is_cached: Boolean(res.data.is_cached),
        });
      }
    } catch (err) {
      console.warn("Could not load currency settings from server; using cached fallback:", err);
      // Keep cached / default rates
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // Derived rates relative to active base currency
  const ratesToBase = useMemo(() => {
    const baseInr = Number(ratesToInr[baseCurrency]) || 1.0;
    const result = {};
    for (const [code, rate] of Object.entries(ratesToInr)) {
      result[code] = Number((Number(rate) / baseInr).toFixed(4));
    }
    return result;
  }, [ratesToInr, baseCurrency]);

  // Get active currency symbol and details
  const activeCurrencyInfo = useMemo(() => {
    return (
      currencies.find((c) => c.code === baseCurrency) || {
        code: baseCurrency,
        symbol: baseCurrency === "INR" ? "₹" : "$",
        locale: baseCurrency === "INR" ? "en-IN" : "en-US",
      }
    );
  }, [currencies, baseCurrency]);

  /**
   * Format any monetary amount using Intl.NumberFormat according to the currency's locale.
   * - INR uses en-IN (Indian grouping: 1,00,000)
   * - USD uses en-US (100,000)
   * - EUR uses en-IE (100,000)
   * - GBP uses en-GB (100,000)
   */
  const formatCurrency = useCallback(
    (amount, currencyCode = null, options = {}) => {
      const targetCode = (currencyCode || baseCurrency || "INR").toUpperCase();
      const curr = currencies.find((c) => c.code === targetCode) || {
        code: targetCode,
        locale: targetCode === "INR" ? "en-IN" : "en-US",
      };

      const num = Number(amount) || 0;
      const {
        maximumFractionDigits = 0,
        minimumFractionDigits = 0,
        showSymbol = true,
      } = options;

      if (!showSymbol) {
        return new Intl.NumberFormat(curr.locale, {
          maximumFractionDigits,
          minimumFractionDigits,
        }).format(num);
      }

      return new Intl.NumberFormat(curr.locale, {
        style: "currency",
        currency: targetCode,
        maximumFractionDigits,
        minimumFractionDigits,
      }).format(num);
    },
    [baseCurrency, currencies]
  );

  // Convert amount between any pair of currencies
  const convertAmount = useCallback(
    (amount, fromCode, toCode) => {
      const from = (fromCode || baseCurrency || "INR").toUpperCase();
      const to = (toCode || baseCurrency || "INR").toUpperCase();
      const num = Number(amount) || 0;

      if (from === to) return num;

      const rateFromInr = Number(ratesToInr[from]) || 1.0;
      const rateToInr = Number(ratesToInr[to]) || 1.0;

      const rate = rateFromInr / rateToInr;
      return Number((num * rate).toFixed(2));
    },
    [baseCurrency, ratesToInr]
  );

  // Get exchange rate between two currencies
  const getExchangeRate = useCallback(
    (fromCode, toCode) => {
      const from = (fromCode || baseCurrency || "INR").toUpperCase();
      const to = (toCode || baseCurrency || "INR").toUpperCase();
      if (from === to) return 1.0;

      const rateFromInr = Number(ratesToInr[from]) || 1.0;
      const rateToInr = Number(ratesToInr[to]) || 1.0;
      return Number((rateFromInr / rateToInr).toFixed(4));
    },
    [baseCurrency, ratesToInr]
  );

  // Change user base currency
  const changeBaseCurrency = async (newCode) => {
    const code = String(newCode).toUpperCase().trim();
    setBaseCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);

    try {
      await apiSetBaseCurrency(code);
    } catch (err) {
      console.warn("Failed to update base currency on server:", err);
    }
  };

  // Update exchange rates manually
  const updateCustomRates = async (newRates) => {
    try {
      setLoading(true);
      const res = await apiUpdateExchangeRates(newRates);
      if (res.data?.rates_to_inr) {
        setRatesToInr(res.data.rates_to_inr);
      }
      setRatesMetadata({
        last_updated: res.data?.last_updated || new Date().toISOString(),
        source: "manual",
        is_cached: true,
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to update exchange rates:", err);
      return {
        success: false,
        error: err.response?.data?.error || "Failed to update rates",
      };
    } finally {
      setLoading(false);
    }
  };

  // Refresh exchange rates from external API
  const refreshRates = async () => {
    try {
      setLoading(true);
      const res = await apiRefreshExchangeRates();
      if (res.data?.rates_to_inr) {
        setRatesToInr(res.data.rates_to_inr);
      }
      setRatesMetadata({
        last_updated: res.data?.last_updated || new Date().toISOString(),
        source: res.data?.source || "api",
        is_cached: false,
      });
      return { success: true };
    } catch (err) {
      console.error("Failed to refresh exchange rates:", err);
      return {
        success: false,
        error: err.response?.data?.error || "Failed to refresh rates",
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    baseCurrency,
    currencies,
    ratesToInr,
    ratesToBase,
    ratesMetadata,
    activeCurrencyInfo,
    loading,
    error,
    formatCurrency,
    convertAmount,
    getExchangeRate,
    changeBaseCurrency,
    updateCustomRates,
    refreshRates,
    reloadCurrencies: fetchCurrencies,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export default CurrencyContext;
