import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000"
});

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

export const deleteTransaction = (id) =>
  API.delete(`/transactions/${id}`);
export default API;