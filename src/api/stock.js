import API from "./axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchStockConfig = () =>
  API.get("/api/stock/config", {
    headers: getAuthHeaders(),
  });

export const fetchStockDashboard = () =>
  API.get("/api/stock/dashboard", {
    headers: getAuthHeaders(),
  });

export const fetchStockEntries = (params = {}) =>
  API.get("/api/stock/entries", {
    headers: getAuthHeaders(),
    params,
  });

export const fetchStockEntryById = (id) =>
  API.get(`/api/stock/entries/${id}`, {
    headers: getAuthHeaders(),
  });

export const createStockEntry = (payload) =>
  API.post("/api/stock/entries", payload, {
    headers: getAuthHeaders(),
  });

export const fetchStockIssues = (params = {}) =>
  API.get("/api/stock/issues", {
    headers: getAuthHeaders(),
    params,
  });

export const createStockIssue = (payload) =>
  API.post("/api/stock/issues", payload, {
    headers: getAuthHeaders(),
  });

export const fetchStockAuditLogs = (params = {}) =>
  API.get("/api/stock/audit-logs", {
    headers: getAuthHeaders(),
    params,
  });
