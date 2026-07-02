import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

// Attach token automatically
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

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";

    if (status === 401) {
      localStorage.removeItem("token");
      delete API.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }

    return Promise.reject({ ...error, message, status });
  }
);

export const loginUser = async (email, password) => {
  const response = await API.post('/login', { email, password });
  const token = response.data.token;
  localStorage.setItem('token', token);
  // Set default Authorization header for subsequent requests
  API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return response;
};

export const registerUser = async (username, email, password) => {
  const response = await API.post('/register', { username, email, password });
  return response;
};

export const getSummary = () => API.get("/summary");


export const getTransactions = (title = "", category = "") =>
  API.get("/transactions", {
    params: {
      title,
      category,
    },
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

export default API;