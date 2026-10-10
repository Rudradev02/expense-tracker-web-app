import axios from "axios";

// Default to deployed Render backend in production if VITE_API_URL wasn't provided at build time
const defaultProdBackendUrl = "https://expense-tracker-web-app-1zou.onrender.com";
const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (!isLocalhost && typeof window !== "undefined" ? defaultProdBackendUrl : "")
).replace(/\/+$/, "");

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 90000, // 90s to comfortably tolerate Render free-tier cold starts
});

// Attach access token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (!req.headers) {
    req.headers = {};
  }

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// Handle responses and automatic token refresh on 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";

    const isAuthRoute =
      originalRequest?.url?.includes("/login") ||
      originalRequest?.url?.includes("/register") ||
      originalRequest?.url?.includes("/refresh");

    // Attempt refresh if 401 and request has not already been retried
    if (status === 401 && !isAuthRoute && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshUrl = API_BASE_URL ? `${API_BASE_URL}/refresh` : "/refresh";
        const refreshResponse = await axios.post(refreshUrl, {}, { withCredentials: true });
        const newToken = refreshResponse.data?.token;

        if (newToken) {
          localStorage.setItem("token", newToken);
          if (refreshResponse.data?.username) {
            localStorage.setItem("username", refreshResponse.data.username);
          }
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return API(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        delete API.defaults.headers.common["Authorization"];
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && isAuthRoute) {
      return Promise.reject({ ...error, message, status });
    }

    return Promise.reject({ ...error, message, status });
  }
);

export const loginUser = async (email, password) => {
  const response = await API.post("/login", { email, password });
  const token = response.data.token;
  localStorage.setItem("token", token);
  if (response.data.username) {
    localStorage.setItem("username", response.data.username);
  }
  API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  return response;
};

export const registerUser = async (username, email, password) => {
  const response = await API.post("/register", { username, email, password });
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    if (response.data.username) {
      localStorage.setItem("username", response.data.username);
    }
    API.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
  }
  return response;
};

export const logoutUser = async () => {
  try {
    await API.post("/logout");
  } catch (err) {
    console.warn("Logout error:", err);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    delete API.defaults.headers.common["Authorization"];
  }
};

export const getCurrentUser = () => API.get("/me");

export const getSummary = (params = {}) => API.get("/summary", { params });


export const getTransactions = (paramsOrTitle = "", category = "") => {
  if (typeof paramsOrTitle === "object" && paramsOrTitle !== null) {
    return API.get("/transactions", { params: paramsOrTitle });
  }
  const params = {};
  if (paramsOrTitle) params.title = paramsOrTitle;
  if (category) params.category = category;
  return API.get("/transactions", { params });
};

export const exportTransactions = (params) =>
  API.get("/transactions/export", {
    params,
    responseType: "blob",
  });

export const addTransaction = (transaction) =>

  API.post("/transactions", transaction);

export const updateTransaction = (id, transaction) =>
  API.put(`/transactions/${id}`, transaction);

export const deleteTransaction = (id) =>
  API.delete(`/transactions/${id}`);

export const getCategories = () => API.get("/categories");

export const addCategory = (name) =>
  API.post("/categories", { name });

export const deleteCategory = (id) =>
  API.delete(`/categories/${id}`);

export const getBudgets = () => API.get("/budgets");

export const createBudget = (category, monthly_limit) =>
  API.post("/budgets", { category, monthly_limit });

export const updateBudget = (id, data) =>
  API.put(`/budgets/${id}`, data);

export const deleteBudget = (id) =>
  API.delete(`/budgets/${id}`);

export const getBudgetStatus = () => API.get("/budgets/status");

export const getRecurringRules = () => API.get("/recurring-rules");

export const createRecurringRule = (ruleData) =>
  API.post("/recurring-rules", ruleData);

export const updateRecurringRule = (id, ruleData) =>
  API.put(`/recurring-rules/${id}`, ruleData);

export const toggleRecurringRule = (id) =>
  API.patch(`/recurring-rules/${id}/toggle`);

export const deleteRecurringRule = (id) =>
  API.delete(`/recurring-rules/${id}`);

export const processRecurringRules = () =>
  API.post("/recurring-rules/process");

export const getInsights = () => API.get("/insights");

export const getForecast = () => API.get("/forecast");

export const suggestCategory = (description) =>
  API.get("/suggest-category", { params: { description } });

export const scanReceipt = (data) => {
  if (data instanceof FormData) {
    return API.post("/scan-receipt", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
  return API.post("/scan-receipt", data);
};

export const parseReceiptText = (text) => API.post("/scan-receipt", { text });

export const getGoals = () => API.get("/goals");
export const createGoal = (goalData) => API.post("/goals", goalData);
export const updateGoal = (id, goalData) => API.put(`/goals/${id}`, goalData);
export const deleteGoal = (id) => API.delete(`/goals/${id}`);
export const contributeToGoal = (id, amount) => API.post(`/goals/${id}/contribute`, { amount });

export const getCurrencies = () => API.get("/currencies");
export const getRates = () => API.get("/rates");
export const setBaseCurrency = (base_currency) => API.put("/currencies/base", { base_currency });
export const updateExchangeRates = (rates) => API.post("/currencies/rates", { rates });
export const refreshExchangeRates = () => API.post("/currencies/refresh");

export const loadSampleData = () => API.post("/transactions/sample-data");

export default API;
